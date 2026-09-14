import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/session';
import { pickSpace, SPACE_COOKIE } from '@/lib/space';

/** Вхід у модуль: останній відкритий простір або перший доступний. */
export default async function WishlistEntryPage() {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  redirect(`/s/${pickSpace(user, cookieStore.get(SPACE_COOKIE)?.value).id}/wishlist`);
}
