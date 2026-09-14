import { Injectable } from '@nestjs/common';
import { RESERVABLE_STATUSES, type SharedWishBoard, type WishItemDto } from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { generateToken, hashToken } from '../../common/crypto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { WishItem } from '../../generated/prisma/client.js';
import { WishBoardService } from './wish-board.service.js';
import { itemInclude, toItemDto, type Viewer } from './wish-item.mapper.js';

type Reserver = { userId: string } | { guestName: string; guestTokenHash: string };

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly board: WishBoardService,
  ) {}

  // ── Учасники простору ───────────────────────────────────────────────────────

  async reserveInSpace(spaceId: string, itemId: string, userId: string): Promise<WishItemDto> {
    const item = await this.board.findItemOrThrow(spaceId, itemId);
    this.assertReservable(item, userId);
    await this.create(itemId, { userId });
    return this.reload(itemId, { kind: 'member', userId });
  }

  async cancelInSpace(spaceId: string, itemId: string, userId: string): Promise<WishItemDto> {
    await this.board.findItemOrThrow(spaceId, itemId);
    const { count } = await this.prisma.wishReservation.deleteMany({ where: { itemId, userId } });
    if (count === 0) throw AppException.notFound('WISHLIST_RESERVATION_NOT_FOUND');
    return this.reload(itemId, { kind: 'member', userId });
  }

  // ── Особисте публічне посилання ─────────────────────────────────────────────

  async getShared(
    token: string,
    userId: string | null,
    guestToken: string | null,
  ): Promise<SharedWishBoard> {
    const link = await this.findLinkOrThrow(token);
    const items = await this.prisma.wishItem.findMany({
      where: this.sharedItemsWhere(link),
      include: itemInclude,
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });

    const viewer: Viewer = { kind: 'public', userId, guestTokenHash: this.hashOrNull(guestToken) };
    return {
      ownerName: link.user.name,
      viewer: userId === link.userId ? 'OWNER' : userId ? 'USER' : 'GUEST',
      items: items.map((item) => toItemDto(item, viewer)),
    };
  }

  /** Залогінений резервує від свого імені, гість — з імʼям і cookie. */
  async reserveShared(
    token: string,
    itemId: string,
    userId: string | null,
    guestToken: string | null,
    guestName: string | undefined,
  ): Promise<{ item: WishItemDto; issuedGuestToken: string | null }> {
    const item = await this.findSharedItemOrThrow(token, itemId);

    if (userId) {
      this.assertReservable(item, userId);
      await this.create(itemId, { userId });
      const viewer: Viewer = {
        kind: 'public',
        userId,
        guestTokenHash: this.hashOrNull(guestToken),
      };
      return { item: await this.reload(itemId, viewer), issuedGuestToken: null };
    }

    if (!guestName) throw AppException.badRequest('WISHLIST_GUEST_NAME_REQUIRED');

    const effectiveToken = guestToken ?? generateToken();
    const guestTokenHash = hashToken(effectiveToken);
    await this.create(itemId, { guestName, guestTokenHash });

    return {
      item: await this.reload(itemId, { kind: 'public', userId: null, guestTokenHash }),
      issuedGuestToken: guestToken ? null : effectiveToken,
    };
  }

  async cancelShared(
    token: string,
    itemId: string,
    userId: string | null,
    guestToken: string | null,
  ): Promise<WishItemDto> {
    await this.findSharedItemOrThrow(token, itemId);
    const guestTokenHash = this.hashOrNull(guestToken);

    // Скасувати можна лише своє: без жодного ідентифікатора OR був би порожнім.
    const owners = [
      ...(userId ? [{ userId }] : []),
      ...(guestTokenHash ? [{ guestTokenHash }] : []),
    ];
    if (owners.length === 0) throw AppException.notFound('WISHLIST_RESERVATION_NOT_FOUND');

    const { count } = await this.prisma.wishReservation.deleteMany({
      where: { itemId, OR: owners },
    });
    if (count === 0) throw AppException.notFound('WISHLIST_RESERVATION_NOT_FOUND');

    return this.reload(itemId, { kind: 'public', userId, guestTokenHash });
  }

  // ── Спільне ─────────────────────────────────────────────────────────────────

  private assertReservable(item: WishItem, userId: string) {
    if (item.ownerId === userId) throw AppException.forbidden('WISHLIST_OWNER_CANNOT_RESERVE');
    if (!RESERVABLE_STATUSES.includes(item.status)) {
      throw AppException.conflict('WISHLIST_ITEM_NOT_RESERVABLE');
    }
  }

  /** skipDuplicates + унікальний itemId: з двох одночасних кліків виграє рівно один. */
  private async create(itemId: string, reserver: Reserver) {
    const { count } = await this.prisma.wishReservation.createMany({
      data: [{ itemId, ...reserver }],
      skipDuplicates: true,
    });
    if (count === 0) throw AppException.conflict('WISHLIST_ALREADY_RESERVED');
  }

  private async findLinkOrThrow(token: string) {
    const link = await this.prisma.wishShareLink.findUnique({
      where: { token },
      include: { user: { select: { name: true } } },
    });
    if (!link) throw AppException.notFound('WISHLIST_NOT_FOUND');
    return link;
  }

  /** За посиланням видно лише бажання цієї людини з колонок, які можна резервувати. */
  private sharedItemsWhere(link: { spaceId: string; userId: string }) {
    return {
      spaceId: link.spaceId,
      ownerId: link.userId,
      status: { in: [...RESERVABLE_STATUSES] },
    };
  }

  private async findSharedItemOrThrow(token: string, itemId: string) {
    const link = await this.findLinkOrThrow(token);
    const item = await this.prisma.wishItem.findFirst({
      where: { id: itemId, ...this.sharedItemsWhere(link) },
    });
    if (!item) throw AppException.notFound('WISHLIST_ITEM_NOT_FOUND');
    return item;
  }

  private async reload(itemId: string, viewer: Viewer) {
    const item = await this.prisma.wishItem.findUniqueOrThrow({
      where: { id: itemId },
      include: itemInclude,
    });
    return toItemDto(item, viewer);
  }

  private hashOrNull(token: string | null) {
    return token ? hashToken(token) : null;
  }
}
