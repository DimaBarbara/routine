import type {
  Currency,
  WishlistItemDto,
  WishlistSummary,
  WishReservationView,
} from '@routine/contracts';

import type { Prisma } from '../../generated/prisma/client.js';

export const itemInclude = {
  reservation: { include: { user: { select: { name: true } } } },
} satisfies Prisma.WishlistItemInclude;

export const itemOrder = [
  { priority: 'desc' },
  { createdAt: 'desc' },
] satisfies Prisma.WishlistItemOrderByWithRelationInput[];

export const summaryInclude = {
  owner: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.WishlistInclude;

type ItemWithReservation = Prisma.WishlistItemGetPayload<{ include: typeof itemInclude }>;
type WishlistWithSummary = Prisma.WishlistGetPayload<{ include: typeof summaryInclude }>;

/** Хто дивиться список — від цього залежить, що видно про резервації. */
export type Viewer =
  /** Для кого список: не бачить резервацій узагалі. */
  | { kind: 'owner' }
  /** Учасник простору: бачить, хто саме зарезервував. */
  | { kind: 'member'; userId: string }
  /** Відвідувач публічного посилання: бачить лише «зайнято» / «ваша резервація». */
  | { kind: 'public'; userId: string | null; guestTokenHash: string | null };

export function viewerInSpace(ownerId: string, userId: string): Viewer {
  return ownerId === userId ? { kind: 'owner' } : { kind: 'member', userId };
}

export function viewerOnSharedPage(
  ownerId: string,
  userId: string | null,
  guestTokenHash: string | null,
): Viewer {
  return userId !== null && ownerId === userId
    ? { kind: 'owner' }
    : { kind: 'public', userId, guestTokenHash };
}

/**
 * Єдине місце, де вирішується видимість резервацій. Усі відповіді API
 * з бажаннями проходять через нього — правило не може розійтися між ендпоінтами.
 */
export function reservationView(
  reservation: ItemWithReservation['reservation'],
  viewer: Viewer,
): WishReservationView | null {
  if (viewer.kind === 'owner') return null;
  if (!reservation) return { status: 'FREE' };

  const isYours =
    viewer.kind === 'member'
      ? reservation.userId === viewer.userId
      : (viewer.userId !== null && reservation.userId === viewer.userId) ||
        (viewer.guestTokenHash !== null && reservation.guestTokenHash === viewer.guestTokenHash);

  if (isYours) return { status: 'RESERVED_BY_YOU' };

  return {
    status: 'RESERVED',
    by: viewer.kind === 'member' ? (reservation.user?.name ?? reservation.guestName) : null,
  };
}

export function toItemDto(item: ItemWithReservation, viewer: Viewer): WishlistItemDto {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    imageUrl: item.imageUrl,
    priceMinor: item.priceMinor,
    currency: item.currency as Currency,
    priority: item.priority,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    reservation: reservationView(item.reservation, viewer),
  };
}

export function toSummary(wishlist: WishlistWithSummary): WishlistSummary {
  return {
    id: wishlist.id,
    title: wishlist.title,
    description: wishlist.description,
    owner: wishlist.owner,
    itemCount: wishlist._count.items,
    updatedAt: wishlist.updatedAt.toISOString(),
  };
}
