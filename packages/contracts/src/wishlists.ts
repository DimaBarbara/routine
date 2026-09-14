import { z } from 'zod';

export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const WISH_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type WishPriority = (typeof WISH_PRIORITIES)[number];

/** 20 млн у копійках — межа Postgres INTEGER із запасом. */
export const MAX_PRICE_MINOR = 2_000_000_000;

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const requiredText = (max: number) =>
  z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .max(max, { error: 'validation.tooLong' });

const optionalText = (max: number) =>
  z
    .preprocess(emptyToNull, z.string().trim().max(max, { error: 'validation.tooLong' }).nullish())
    .transform((value) => value ?? null);

/** Лише http(s): `javascript:` у посиланні на подарунок — готовий XSS. */
const optionalHttpUrl = z
  .preprocess(
    emptyToNull,
    z
      .url({ protocol: /^https?$/, error: 'validation.urlInvalid' })
      .max(2048, { error: 'validation.tooLong' })
      .nullish(),
  )
  .transform((value) => value ?? null);

// ── Списки ────────────────────────────────────────────────────────────────────

export const wishlistInputSchema = z.object({
  title: requiredText(100),
  description: optionalText(500),
});
export type WishlistInput = z.output<typeof wishlistInputSchema>;

export const wishlistUpdateSchema = wishlistInputSchema.partial();
export type WishlistUpdate = z.output<typeof wishlistUpdateSchema>;

// ── Бажання ───────────────────────────────────────────────────────────────────

/** Без дефолтів: `.partial()` у zod 4 підставляє їх, і PATCH скидав би валюту. */
const wishlistItemFields = z.object({
  title: requiredText(200),
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
  note: optionalText(1000),
});

export const wishlistItemInputSchema = wishlistItemFields.extend({
  currency: wishlistItemFields.shape.currency.default('UAH'),
  priority: wishlistItemFields.shape.priority.default('MEDIUM'),
});
export type WishlistItemInput = z.output<typeof wishlistItemInputSchema>;

export const wishlistItemUpdateSchema = wishlistItemFields.partial();
export type WishlistItemUpdate = z.output<typeof wishlistItemUpdateSchema>;

// ── Резервації ────────────────────────────────────────────────────────────────

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
 * Власник списку завжди отримує `null` — навіть не «вільно», щоб нічого не можна було вивести.
 * `by` — імʼя того, хто зарезервував: лише для учасників простору; на публічній сторінці null.
 */
export type WishReservationView =
  { status: 'FREE' } | { status: 'RESERVED'; by: string | null } | { status: 'RESERVED_BY_YOU' };

export interface WishlistItemDto {
  id: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: Currency;
  priority: WishPriority;
  note: string | null;
  createdAt: string;
  reservation: WishReservationView | null;
}

export interface WishlistSummary {
  id: string;
  title: string;
  description: string | null;
  owner: { id: string; name: string };
  itemCount: number;
  updatedAt: string;
}

export interface WishlistDetail extends WishlistSummary {
  shareUrl: string | null;
  items: WishlistItemDto[];
}

export type SharedWishlistViewer = 'GUEST' | 'USER' | 'OWNER';

export interface SharedWishlist {
  title: string;
  description: string | null;
  ownerName: string;
  viewer: SharedWishlistViewer;
  items: WishlistItemDto[];
}

export interface WishlistShareLink {
  shareUrl: string | null;
}
