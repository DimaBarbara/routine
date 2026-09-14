import { z } from 'zod';

import { CURRENCIES, type Currency, MAX_AMOUNT_MINOR } from './money.js';
import { emptyToNull, optionalText } from './schema-helpers.js';
import type { Person } from './spaces.js';

/** Колонки дошки в порядку відображення. */
export const WISH_STATUSES = ['WANT', 'NEED', 'THINKING', 'DONE'] as const;
export type WishStatus = (typeof WISH_STATUSES)[number];

/** Резервувати подарунок можна лише з «Бажань» і «Потреб». */
export const RESERVABLE_STATUSES: readonly WishStatus[] = ['WANT', 'NEED'];

export const WISH_DONE_KINDS = ['BOUGHT', 'GIFTED'] as const;
export type WishDoneKind = (typeof WISH_DONE_KINDS)[number];

export const WISH_CATEGORIES = [
  'CLOTHES',
  'BEAUTY',
  'SPORT',
  'TECH',
  'HOME',
  'BOOKS',
  'HOBBY',
  'TRAVEL',
  'HEALTH',
  'KIDS',
  'FOOD',
  'OTHER',
] as const;
export type WishCategory = (typeof WISH_CATEGORIES)[number];

export const WISH_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type WishPriority = (typeof WISH_PRIORITIES)[number];

/** @deprecated Використовуйте MAX_AMOUNT_MINOR. */
export const MAX_PRICE_MINOR = MAX_AMOUNT_MINOR;

/** Лише http(s): `javascript:` у посиланні на товар — готовий XSS. */
const optionalHttpUrl = z
  .preprocess(
    emptyToNull,
    z
      .url({ protocol: /^https?$/, error: 'validation.urlInvalid' })
      .max(2048, { error: 'validation.tooLong' })
      .nullish(),
  )
  .transform((value) => value ?? null);

/** Без дефолтів: `.partial()` у zod 4 підставляє їх, і PATCH мовчки скидав би поля. */
const wishItemFields = z.object({
  title: z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .max(200, { error: 'validation.tooLong' }),
  url: optionalHttpUrl,
  imageUrl: optionalHttpUrl,
  priceMinor: z
    .number({ error: 'validation.priceInvalid' })
    .int({ error: 'validation.priceInvalid' })
    .min(0, { error: 'validation.priceInvalid' })
    .max(MAX_PRICE_MINOR, { error: 'validation.priceTooHigh' })
    .nullish()
    .transform((value) => value ?? null),
  currency: z.enum(CURRENCIES, { error: 'validation.invalid' }),
  priority: z.enum(WISH_PRIORITIES, { error: 'validation.invalid' }),
  category: z.enum(WISH_CATEGORIES, { error: 'validation.invalid' }),
  note: optionalText(1000),
  /** Для кого бажання: id учасника простору або null — спільне. */
  ownerId: z.string().min(1).nullable(),
  status: z.enum(WISH_STATUSES, { error: 'validation.invalid' }),
  doneKind: z.enum(WISH_DONE_KINDS, { error: 'validation.invalid' }).nullable(),
});

export const wishItemInputSchema = wishItemFields.extend({
  currency: wishItemFields.shape.currency.default('UAH'),
  priority: wishItemFields.shape.priority.default('MEDIUM'),
  category: wishItemFields.shape.category.default('OTHER'),
  status: wishItemFields.shape.status.default('WANT'),
  /** Не передано — бажання того, хто створює. */
  ownerId: wishItemFields.shape.ownerId.optional(),
  doneKind: wishItemFields.shape.doneKind.optional(),
});
export type WishItemInput = z.output<typeof wishItemInputSchema>;

export const wishItemUpdateSchema = wishItemFields.partial();
export type WishItemUpdate = z.output<typeof wishItemUpdateSchema>;

/** Перетягування: у яку колонку і після якої картки (null — на самий верх). */
export const wishMoveSchema = z.object({
  status: z.enum(WISH_STATUSES, { error: 'validation.invalid' }),
  afterId: z.string().min(1).nullable(),
  doneKind: z.enum(WISH_DONE_KINDS, { error: 'validation.invalid' }).optional(),
});
export type WishMoveInput = z.infer<typeof wishMoveSchema>;

export const guestReservationSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(2, { error: 'validation.nameMin' })
    .max(60, { error: 'validation.nameMax' })
    .optional(),
});
export type GuestReservationInput = z.infer<typeof guestReservationSchema>;

/**
 * Стан резервації очима того, хто дивиться.
 * Людина, для якої бажання, завжди отримує `null` — навіть не «вільно», щоб нічого не можна було вивести.
 * `by` — імʼя того, хто зарезервував: лише для учасників простору; на публічній сторінці null.
 */
export type WishReservationView =
  { status: 'FREE' } | { status: 'RESERVED'; by: string | null } | { status: 'RESERVED_BY_YOU' };

export type WishPerson = Person;

export interface WishItemDto {
  id: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: Currency;
  priority: WishPriority;
  category: WishCategory;
  note: string | null;
  status: WishStatus;
  position: number;
  doneKind: WishDoneKind | null;
  doneAt: string | null;
  /** null — спільне бажання простору. */
  owner: WishPerson | null;
  createdAt: string;
  /** null — для власника бажання, а також для бажань поза «Бажаннями» та «Потребами». */
  reservation: WishReservationView | null;
}

export interface WishBoard {
  items: WishItemDto[];
  members: WishPerson[];
  /** Особисте посилання поточного користувача в цьому просторі. */
  shareUrl: string | null;
}

export type SharedWishViewer = 'GUEST' | 'USER' | 'OWNER';

export interface SharedWishBoard {
  ownerName: string;
  viewer: SharedWishViewer;
  items: WishItemDto[];
}

export interface WishShareLinkDto {
  shareUrl: string | null;
}
