import type { CashStash, DepositDto } from '@routine/contracts';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { CashCard } from '@/features/finance/cash-card';
import { DepositsSection, type DepositView } from '@/features/finance/deposits-section';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';
import { addMonthsIso, dateAt, todayIso } from '@/lib/today';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('savings') };
}

const MILESTONE_MONTHS = [6, 12, 24];

export default async function SavingsPage({ params }: PageProps<'/s/[spaceId]/finance/savings'>) {
  const { spaceId } = await params;
  const today = todayIso();
  const api = `/spaces/${spaceId}/finance`;

  const [user, stash, deposits, format, t] = await Promise.all([
    requireUser(),
    serverApi<CashStash>(`${api}/cash`),
    serverApi<DepositDto[]>(`${api}/deposits`),
    getFormatter(),
    getTranslations('finance.deposits.detail'),
  ]);

  const day = (iso: string) =>
    format.dateTime(dateAt(iso), { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayYear = (iso: string) =>
    format.dateTime(dateAt(iso), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const views: DepositView[] = deposits.map((deposit) => {
    const { projection } = deposit;
    const pointAt = (date: string) => projection.find((point) => point.date >= date);

    const milestones = MILESTONE_MONTHS.flatMap((months) => {
      const target = addMonthsIso(today, months);
      const point = pointAt(target);
      if (!point || (deposit.endDate && target > deposit.endDate)) return [];
      return [
        {
          key: `m${months}`,
          label: `${t('inMonths', { count: months })} · ${dayYear(point.date)}`,
          point,
        },
      ];
    });
    const last = projection.at(-1);
    if (deposit.endDate && last && deposit.endDate > today) {
      milestones.push({
        key: 'end',
        label: `${t('atEnd')} · ${dayYear(deposit.endDate)}`,
        point: last,
      });
    }

    return {
      deposit,
      projectionLabels: projection.map((point) =>
        format.dateTime(dateAt(point.date), { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      ),
      todayIndex: projection.reduce((index, point, i) => (point.date <= today ? i : index), 0),
      nextTopUpLabel: deposit.nextTopUpDate ? day(deposit.nextTopUpDate) : null,
      endLabel: deposit.endDate ? dayYear(deposit.endDate) : null,
      contributionLabels: Object.fromEntries(
        deposit.contributions.map((c) => [c.id, dayYear(c.date)]),
      ),
      milestones,
    };
  });

  const shared = { basePath: api, currentUserId: user.id, today };

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
      <CashCard
        stash={stash}
        dateLabels={Object.fromEntries(
          stash.entries.map((entry) => [entry.id, dayYear(entry.date)]),
        )}
        {...shared}
      />
      <DepositsSection views={views} members={stash.members} {...shared} />
    </div>
  );
}
