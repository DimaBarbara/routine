import { createHash, randomBytes } from 'node:crypto';

/** 256 біт ентропії, безпечно для URL і cookie. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Токени зберігаємо лише як хеш: витік БД не дає робочих сесій чи інвайтів. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
