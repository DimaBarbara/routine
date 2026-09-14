import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  WishlistDetail,
  WishlistInput,
  WishlistItemDto,
  WishlistItemInput,
  WishlistItemUpdate,
  WishlistShareLink,
  WishlistSummary,
  WishlistUpdate,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { generateToken } from '../../common/crypto.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  itemInclude,
  itemOrder,
  summaryInclude,
  toItemDto,
  toSummary,
  viewerInSpace,
} from './wishlist.mapper.js';

/**
 * Кожен запит фільтрується і за id, і за spaceId: SpaceMemberGuard перевіряє лише
 * членство в просторі з URL, тож чужий wishlistId у своєму просторі має дати 404.
 */
@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async list(spaceId: string): Promise<WishlistSummary[]> {
    const wishlists = await this.prisma.wishlist.findMany({
      where: { spaceId },
      include: summaryInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return wishlists.map(toSummary);
  }

  async create(spaceId: string, ownerId: string, input: WishlistInput): Promise<WishlistSummary> {
    const wishlist = await this.prisma.wishlist.create({
      data: { ...input, spaceId, ownerId },
      include: summaryInclude,
    });
    return toSummary(wishlist);
  }

  async get(spaceId: string, wishlistId: string, userId: string): Promise<WishlistDetail> {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: { id: wishlistId, spaceId },
      include: { ...summaryInclude, items: { include: itemInclude, orderBy: itemOrder } },
    });
    if (!wishlist) throw AppException.notFound('WISHLIST_NOT_FOUND');

    const viewer = viewerInSpace(wishlist.ownerId, userId);
    return {
      ...toSummary(wishlist),
      shareUrl: this.shareUrl(wishlist.shareToken),
      items: wishlist.items.map((item) => toItemDto(item, viewer)),
    };
  }

  async update(
    spaceId: string,
    wishlistId: string,
    input: WishlistUpdate,
  ): Promise<WishlistSummary> {
    await this.findOrThrow(spaceId, wishlistId);
    const wishlist = await this.prisma.wishlist.update({
      where: { id: wishlistId },
      data: input,
      include: summaryInclude,
    });
    return toSummary(wishlist);
  }

  async remove(spaceId: string, wishlistId: string): Promise<void> {
    const { count } = await this.prisma.wishlist.deleteMany({ where: { id: wishlistId, spaceId } });
    if (count === 0) throw AppException.notFound('WISHLIST_NOT_FOUND');
  }

  /** Створює або перевипускає посилання — старе одразу перестає працювати. */
  async enableShare(spaceId: string, wishlistId: string): Promise<WishlistShareLink> {
    await this.findOrThrow(spaceId, wishlistId);
    const { shareToken } = await this.prisma.wishlist.update({
      where: { id: wishlistId },
      data: { shareToken: generateToken() },
    });
    return { shareUrl: this.shareUrl(shareToken) };
  }

  async disableShare(spaceId: string, wishlistId: string): Promise<WishlistShareLink> {
    await this.findOrThrow(spaceId, wishlistId);
    await this.prisma.wishlist.update({ where: { id: wishlistId }, data: { shareToken: null } });
    return { shareUrl: null };
  }

  async addItem(
    spaceId: string,
    wishlistId: string,
    userId: string,
    input: WishlistItemInput,
  ): Promise<WishlistItemDto> {
    const wishlist = await this.findOrThrow(spaceId, wishlistId);
    const [item] = await this.prisma.$transaction([
      this.prisma.wishlistItem.create({ data: { ...input, wishlistId }, include: itemInclude }),
      this.touch(wishlistId),
    ]);
    return toItemDto(item, viewerInSpace(wishlist.ownerId, userId));
  }

  async updateItem(
    spaceId: string,
    wishlistId: string,
    itemId: string,
    userId: string,
    input: WishlistItemUpdate,
  ): Promise<WishlistItemDto> {
    const { wishlist } = await this.findItemOrThrow(spaceId, wishlistId, itemId);
    const [item] = await this.prisma.$transaction([
      this.prisma.wishlistItem.update({ where: { id: itemId }, data: input, include: itemInclude }),
      this.touch(wishlistId),
    ]);
    return toItemDto(item, viewerInSpace(wishlist.ownerId, userId));
  }

  async removeItem(spaceId: string, wishlistId: string, itemId: string): Promise<void> {
    await this.findItemOrThrow(spaceId, wishlistId, itemId);
    await this.prisma.$transaction([
      this.prisma.wishlistItem.delete({ where: { id: itemId } }),
      this.touch(wishlistId),
    ]);
  }

  async findItemOrThrow(spaceId: string, wishlistId: string, itemId: string) {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, wishlistId, wishlist: { spaceId } },
      include: { wishlist: { select: { ownerId: true } } },
    });
    if (!item) throw AppException.notFound('WISHLIST_ITEM_NOT_FOUND');
    return item;
  }

  private async findOrThrow(spaceId: string, wishlistId: string) {
    const wishlist = await this.prisma.wishlist.findFirst({ where: { id: wishlistId, spaceId } });
    if (!wishlist) throw AppException.notFound('WISHLIST_NOT_FOUND');
    return wishlist;
  }

  /** Резервації свідомо НЕ торкаються updatedAt списку: з нього власник міг би вгадати. */
  private touch(wishlistId: string) {
    return this.prisma.wishlist.update({
      where: { id: wishlistId },
      data: { updatedAt: new Date() },
    });
  }

  private shareUrl(token: string | null): string | null {
    return token ? `${this.config.get('WEB_URL', { infer: true })}/w/${token}` : null;
  }
}
