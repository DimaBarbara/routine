import type { FinanceAnalytics, SpaceMember } from '@routine/contracts';
import { Minus, PiggyBank, Plus, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';

import { Alert } from '@/components/ui/alert';
import { AddTransactionButtons } from '@/features/finance/add-transaction-buttons';
import { MonthSwitcher } from '@/features/finance/month-switcher';
import {
  CategoryBreakdown,
  IncomeExpenseChart,
  IncomeKindsChart,
} from '@/features/finance/overview-charts';
import { serverApi } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { requireUser } from '@/lib/session';
import { dateAt, isMonth, todayIso } from '@/lib/today';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('finance') };
}

export default async function FinanceOverviewPage({
  params,
  searchParams,
}: PageProps<'/s/[spaceId]/finance'>) {
  const [{ spaceId }, query] = await Promise.all([params, searchParams]);
  const today = todayIso();
  const month = isMonth(query.month) ? query.month : today.slice(0, 7);
  const api = `/spaces/${spaceId}`;

  const [user, analytics, members, t, format, locale] = await Promise.all([
    requireUser(),
    serverApi<FinanceAnalytics>(`${api}/finance/analytics?to=${month}&months=6`),
    serverApi<SpaceMember[]>(`${api}/members`),
    getTranslations('finance'),
    getFormatter(),
    getLocale(),
  ]);

  const current = analytics.months.at(-1)!;
  const previous = analytics.months.at(-2);
  const income = current.incomeFixedMinor + current.incomeUnplannedMinor;
  const labels = analytics.months.map((m) =>
    format.dateTime(dateAt(m.month), { month: 'short', timeZone: 'UTC' }),
  );
  const money = (minor: number, options?: { sign?: boolean }) =>
    formatMoney(locale, minor, 'UAH', options);

  const expenseDelta =
    previous && previous.expenseMinor > 0
      ? Math.round(((current.expenseMinor - previous.expenseMinor) / previous.expenseMinor) * 100)
      : null;

  const tiles: {
    label: string;
    value: string;
    /** Кожен пункт — окремим рядком: в одну лінію суми не влазять у вузьку плитку. */
    hints?: string[];
    icon: typeof Plus;
    tone: string;
  }[] = [
    {
      label: t('kpi.income'),
      value: money(income),
      hints: [
        t('kpi.incomeFixed', { amount: money(current.incomeFixedMinor) }),
        t('kpi.incomeUnplanned', { amount: money(current.incomeUnplannedMinor) }),
      ],
      icon: Plus,
      tone: 'bg-success-soft text-success',
    },
    {
      label: t('kpi.expense'),
      value: money(current.expenseMinor),
      hints:
        expenseDelta === null
          ? undefined
          : [
              t('kpi.delta', {
                delta: `${expenseDelta > 0 ? '+' : expenseDelta < 0 ? '−' : ''}${Math.abs(expenseDelta)}%`,
              }),
            ],
      icon: Minus,
      tone: 'bg-destructive-soft text-destructive',
    },
    {
      label: t('kpi.saved'),
      value: money(current.depositedMinor + current.savedMinor),
      hints: [
        t('kpi.savedDeposits', { amount: money(current.depositedMinor) }),
        t('kpi.savedCash', { amount: money(current.savedMinor) }),
      ],
      icon: PiggyBank,
      tone: 'bg-warning-soft text-warning',
    },
    {
      label: t('kpi.balance'),
      // Внески на депозити з позначкою «віднімати з доходів» зменшують залишок.
      value: money(income - current.expenseMinor - current.depositedMinor, { sign: true }),
      hints: [t('kpi.balanceHint')],
      icon: Wallet,
      tone: 'bg-accent text-accent-foreground',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={month} basePath={`/s/${spaceId}/finance`} />
        <AddTransactionButtons
          basePath={api + '/finance'}
          members={members}
          currentUserId={user.id}
          today={today}
        />
      </div>

      {analytics.incomplete && <Alert tone="info">{t('incomplete')}</Alert>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <span className={cn('flex size-9 items-center justify-center rounded-xl', tile.tone)}>
              <tile.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="text-xl font-semibold tracking-tight break-words sm:text-2xl">
                {tile.value}
              </p>
              {tile.hints && (
                <ul className="mt-1 flex flex-col text-xs text-muted-foreground">
                  {tile.hints.map((hint) => (
                    <li key={hint} className="break-words">
                      {hint}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <IncomeExpenseChart months={analytics.months} labels={labels} />
        <CategoryBreakdown current={current} previous={previous} />
      </div>
      <IncomeKindsChart months={analytics.months} labels={labels} />
    </div>
  );
}
