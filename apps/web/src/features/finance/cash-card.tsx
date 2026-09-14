'use client';

import {
  type CashEntryDto,
  cashEntryInputSchema,
  type CashStash,
  CURRENCIES,
} from '@routine/contracts';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatMoney, parseMoney } from '@/lib/money';

type Direction = 'IN' | 'OUT';

interface Props {
  stash: CashStash;
  /** Підписи дат записів форматує сервер. */
  dateLabels: Record<string, string>;
  basePath: string;
  currentUserId: string;
  today: string;
}

export function CashCard({ stash, dateLabels, basePath, currentUserId, today }: Props) {
  const t = useTranslations('finance.cash');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorText();
  const [direction, setDirection] = useState<Direction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(entry: CashEntryDto) {
    setError(null);
    try {
      await api(`${basePath}/cash/${entry.id}`, 'DELETE');
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      <header className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Banknote className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('hint')}</p>
        </div>
      </header>

      {stash.balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {stash.balances.map((balance) => (
              <span key={balance.currency} className="text-3xl font-semibold tracking-tight">
                {formatMoney(locale, balance.amountMinor, balance.currency)}
              </span>
            ))}
          </div>
          {stash.balances.some((balance) => balance.currency !== 'UAH') && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('total', { amount: formatMoney(locale, stash.totalBaseMinor, 'UAH') })}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setDirection('IN')}>
          <ArrowDownToLine className="size-4" aria-hidden /> {t('put')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setDirection('OUT')}
          disabled={stash.balances.length === 0}
        >
          <ArrowUpFromLine className="size-4" aria-hidden /> {t('take')}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {stash.entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('history')}
          </h3>
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {stash.entries.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center gap-3 border-b border-border py-2 text-sm last:border-0"
              >
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {dateLabels[entry.id]}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {entry.note ?? entry.person?.name ?? ''}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    entry.amountMinor > 0 && 'text-success',
                  )}
                >
                  {formatMoney(locale, entry.amountMinor, entry.currency, { sign: true })}
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry)}
                  aria-label={tc('delete')}
                  title={tc('delete')}
                  className="rounded-md p-1 text-muted-foreground opacity-100 transition hover:bg-destructive-soft hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={direction !== null}
        onClose={() => setDirection(null)}
        title={direction === 'OUT' ? t('takeTitle') : t('putTitle')}
      >
        <CashForm
          direction={direction ?? 'IN'}
          basePath={basePath}
          currentUserId={currentUserId}
          today={today}
          onClose={() => setDirection(null)}
        />
      </Modal>
    </section>
  );
}

function CashForm({
  direction,
  basePath,
  currentUserId,
  today,
  onClose,
}: {
  direction: Direction;
  basePath: string;
  currentUserId: string;
  today: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(cashEntryInputSchema, (data) => ({
    direction,
    amountMinor: parseMoney(data.get('amount')),
    currency: data.get('currency'),
    date: data.get('date'),
    note: data.get('note'),
    personId: currentUserId,
  }));

  return (
    <form
      {...formProps(async (data) => {
        await api(`${basePath}/cash`, 'POST', data);
        onClose();
        router.refresh();
      })}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <TextField
          label={t('finance.transactions.amount')}
          name="amount"
          inputMode="decimal"
          autoFocus
          placeholder="0"
          error={errors['amountMinor']}
          className="text-lg font-semibold"
        />
        <SelectField label={t('finance.transactions.currency')} name="currency" defaultValue="UAH">
          {CURRENCIES.map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </SelectField>
      </div>
      <TextField
        label={t('finance.transactions.date')}
        name="date"
        type="date"
        defaultValue={today}
        error={errors['date']}
      />
      <TextField label={t('finance.transactions.note')} name="note" error={errors['note']} />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {direction === 'OUT' ? t('finance.cash.take') : t('finance.cash.put')}
        </Button>
      </div>
    </form>
  );
}
