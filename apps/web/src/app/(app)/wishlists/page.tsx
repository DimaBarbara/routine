import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SPACE_COOKIE } from '@/features/wishlists/space-switcher';
import { requireUser } from '@/lib/session';

/** Вхід у модуль: останній відкритий простір або перший доступний. */
export default async function WishlistsEntryPage() {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const remembered = cookieStore.get(SPACE_COOKIE)?.value;
  const space = user.spaces.find((item) => item.id === remembered) ?? user.spaces[0]!;
  redirect(`/s/${space.id}/wishlists`);
}
