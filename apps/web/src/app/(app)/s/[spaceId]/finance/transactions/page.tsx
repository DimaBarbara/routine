import type { FinanceMonth } from '@routine/contracts';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { AddTransactionButtons } from '@/features/finance/add-transaction-buttons';
import { MonthSwitcher } from '@/features/finance/month-switcher';
import { RecurringIncomes } from '@/features/finance/recurring-incomes';
import { type DayGroup, TransactionList } from '@/features/finance/transaction-list';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';
import { dateAt, isMonth, todayIso } from '@/lib/today';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('transactions') };
}

export default async function TransactionsPage({
  params,
  searchParams,
}: PageProps<'/s/[spaceId]/finance/transactions'>) {
  const [{ spaceId }, query] = await Promise.all([params, searchParams]);
  const today = todayIso();
  const month = isMonth(query.month) ? query.month : today.slice(0, 7);
  const api = `/spaces/${spaceId}/finance`;

  const [user, data, format] = await Promise.all([
    requireUser(),
    serverApi<FinanceMonth>(`${api}/transactions?month=${month}`),
    getFormatter(),
  ]);

  const groups: DayGroup[] = [];
  for (const transaction of data.transactions) {
    let group = groups.at(-1);
    if (group?.date !== transaction.date) {
      group = {
        date: transaction.date,
        label: format.dateTime(dateAt(transaction.date), {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }),
        netBaseMinor: 0,
        transactions: [],
      };
      groups.push(group);
    }
    group.transactions.push(transaction);
    const amount = transaction.amountBaseMinor ?? 0;
    group.netBaseMinor += transaction.type === 'INCOME' ? amount : -amount;
  }

  const nextLabels = Object.fromEntries(
    data.recurringIncomes
      .filter((rule) => rule.nextDate)
      .map((rule) => [
        rule.id,
        format.dateTime(dateAt(rule.nextDate!), { day: 'numeric', month: 'long', timeZone: 'UTC' }),
      ]),
  );
  const shared = { basePath: api, members: data.members, currentUserId: user.id, today };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher month={month} basePath={`/s/${spaceId}/finance/transactions`} />
          <AddTransactionButtons {...shared} />
        </div>
        <TransactionList groups={groups} {...shared} />
      </div>
      <RecurringIncomes rules={data.recurringIncomes} nextLabels={nextLabels} {...shared} />
    </div>
  );
}
