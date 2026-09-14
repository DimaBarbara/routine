'use client';

import type { ExpenseCategory, FinanceMonthSummary } from '@routine/contracts';
import { useLocale, useTranslations } from 'next-intl';

import { ChartFrame, DataTable } from '@/components/charts/chart-frame';
import { ColumnChart } from '@/components/charts/column-chart';
import { cn } from '@/lib/cn';
import { compactNumber, formatMoney } from '@/lib/money';

import { EXPENSE_META } from './meta';

const SERIES_1 = 'var(--series-1)';
const SERIES_2 = 'var(--series-2)';

function useMoneyFormatters() {
  const locale = useLocale();
  const t = useTranslations('finance.charts');
  return {
    value: (minor: number) => formatMoney(locale, minor, 'UAH'),
    tick: (minor: number) => {
      const { value, unit } = compactNumber(locale, minor);
      return unit ? t(unit, { value }) : value;
    },
  };
}

interface Props {
  months: FinanceMonthSummary[];
  /** Короткі назви місяців — з сервера. */
  labels: string[];
}

export function IncomeExpenseChart({ months, labels }: Props) {
  const t = useTranslations('finance');
  const format = useMoneyFormatters();
  const income = months.map((m) => m.incomeFixedMinor + m.incomeUnplannedMinor);
  const expense = months.map((m) => m.expenseMinor);
  const series = [
    { key: 'income', label: t('series.income'), color: SERIES_1, values: income },
    { key: 'expense', label: t('series.expense'), color: SERIES_2, values: expense },
  ];

  return (
    <ChartFrame
      title={t('charts.incomeExpense')}
      subtitle={t('charts.lastMonths')}
      legend={series}
      table={
        <DataTable
          head={[t('charts.month'), t('series.income'), t('series.expense')]}
          rows={labels.map((label, i) => [
            label,
            format.value(income[i] ?? 0),
            format.value(expense[i] ?? 0),
          ])}
        />
      }
    >
      <ColumnChart
        categories={labels}
        series={series}
        formatValue={format.value}
        formatTick={format.tick}
      />
    </ChartFrame>
  );
}

export function IncomeKindsChart({ months, labels }: Props) {
  const t = useTranslations('finance');
  const format = useMoneyFormatters();
  const series = [
    {
      key: 'fixed',
      label: t('series.fixed'),
      color: SERIES_1,
      values: months.map((m) => m.incomeFixedMinor),
    },
    {
      key: 'unplanned',
      label: t('series.unplanned'),
      color: SERIES_2,
      values: months.map((m) => m.incomeUnplannedMinor),
    },
  ];

  return (
    <ChartFrame
      title={t('charts.incomeKinds')}
      subtitle={t('charts.lastMonths')}
      legend={series}
      table={
        <DataTable
          head={[t('charts.month'), t('series.fixed'), t('series.unplanned')]}
          rows={labels.map((label, i) => [
            label,
            format.value(months[i]?.incomeFixedMinor ?? 0),
            format.value(months[i]?.incomeUnplannedMinor ?? 0),
          ])}
        />
      }
    >
      <ColumnChart
        categories={labels}
        series={series}
        stacked
        totalLabel={t('charts.total')}
        formatValue={format.value}
        formatTick={format.tick}
      />
    </ChartFrame>
  );
}

/** Одна серія — одна барва; значення підписані на кінці смуги, зміна до минулого місяця — текстом. */
export function CategoryBreakdown({
  current,
  previous,
}: {
  current: FinanceMonthSummary;
  previous?: FinanceMonthSummary;
}) {
  const t = useTranslations('finance');
  const locale = useLocale();

  const rows = (Object.entries(current.expenseByCategory) as [ExpenseCategory, number][])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <header>
        <h2 className="font-semibold">{t('charts.categories')}</h2>
        <p className="text-sm text-muted-foreground">{t('charts.categoriesHint')}</p>
      </header>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('charts.noExpenses')}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map(([category, amount]) => {
            const meta = EXPENSE_META[category];
            const before = previous?.expenseByCategory[category] ?? 0;
            const delta = before > 0 ? Math.round(((amount - before) / before) * 100) : null;
            return (
              <li key={category} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    meta.chip,
                  )}
                >
                  <meta.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{t(`categories.${category}`)}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatMoney(locale, amount, 'UAH')}
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                        {delta === null
                          ? t('charts.new')
                          : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}%`}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (amount / max) * 100)}%`,
                        background: SERIES_2,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
