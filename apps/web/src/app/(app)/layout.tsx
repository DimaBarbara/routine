import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { requireUser, spaceLabel } from '@/lib/session';
import { canInvite, pickSpace, SPACE_COOKIE } from '@/lib/space';

import { AppNav } from './app-nav';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const [user, cookieStore, ts] = await Promise.all([
    requireUser(),
    cookies(),
    getTranslations('spaces'),
  ]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppNav
        user={user}
        spaces={user.spaces.map((space) => ({ id: space.id, label: spaceLabel(space, ts) }))}
        defaultSpaceId={pickSpace(user, cookieStore.get(SPACE_COOKIE)?.value).id}
        canInvite={canInvite(user)}
      />
      <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 lg:pt-8 lg:pb-10 lg:pl-72">{children}</main>
    </div>
  );
}
