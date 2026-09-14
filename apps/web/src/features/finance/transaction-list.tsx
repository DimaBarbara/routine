'use client';

import type { FinancePerson, TransactionDto } from '@routine/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

import { EXPENSE_META, INCOME_META } from './meta';
import { TransactionDialog } from './transaction-dialog';

export interface DayGroup {
  date: string;
  /** Підпис дня форматує сервер. */
  label: string;
  netBaseMinor: number;
  transactions: TransactionDto[];
}

interface Props {
  groups: DayGroup[];
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
}

export function TransactionList({ groups, ...dialogProps }: Props) {
  const t = useTranslations('finance');
  const locale = useLocale();
  const [editing, setEditing] = useState<TransactionDto | null>(null);

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        {t('transactions.empty')}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.date} className="flex flex-col gap-1.5">
            <header className="flex items-baseline justify-between px-2 text-xs font-medium text-muted-foreground">
              <span className="capitalize">{group.label}</span>
              <span className="tabular-nums">
                {formatMoney(locale, group.netBaseMinor, 'UAH', { sign: true })}
              </span>
            </header>
            <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {group.transactions.map((transaction) => {
                const meta =
                  transaction.type === 'EXPENSE'
                    ? EXPENSE_META[transaction.category ?? 'OTHER']
                    : INCOME_META[transaction.incomeKind ?? 'UNPLANNED'];
                const label =
                  transaction.type === 'EXPENSE'
                    ? t(`categories.${transaction.category ?? 'OTHER'}`)
                    : t(`incomeKinds.${transaction.incomeKind ?? 'UNPLANNED'}`);
                const signed =
                  transaction.type === 'EXPENSE'
                    ? -transaction.amountMinor
                    : transaction.amountMinor;

                return (
                  <li key={transaction.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => setEditing(transaction)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          meta.chip,
                        )}
                      >
                        <meta.icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {transaction.note ?? label}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {transaction.note && <span className="truncate">{label}</span>}
                          {transaction.recurringIncomeId && (
                            <Badge tone="green">{t('transactions.recurring')}</Badge>
                          )}
                        </span>
                      </span>
                      {transaction.person && (
                        <Avatar
                          id={transaction.person.id}
                          name={transaction.person.name}
                          size="xs"
                        />
                      )}
                      <span className="text-right">
                        <span
                          className={cn(
                            'block text-sm font-semibold tabular-nums',
                            transaction.type === 'INCOME' && 'text-success',
                          )}
                        >
                          {formatMoney(locale, signed, transaction.currency, { sign: true })}
                        </span>
                        {transaction.currency !== 'UAH' && transaction.amountBaseMinor !== null && (
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {t('transactions.approx', {
                              amount: formatMoney(locale, transaction.amountBaseMinor, 'UAH'),
                            })}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <TransactionDialog
        {...dialogProps}
        open={editing !== null}
        transaction={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
