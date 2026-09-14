'use client';

import {
  contributionInputSchema,
  type DepositDto,
  type DepositPoint,
  type FinancePerson,
} from '@routine/contracts';
import { ChevronRight, Landmark, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { AreaChart } from '@/components/charts/area-chart';
import { DataTable } from '@/components/charts/chart-frame';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';
import { compactNumber, formatMoney, formatPercentBp, parseMoney } from '@/lib/money';

import { DepositForm } from './deposit-form';

/** Усі підписи дат готує сервер: Intl у Node і браузері розходиться. */
export interface DepositView {
  deposit: DepositDto;
  projectionLabels: string[];
  todayIndex: number;
  nextTopUpLabel: string | null;
  endLabel: string | null;
  contributionLabels: Record<string, string>;
  milestones: { key: string; label: string; point: DepositPoint }[];
}

interface Props {
  views: DepositView[];
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
}

export function DepositsSection({ views, ...shared }: Props) {
  const t = useTranslations('finance.deposits');
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const open = views.find((view) => view.deposit.id === openId);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> {t('add')}
        </Button>
      </header>

      {views.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {views.map(({ deposit, nextTopUpLabel, endLabel }) => (
            <li key={deposit.id}>
              <button
                type="button"
                onClick={() => setOpenId(deposit.id)}
                className="group flex h-full w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-input focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Landmark className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{deposit.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        deposit.bank,
                        t('rate', { rate: formatPercentBp(locale, deposit.annualRateBp) }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-5 text-muted-foreground transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t('now')}</p>
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatMoney(locale, deposit.current.balanceMinor, deposit.currency)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('contributed')}{' '}
                    {formatMoney(locale, deposit.current.contributedMinor, deposit.currency)} ·{' '}
                    <span className="font-medium text-success">
                      +{formatMoney(locale, deposit.current.interestMinor, deposit.currency)}
                    </span>
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5">
                  <Badge>{deposit.capitalization ? t('capitalization') : t('payout')}</Badge>
                  <Badge>{endLabel ? t('endsOn', { date: endLabel }) : t('openEnded')}</Badge>
                  {nextTopUpLabel && (
                    <Badge tone="accent">{t('nextTopUp', { date: nextTopUpLabel })}</Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title={t('form.newTitle')}
      >
        <DepositForm {...shared} onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={open !== undefined}
        onClose={() => setOpenId(null)}
        size="lg"
        title={open?.deposit.name ?? ''}
      >
        {open && <DepositDetail view={open} {...shared} onDeleted={() => setOpenId(null)} />}
      </Modal>
    </section>
  );
}

function DepositDetail({
  view,
  basePath,
  members,
  currentUserId,
  today,
  onDeleted,
}: Omit<Props, 'views'> & { view: DepositView; onDeleted: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorText();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deposit } = view;
  const path = `${basePath}/deposits/${deposit.id}`;

  const money = (minor: number) => formatMoney(locale, minor, deposit.currency);
  const tick = (minor: number) => {
    const { value, unit } = compactNumber(locale, minor);
    return unit ? t(`finance.charts.${unit}`, { value }) : value;
  };

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (editing) {
    return (
      <DepositForm
        deposit={deposit}
        basePath={basePath}
        members={members}
        currentUserId={currentUserId}
        today={today}
        onDone={() => setEditing(false)}
      />
    );
  }

  const series = [
    {
      key: 'contributed',
      label: t('finance.series.contributed'),
      color: 'var(--series-1)',
      values: deposit.projection.map((p) => p.contributedMinor),
    },
    {
      key: 'interest',
      label: t('finance.series.interest'),
      color: 'var(--series-2)',
      values: deposit.projection.map((p) => p.interestMinor),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('finance.deposits.now'), value: money(deposit.current.balanceMinor) },
          {
            label: t('finance.deposits.contributed'),
            value: money(deposit.current.contributedMinor),
          },
          {
            label: t('finance.deposits.interest'),
            value: `+${money(deposit.current.interestMinor)}`,
            hint: t('finance.deposits.interestNet'),
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-semibold">{stat.value}</p>
            {stat.hint && <p className="text-[11px] text-muted-foreground">{stat.hint}</p>}
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold">{t('finance.deposits.detail.projection')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('finance.deposits.detail.projectionHint')}
          </p>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
        <AreaChart
          labels={view.projectionLabels}
          series={series}
          formatValue={money}
          formatTick={tick}
          totalLabel={t('finance.charts.total')}
          markerIndex={view.todayIndex}
          markerLabel={t('finance.deposits.detail.today')}
        />
      </section>

      {view.milestones.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">{t('finance.deposits.detail.milestones')}</h3>
          <DataTable
            head={[
              '',
              t('finance.series.contributed'),
              t('finance.series.interest'),
              t('finance.charts.total'),
            ]}
            rows={view.milestones.map((m) => [
              m.label,
              money(m.point.contributedMinor),
              `+${money(m.point.interestMinor)}`,
              money(m.point.contributedMinor + m.point.interestMinor),
            ])}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">{t('finance.deposits.detail.contributions')}</h3>
        <ContributionForm
          path={path}
          today={today}
          startDate={deposit.startDate}
          onError={setError}
        />
        <ul className="flex max-h-60 flex-col overflow-y-auto">
          {[...deposit.contributions].reverse().map((contribution) => (
            <li
              key={contribution.id}
              className="group flex items-center gap-3 border-b border-border py-2 text-sm last:border-0"
            >
              <span className="w-24 shrink-0 text-xs text-muted-foreground">
                {view.contributionLabels[contribution.id]}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {contribution.note ?? t(`finance.deposits.detail.kinds.${contribution.kind}`)}
              </span>
              <span className="font-semibold tabular-nums">{money(contribution.amountMinor)}</span>
              <button
                type="button"
                onClick={() => run(() => api(`${path}/contributions/${contribution.id}`, 'DELETE'))}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive-soft hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <ConfirmAction
          label={t('common.delete')}
          question={t('finance.deposits.detail.deleteConfirm')}
          onConfirm={() =>
            run(async () => {
              await api(path, 'DELETE');
              onDeleted();
            })
          }
        />
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {t('finance.deposits.detail.edit')}
        </Button>
      </div>
    </div>
  );
}

function ContributionForm({
  path,
  today,
  startDate,
  onError,
}: {
  path: string;
  today: string;
  startDate: string;
  onError: (message: string | null) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps, reset } = useZodForm(
    contributionInputSchema,
    (data) => ({
      amountMinor: parseMoney(data.get('amount')),
      date: data.get('date'),
      note: data.get('note'),
    }),
  );

  return (
    <form
      {...formProps(async (data, form) => {
        onError(null);
        await api(`${path}/contributions`, 'POST', data);
        form.reset();
        reset();
        router.refresh();
      })}
      className="grid items-start gap-2 rounded-2xl bg-muted/60 p-3 sm:grid-cols-[1fr_1fr_auto]"
    >
      <TextField
        label={t('finance.transactions.amount')}
        name="amount"
        inputMode="decimal"
        placeholder="0"
        error={errors['amountMinor']}
      />
      <TextField
        label={t('finance.transactions.date')}
        name="date"
        type="date"
        min={startDate}
        defaultValue={today > startDate ? today : startDate}
        error={errors['date'] ?? formError ?? undefined}
      />
      <input type="hidden" name="note" value="" />
      <Button type="submit" loading={submitting} className="sm:mt-6.5">
        <Plus className="size-4" aria-hidden /> {t('finance.deposits.detail.addContribution')}
      </Button>
    </form>
  );
}
