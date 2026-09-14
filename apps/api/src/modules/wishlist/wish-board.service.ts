import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  WishBoard,
  WishItemDto,
  WishItemInput,
  WishItemUpdate,
  WishMoveInput,
  WishShareLinkDto,
  WishStatus,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { generateToken } from '../../common/crypto.js';
import { personSelect, toPerson } from '../../common/person.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma, WishDoneKind, WishItem } from '../../generated/prisma/client.js';
import { itemInclude, toItemDto } from './wish-item.mapper.js';

const POSITION_STEP = 1000;
/** Менше за цей проміжок між сусідами — перенумеровуємо колонку, щоб не впертися в точність float. */
const MIN_POSITION_GAP = 1e-6;

type Tx = Prisma.TransactionClient;

/**
 * Дошка простору. Кожен запит фільтрується і за id, і за spaceId: SpaceMemberGuard перевіряє лише
 * членство в просторі з URL, тож чужий itemId у своєму просторі має дати 404.
 */
@Injectable()
export class WishBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getBoard(spaceId: string, userId: string): Promise<WishBoard> {
    const [items, memberships, link] = await Promise.all([
      this.prisma.wishItem.findMany({
        where: { spaceId },
        include: itemInclude,
        orderBy: { position: 'asc' },
      }),
      this.prisma.membership.findMany({
        where: { spaceId },
        include: { user: personSelect },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.wishShareLink.findUnique({ where: { spaceId_userId: { spaceId, userId } } }),
    ]);

    return {
      items: items.map((item) => toItemDto(item, { kind: 'member', userId })),
      members: memberships.map((membership) => toPerson(membership.user)),
      shareUrl: this.shareUrl(link?.token ?? null),
    };
  }

  async create(spaceId: string, userId: string, input: WishItemInput): Promise<WishItemDto> {
    const ownerId = input.ownerId === undefined ? userId : input.ownerId;
    await this.assertOwnerIsMember(spaceId, ownerId);

    const item = await this.prisma.$transaction(async (tx) =>
      tx.wishItem.create({
        data: {
          ...input,
          ...doneFields(input.status, input.doneKind ?? null, null),
          spaceId,
          ownerId,
          createdById: userId,
          position: await this.topPosition(tx, spaceId, input.status),
        },
        include: itemInclude,
      }),
    );
    return toItemDto(item, { kind: 'member', userId });
  }

  async update(
    spaceId: string,
    itemId: string,
    userId: string,
    input: WishItemUpdate,
  ): Promise<WishItemDto> {
    const current = await this.findItemOrThrow(spaceId, itemId);
    if (input.ownerId !== undefined) await this.assertOwnerIsMember(spaceId, input.ownerId);

    const status = input.status ?? current.status;
    const statusChanged = status !== current.status;

    const item = await this.prisma.$transaction(async (tx) =>
      tx.wishItem.update({
        where: { id: itemId },
        data: {
          ...input,
          ...doneFields(status, input.doneKind ?? current.doneKind, current),
          // Змінили колонку у формі — картка стає першою в новій колонці.
          ...(statusChanged ? { position: await this.topPosition(tx, spaceId, status) } : {}),
        },
        include: itemInclude,
      }),
    );
    return toItemDto(item, { kind: 'member', userId });
  }

  async move(
    spaceId: string,
    itemId: string,
    userId: string,
    { status, afterId, doneKind }: WishMoveInput,
  ): Promise<WishItemDto> {
    const current = await this.findItemOrThrow(spaceId, itemId);

    const item = await this.prisma.$transaction(async (tx) => {
      const column = await tx.wishItem.findMany({
        where: { spaceId, status, NOT: { id: itemId } },
        select: { id: true, position: true },
        orderBy: { position: 'asc' },
      });

      let index = 0;
      if (afterId !== null) {
        const afterIndex = column.findIndex((neighbour) => neighbour.id === afterId);
        if (afterIndex === -1) throw AppException.notFound('WISHLIST_ITEM_NOT_FOUND');
        index = afterIndex + 1;
      }

      const prev = column[index - 1]?.position;
      const next = column[index]?.position;
      let position: number;

      if (prev === undefined && next === undefined) position = POSITION_STEP;
      else if (prev === undefined) position = next! - POSITION_STEP;
      else if (next === undefined) position = prev + POSITION_STEP;
      else if (next - prev > MIN_POSITION_GAP) position = (prev + next) / 2;
      else {
        const ordered = [...column.slice(0, index), { id: itemId }, ...column.slice(index)];
        for (const [i, neighbour] of ordered.entries()) {
          if (neighbour.id === itemId) continue;
          await tx.wishItem.update({
            where: { id: neighbour.id },
            data: { position: (i + 1) * POSITION_STEP },
          });
        }
        position = (index + 1) * POSITION_STEP;
      }

      return tx.wishItem.update({
        where: { id: itemId },
        data: { status, position, ...doneFields(status, doneKind ?? current.doneKind, current) },
        include: itemInclude,
      });
    });

    return toItemDto(item, { kind: 'member', userId });
  }

  async remove(spaceId: string, itemId: string): Promise<void> {
    const { count } = await this.prisma.wishItem.deleteMany({ where: { id: itemId, spaceId } });
    if (count === 0) throw AppException.notFound('WISHLIST_ITEM_NOT_FOUND');
  }

  /** Створює або перевипускає особисте посилання — старе одразу перестає працювати. */
  async enableShare(spaceId: string, userId: string): Promise<WishShareLinkDto> {
    const token = generateToken();
    await this.prisma.wishShareLink.upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId, token },
      update: { token },
    });
    return { shareUrl: this.shareUrl(token) };
  }

  async disableShare(spaceId: string, userId: string): Promise<WishShareLinkDto> {
    await this.prisma.wishShareLink.deleteMany({ where: { spaceId, userId } });
    return { shareUrl: null };
  }

  async findItemOrThrow(spaceId: string, itemId: string): Promise<WishItem> {
    const item = await this.prisma.wishItem.findFirst({ where: { id: itemId, spaceId } });
    if (!item) throw AppException.notFound('WISHLIST_ITEM_NOT_FOUND');
    return item;
  }

  private async assertOwnerIsMember(spaceId: string, ownerId: string | null) {
    if (ownerId === null) return;
    const membership = await this.prisma.membership.findUnique({
      where: { userId_spaceId: { userId: ownerId, spaceId } },
    });
    if (!membership) throw AppException.badRequest('WISHLIST_INVALID_OWNER');
  }

  /** Нові картки — нагору колонки. */
  private async topPosition(tx: Tx, spaceId: string, status: WishStatus): Promise<number> {
    const first = await tx.wishItem.findFirst({
      where: { spaceId, status },
      orderBy: { position: 'asc' },
      select: { position: true },
    });
    return first ? first.position - POSITION_STEP : POSITION_STEP;
  }

  private shareUrl(token: string | null): string | null {
    return token ? `${this.config.get('WEB_URL', { infer: true })}/w/${token}` : null;
  }
}

/** «Виконано» — з позначкою «куплено/подаровано» і датою; інші колонки ці поля очищають. */
function doneFields(
  status: WishStatus,
  doneKind: WishDoneKind | null,
  current: Pick<WishItem, 'status' | 'doneAt'> | null,
) {
  if (status !== 'DONE') return { doneKind: null, doneAt: null };
  return {
    doneKind: doneKind ?? 'BOUGHT',
    doneAt: current?.status === 'DONE' ? current.doneAt : new Date(),
  };
}
