import {
  type Currency,
  RESERVABLE_STATUSES,
  type WishItemDto,
  type WishReservationView,
} from '@routine/contracts';

import { personSelect, toPersonOrNull } from '../../common/person.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const itemInclude = {
  owner: personSelect,
  reservation: { include: { user: { select: { name: true } } } },
} satisfies Prisma.WishItemInclude;

export type ItemWithRelations = Prisma.WishItemGetPayload<{ include: typeof itemInclude }>;

/** Хто дивиться — від цього залежить, що видно про резервації. */
export type Viewer =
  /** Учасник простору: бачить, хто саме зарезервував. */
  | { kind: 'member'; userId: string }
  /** Відвідувач публічного посилання: лише «зайнято» / «ваша резервація». */
  | { kind: 'public'; userId: string | null; guestTokenHash: string | null };

/**
 * Єдине місце, де вирішується видимість резервацій. Усі відповіді API з бажаннями
 * проходять через нього — правило не може розійтися між ендпоінтами.
 */
export function reservationView(
  item: ItemWithRelations,
  viewer: Viewer,
): WishReservationView | null {
  // Людина, для якої бажання, не бачить нічого — інакше зникає сюрприз.
  if (item.ownerId !== null && item.ownerId === viewer.userId) return null;
  // «Роздуми» й «Виконано» не резервуються — стан тут не має сенсу.
  if (!RESERVABLE_STATUSES.includes(item.status)) return null;

  const { reservation } = item;
  if (!reservation) return { status: 'FREE' };

  const isYours =
    (viewer.userId !== null && reservation.userId === viewer.userId) ||
    (viewer.kind === 'public' &&
      viewer.guestTokenHash !== null &&
      reservation.guestTokenHash === viewer.guestTokenHash);
  if (isYours) return { status: 'RESERVED_BY_YOU' };

  return {
    status: 'RESERVED',
    by: viewer.kind === 'member' ? (reservation.user?.name ?? reservation.guestName) : null,
  };
}

export function toItemDto(item: ItemWithRelations, viewer: Viewer): WishItemDto {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    imageUrl: item.imageUrl,
    priceMinor: item.priceMinor,
    currency: item.currency as Currency,
    priority: item.priority,
    category: item.category,
    note: item.note,
    status: item.status,
    position: item.position,
    doneKind: item.doneKind,
    doneAt: item.doneAt?.toISOString() ?? null,
    owner: toPersonOrNull(item.owner),
    createdAt: item.createdAt.toISOString(),
    reservation: reservationView(item, viewer),
  };
}
