'use client';

import {
  CURRENCIES,
  type FinancePerson,
  type RecurringIncomeDto,
  recurringIncomeInputSchema,
} from '@routine/contracts';
import { Pause, Play, Plus, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { DatePicker } from '@/components/ui/date-picker';
import { SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';
import { formatMoney, moneyInputValue, parseMoney } from '@/lib/money';

const NOBODY = '';

interface Props {
  rules: RecurringIncomeDto[];
  /** Підписи наступних дат форматує сервер. */
  nextLabels: Record<string, string>;
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
}

export function RecurringIncomes({
  rules,
  nextLabels,
  basePath,
  members,
  currentUserId,
  today,
}: Props) {
  const t = useTranslations('finance.recurring');
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorText();
  const [editing, setEditing] = useState<RecurringIncomeDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function togglePause(rule: RecurringIncomeDto) {
    setError(null);
    try {
      await api(`${basePath}/recurring-incomes/${rule.id}`, 'PATCH', { paused: !rule.paused });
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('hint')}</p>
        </div>
        <Button size="sm" variant="soft" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden /> {t('add')}
        </Button>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <Repeat className="size-4" aria-hidden />
              </span>
              <button
                type="button"
                onClick={() => setEditing(rule)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{rule.title}</span>
                  {rule.paused && <Badge tone="amber">{t('paused')}</Badge>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatMoney(locale, rule.amountMinor, rule.currency)} ·{' '}
                  {t('every', { day: rule.dayOfMonth })}
                  {nextLabels[rule.id] && ` · ${t('next', { date: nextLabels[rule.id]! })}`}
                </span>
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => togglePause(rule)}
                aria-label={rule.paused ? t('resume') : t('pause')}
                title={rule.paused ? t('resume') : t('pause')}
              >
                {rule.paused ? (
                  <Play className="size-4" aria-hidden />
                ) : (
                  <Pause className="size-4" aria-hidden />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t('formTitle')}>
        <RecurringForm
          rule={editing === 'new' ? undefined : (editing ?? undefined)}
          basePath={basePath}
          members={members}
          currentUserId={currentUserId}
          today={today}
          onClose={() => setEditing(null)}
        />
      </Modal>
    </section>
  );
}

function RecurringForm({
  rule,
  basePath,
  members,
  currentUserId,
  today,
  onClose,
}: {
  rule?: RecurringIncomeDto;
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const errorText = useErrorText();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const path = `${basePath}/recurring-incomes`;

  const { errors, formError, submitting, formProps } = useZodForm(
    recurringIncomeInputSchema,
    (data) => ({
      title: data.get('title'),
      amountMinor: parseMoney(data.get('amount')),
      currency: data.get('currency'),
      dayOfMonth: Number(data.get('dayOfMonth')),
      startDate: data.get('startDate'),
      endDate: data.get('endDate'),
      personId: data.get('personId') === NOBODY ? null : data.get('personId'),
    }),
  );

  return (
    <form
      {...formProps(async (data) => {
        if (rule) await api(`${path}/${rule.id}`, 'PATCH', data);
        else await api(path, 'POST', data);
        onClose();
        router.refresh();
      })}
      className="flex flex-col gap-4"
    >
      {(formError ?? deleteError) && <Alert tone="error">{formError ?? deleteError}</Alert>}
      <TextField
        label={t('finance.recurring.name')}
        name="title"
        defaultValue={rule?.title}
        placeholder={t('finance.recurring.namePlaceholder')}
        autoFocus={!rule}
        error={errors['title']}
      />
      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <TextField
          label={t('finance.transactions.amount')}
          name="amount"
          inputMode="decimal"
          defaultValue={moneyInputValue(rule?.amountMinor ?? null)}
          error={errors['amountMinor']}
        />
        <SelectField
          label={t('finance.transactions.currency')}
          name="currency"
          defaultValue={rule?.currency ?? 'UAH'}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('finance.recurring.day')}
          name="dayOfMonth"
          type="number"
          min={1}
          max={31}
          defaultValue={rule?.dayOfMonth ?? Number(today.slice(8, 10))}
          hint={t('finance.recurring.dayHint')}
          error={errors['dayOfMonth']}
        />
        <SelectField
          label={t('finance.transactions.person')}
          name="personId"
          defaultValue={rule ? (rule.person?.id ?? NOBODY) : currentUserId}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
          <option value={NOBODY}>{t('finance.transactions.nobody')}</option>
        </SelectField>
        <DatePicker
          label={t('finance.recurring.start')}
          name="startDate"
          defaultValue={rule?.startDate ?? today}
          error={errors['startDate']}
        />
        <DatePicker
          label={t('finance.recurring.end')}
          name="endDate"
          optional
          defaultValue={rule?.endDate ?? null}
          error={errors['endDate']}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {rule ? (
          <ConfirmAction
            label={t('common.delete')}
            question={t('finance.recurring.deleteConfirm')}
            onConfirm={async () => {
              try {
                await api(`${path}/${rule.id}`, 'DELETE');
                onClose();
                router.refresh();
              } catch (error) {
                setDeleteError(errorText(error));
              }
            }}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {rule ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </div>
    </form>
  );
}
