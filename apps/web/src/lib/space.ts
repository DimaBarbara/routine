import type { SessionUser, SpaceSummary } from '@routine/contracts';

/** Останній відкритий простір — щоб «Вішліст» у меню вів туди ж, де людина була. */
export const SPACE_COOKIE = 'routine_space';

export function pickSpace(user: SessionUser, preferredId: string | undefined): SpaceSummary {
  // Кожен користувач має щонайменше один простір: особистий або той, куди його запросили.
  return user.spaces.find((space) => space.id === preferredId) ?? user.spaces[0]!;
}

export function canInvite(user: SessionUser): boolean {
  return user.isAdmin || user.spaces.some((space) => space.role === 'OWNER');
}
