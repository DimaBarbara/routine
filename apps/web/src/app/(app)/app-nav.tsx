'use client';

import { Gift, House, type LucideIcon, Mail, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Brand } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { Preferences } from '@/components/preferences';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { SPACE_COOKIE } from '@/lib/space';

interface Props {
  user: { id: string; name: string; email: string; isAdmin: boolean };
  spaces: { id: string; label: string }[];
  defaultSpaceId: string;
  canInvite: boolean;
}

interface NavItem {
  href: string;
  segment: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export function AppNav({ user, spaces, defaultSpaceId, canInvite }: Props) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ spaceId?: string }>();
  const spaceId = params.spaceId ?? defaultSpaceId;

  // Запамʼятовуємо простір, у якому людина зараз працює.
  useEffect(() => {
    if (params.spaceId) {
      document.cookie = `${SPACE_COOKIE}=${params.spaceId}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [params.spaceId]);

  const items: NavItem[] = [
    { href: '/dashboard', segment: 'dashboard', label: t('home'), icon: House },
    { href: `/s/${spaceId}/wishlist`, segment: 'wishlist', label: t('wishlist'), icon: Gift },
    { href: `/s/${spaceId}/finance`, segment: 'finance', label: t('finance'), icon: Wallet },
    ...(canInvite
      ? [{ href: '/invites', segment: 'invites', label: t('invites'), icon: Mail }]
      : []),
  ];
  const segments = pathname.split('/');
  const isActive = (item: NavItem) => segments.includes(item.segment);

  function switchSpace(nextId: string) {
    document.cookie = `${SPACE_COOKIE}=${nextId}; path=/; max-age=31536000; samesite=lax`;
    if (params.spaceId) router.push(pathname.replace(`/s/${params.spaceId}`, `/s/${nextId}`));
    else router.refresh();
  }

  return (
    <>
      {/* Десктоп: бічна панель */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Brand />
        </div>

        {spaces.length > 1 && (
          <div className="px-3 pb-3">
            <label className="sr-only" htmlFor="space-switcher">
              {t('space')}
            </label>
            <select
              id="space-switcher"
              value={spaceId}
              onChange={(event) => switchSpace(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) =>
            item.soon ? (
              <span
                key={item.segment}
                aria-disabled
                className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground/60"
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
                <Badge className="ml-auto">{tc('soon')}</Badge>
              </span>
            ) : (
              <Link
                key={item.segment}
                href={item.href}
                aria-current={isActive(item) ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
                  isActive(item)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex flex-col gap-3 border-t border-border p-3">
          <Preferences className="justify-between px-1" />
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar id={user.id} name={user.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {user.name}
                {user.isAdmin && <Badge tone="amber">{t('admin')}</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <LogoutButton variant="icon" />
          </div>
        </div>
      </aside>

      {/* Мобільний: верхня панель + нижня навігація */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-card/85 px-4 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <Preferences />
          <LogoutButton variant="icon" />
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items
          .filter((item) => !item.soon)
          .map((item) => (
            <Link
              key={item.segment}
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                isActive(item) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
