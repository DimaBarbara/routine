import { Injectable } from '@nestjs/common';
import type { SharedWishlist, WishlistItemDto } from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { generateToken, hashToken } from '../../common/crypto.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  itemInclude,
  itemOrder,
  toItemDto,
  type Viewer,
  viewerInSpace,
  viewerOnSharedPage,
} from './wishlist.mapper.js';
import { WishlistsService } from './wishlists.service.js';

type Reserver = { userId: string } | { guestName: string; guestTokenHash: string };

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wishlists: WishlistsService,
  ) {}

  // ── Учасники простору ───────────────────────────────────────────────────────

  async reserveInSpace(spaceId: string, wishlistId: string, itemId: string, userId: string) {
    const item = await this.wishlists.findItemOrThrow(spaceId, wishlistId, itemId);
    if (item.wishlist.ownerId === userId) {
      throw AppException.forbidden('WISHLIST_OWNER_CANNOT_RESERVE');
    }
    await this.create(itemId, { userId });
    return this.reload(itemId, viewerInSpace(item.wishlist.ownerId, userId));
  }

  async cancelInSpace(spaceId: string, wishlistId: string, itemId: string, userId: string) {
    const item = await this.wishlists.findItemOrThrow(spaceId, wishlistId, itemId);
    const { count } = await this.prisma.wishReservation.deleteMany({ where: { itemId, userId } });
    if (count === 0) throw AppException.notFound('WISHLIST_RESERVATION_NOT_FOUND');
    return this.reload(itemId, viewerInSpace(item.wishlist.ownerId, userId));
  }

  // ── Публічне посилання ──────────────────────────────────────────────────────

  async getShared(
    token: string,
    userId: string | null,
    guestToken: string | null,
  ): Promise<SharedWishlist> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { shareToken: token },
      include: {
        owner: { select: { name: true } },
        items: { include: itemInclude, orderBy: itemOrder },
      },
    });
    if (!wishlist) throw AppException.notFound('WISHLIST_NOT_FOUND');

    const viewer = viewerOnSharedPage(wishlist.ownerId, userId, this.hashOrNull(guestToken));
    return {
      title: wishlist.title,
      description: wishlist.description,
      ownerName: wishlist.owner.name,
      viewer: viewer.kind === 'owner' ? 'OWNER' : userId ? 'USER' : 'GUEST',
      items: wishlist.items.map((item) => toItemDto(item, viewer)),
    };
  }

  /**
   * Залогінений резервує від свого імені, гість — з імʼям і cookie.
   * Повертає новий гостьовий токен, якщо його довелося видати.
   */
  async reserveShared(
    token: string,
    itemId: string,
    userId: string | null,
    guestToken: string | null,
    guestName: string | undefined,
  ): Promise<{ item: WishlistItemDto; issuedGuestToken: string | null }> {
    const { ownerId } = await this.findSharedItemOrThrow(token, itemId);

    if (userId) {
      if (userId === ownerId) throw AppException.forbidden('WISHLIST_OWNER_CANNOT_RESERVE');
      await this.create(itemId, { userId });
      const viewer = viewerOnSharedPage(ownerId, userId, this.hashOrNull(guestToken));
      return { item: await this.reload(itemId, viewer), issuedGuestToken: null };
    }

    if (!guestName) throw AppException.badRequest('WISHLIST_GUEST_NAME_REQUIRED');

    const effectiveToken = guestToken ?? generateToken();
    const issuedGuestToken = guestToken ? null : effectiveToken;
    const guestTokenHash = hashToken(effectiveToken);
    await this.create(itemId, { guestName, guestTokenHash });

    const viewer = viewerOnSharedPage(ownerId, null, guestTokenHash);
    return { item: await this.reload(itemId, viewer), issuedGuestToken };
  }

  async cancelShared(
    token: string,
    itemId: string,
    userId: string | null,
    guestToken: string | null,
  ): Promise<WishlistItemDto> {
    const { ownerId } = await this.findSharedItemOrThrow(token, itemId);
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

    return this.reload(itemId, viewerOnSharedPage(ownerId, userId, guestTokenHash));
  }

  // ── Спільне ─────────────────────────────────────────────────────────────────

  /** skipDuplicates + унікальний itemId: з двох одночасних кліків виграє рівно один. */
  private async create(itemId: string, reserver: Reserver) {
    const { count } = await this.prisma.wishReservation.createMany({
      data: [{ itemId, ...reserver }],
      skipDuplicates: true,
    });
    if (count === 0) throw AppException.conflict('WISHLIST_ALREADY_RESERVED');
  }

  private async findSharedItemOrThrow(token: string, itemId: string) {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, wishlist: { shareToken: token } },
      include: { wishlist: { select: { ownerId: true } } },
    });
    if (!item) {
      const wishlistExists = await this.prisma.wishlist.count({ where: { shareToken: token } });
      throw AppException.notFound(
        wishlistExists ? 'WISHLIST_ITEM_NOT_FOUND' : 'WISHLIST_NOT_FOUND',
      );
    }
    return { ownerId: item.wishlist.ownerId };
  }

  private async reload(itemId: string, viewer: Viewer) {
    const item = await this.prisma.wishlistItem.findUniqueOrThrow({
      where: { id: itemId },
      include: itemInclude,
    });
    return toItemDto(item, viewer);
  }

  private hashOrNull(token: string | null) {
    return token ? hashToken(token) : null;
  }
}
