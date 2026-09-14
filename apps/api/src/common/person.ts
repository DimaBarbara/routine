import type { Person } from '@routine/contracts';

/** Мінімум про людину для відповідей API. avatarUpdatedAt — щоб зібрати версійований URL фото. */
export const personSelect = { select: { id: true, name: true, avatarUpdatedAt: true } } as const;

export interface PersonRow {
  id: string;
  name: string;
  avatarUpdatedAt: Date | null;
}

/** Версія в URL: нове фото → новий URL, тож кеш браузера ніколи не показує старе. */
export function avatarUrl(row: Pick<PersonRow, 'id' | 'avatarUpdatedAt'>): string | null {
  return row.avatarUpdatedAt
    ? `/api/users/${row.id}/avatar?v=${row.avatarUpdatedAt.getTime()}`
    : null;
}

export function toPerson(row: PersonRow): Person {
  return { id: row.id, name: row.name, avatarUrl: avatarUrl(row) };
}

export const toPersonOrNull = (row: PersonRow | null): Person | null =>
  row ? toPerson(row) : null;
