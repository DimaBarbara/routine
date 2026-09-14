import { type FinanceAnalytics, WISH_STATUSES, type WishBoard } from '@routine/contracts';
import { ArrowRight, Gift, Plus, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CATEGORY_META, STATUS_META } from '@/features/wishlist/meta';
import { serverApi } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { requireUser, spaceLabel } from '@/lib/session';
import { canInvite, pickSpace, SPACE_COOKIE } from '@/lib/space';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('home') };
}

export default async function HomePage() {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const space = pickSpace(user, cookieStore.get(SPACE_COOKIE)?.value);

  const [board, finance, locale, t, tw, ts, tn] = await Promise.all([
    serverApi<WishBoard>(`/spaces/${space.id}/wishlist`),
    serverApi<FinanceAnalytics>(`/spaces/${space.id}/finance/analytics?months=1`),
    getLocale(),
    getTranslations('home'),
    getTranslations('wishlist'),
    getTranslations('spaces'),
    getTranslations('nav'),
  ]);
  const thisMonth = finance.months.at(-1);
  const financeHref = `/s/${space.id}/finance`;

  const boardHref = `/s/${space.id}/wishlist`;
  const recent = board.items
    .filter((item) => item.status !== 'DONE')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">{spaceLabel(space, ts)}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('greeting', { name: user.name })} 👋
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {WISH_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const count = board.items.filter((item) => item.status === status).length;
          return (
            <Link
              key={status}
              href={boardHref}
              className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Card className="flex h-full flex-col gap-4 p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <span
                  className={cn('flex size-10 items-center justify-center rounded-xl', meta.chip)}
                >
                  <meta.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-3xl font-semibold tabular-nums">{count}</p>
                  <p className="text-sm text-muted-foreground">{tw(`columns.${status}`)}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">{t('recent')}</h2>
            <Link
              href={boardHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('openBoard')} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t('emptyRecent')}</p>
              <Link
                href={boardHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="size-4" aria-hidden /> {tw('add')}
              </Link>
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {recent.map((item) => {
                const category = CATEGORY_META[item.category];
                return (
                  <li key={item.id}>
                    <Link
                      href={boardHref}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted"
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-xl',
                          category.chip,
                        )}
                      >
                        <category.icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <Badge>{tw(`columns.${item.status}`)}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h2 className="font-semibold">{t('members')}</h2>
            <ul className="flex flex-col gap-3">
              {board.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar id={member.id} name={member.name} src={member.avatarUrl} size="md" />
                  <span className="text-sm font-medium">{member.name}</span>
                </li>
              ))}
            </ul>
            {canInvite(user) && (
              <Link
                href="/invites"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent text-sm font-medium text-accent-foreground hover:bg-accent/70"
              >
                <Plus className="size-4" aria-hidden /> {t('invite')}
              </Link>
            )}
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">{t('modules')}</h2>
            <Link href={boardHref} className="group rounded-2xl">
              <Card className="flex items-center gap-3 p-4 transition group-hover:border-input">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Gift className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{tn('wishlist')}</p>
                  <p className="truncate text-xs text-muted-foreground">{t('wishlistModule')}</p>
                </div>
              </Card>
            </Link>
            <Link href={financeHref} className="group rounded-2xl">
              <Card className="flex flex-col gap-3 p-4 transition group-hover:border-input">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Wallet className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{tn('finance')}</p>
                    <p className="truncate text-xs text-muted-foreground">{t('financeTitle')}</p>
                  </div>
                </div>
                {thisMonth && (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-muted/60 p-2.5">
                      <dt className="text-xs text-muted-foreground">{t('financeExpense')}</dt>
                      <dd className="font-semibold">
                        {formatMoney(locale, thisMonth.expenseMinor, 'UAH')}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-2.5">
                      <dt className="text-xs text-muted-foreground">{t('financeIncome')}</dt>
                      <dd className="font-semibold text-success">
                        {formatMoney(
                          locale,
                          thisMonth.incomeFixedMinor + thisMonth.incomeUnplannedMinor,
                          'UAH',
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
              </Card>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
