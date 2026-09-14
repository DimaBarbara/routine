/**
 * Стабільні коди помилок API. Фронт перекладає їх (namespace `errors`),
 * тож тексти помилок не залежать від мови сервера.
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'AUTH_REQUIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_EMAIL_TAKEN',
  'SPACE_NOT_FOUND',
  'INVITE_INVALID',
  'INVITE_NOT_FOUND',
  'INVITE_ALREADY_USED',
  'INVITE_ADMIN_ONLY',
  'INVITE_OWNER_ONLY',
  'INVITE_USER_EXISTS',
  'INVITE_ALREADY_MEMBER',
  'INVITE_EMAIL_MISMATCH',
  'INVITE_REGISTRATION_ONLY',
  'WISHLIST_NOT_FOUND',
  'WISHLIST_ITEM_NOT_FOUND',
  'WISHLIST_OWNER_CANNOT_RESERVE',
  'WISHLIST_ALREADY_RESERVED',
  'WISHLIST_RESERVATION_NOT_FOUND',
  'WISHLIST_GUEST_NAME_REQUIRED',
  'WISHLIST_ITEM_NOT_RESERVABLE',
  'WISHLIST_INVALID_OWNER',
  'FINANCE_NOT_FOUND',
  'FINANCE_INVALID_PERSON',
  'FINANCE_CASH_INSUFFICIENT',
  'NOT_FOUND',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Тіло будь-якої помилки API. `message` — англійський текст для логів, не для людей. */
export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  /** Для VALIDATION_FAILED: `message` кожної помилки — ключ перекладу `validation.*`. */
  issues?: { path: string; message: string }[];
}
