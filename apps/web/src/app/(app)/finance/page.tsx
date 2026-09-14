import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/session';
import { pickSpace, SPACE_COOKIE } from '@/lib/space';

export default async function FinanceEntryPage() {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  redirect(`/s/${pickSpace(user, cookieStore.get(SPACE_COOKIE)?.value).id}/finance`);
}
