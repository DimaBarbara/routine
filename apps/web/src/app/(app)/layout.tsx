import Link from 'next/link';

import { LogoutButton } from '@/components/logout-button';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/session';

import { NavLink } from './nav-link';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();

  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
          <Link href="/dashboard" className="mr-4 font-semibold tracking-tight">
            routine
          </Link>
          <nav className="flex gap-1">
            <NavLink href="/dashboard">Дашборд</NavLink>
            <NavLink href="/invites">Запрошення</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:inline">{user.name}</span>
            {user.isAdmin && <Badge tone="amber">адмін</Badge>}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
