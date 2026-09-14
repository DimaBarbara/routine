import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LogoutButton } from '@/components/logout-button';
import { Preferences } from '@/components/preferences';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/session';

import { NavLink } from './nav-link';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  const t = await getTranslations('nav');

  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2">
          <Link href="/dashboard" className="mr-4 font-semibold tracking-tight">
            routine
          </Link>
          <nav className="flex gap-1">
            <NavLink href="/dashboard">{t('dashboard')}</NavLink>
            <NavLink href="/invites">{t('invites')}</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 md:inline">{user.name}</span>
            {user.isAdmin && <Badge tone="amber">{t('admin')}</Badge>}
            <Preferences />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
