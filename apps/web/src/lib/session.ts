import type { SessionUser, SpaceSummary } from '@routine/contracts';
import { redirect } from 'next/navigation';

import { ApiError } from './api/error';
import { serverApi } from './api/server';

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await serverApi<SessionUser>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export function spaceLabel(space: SpaceSummary): string {
  if (!space.isPersonal) return space.name;
  if (space.role === 'OWNER') return 'Мій простір';
  return space.ownerName ? `Простір: ${space.ownerName}` : space.name;
}

/** Лише відносні шляхи — інакше ?next=https://evil.com стає відкритим редіректом. */
export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : fallback;
}
