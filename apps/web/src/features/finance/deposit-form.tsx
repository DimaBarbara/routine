'use client';

import {
  CURRENCIES,
  DEFAULT_DEPOSIT_TAX_BP,
  type DepositDto,
  depositInputSchema,
  type FinancePerson,
} from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ChoiceField, SelectField, TextField } from '@/components/ui/field';
import { SwitchField } from '@/components/ui/switch-field';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';
import { moneyInputValue, parseMoney, parsePercentBp } from '@/lib/money';

const NOBODY = '';

interface Props {
  deposit?: DepositDto;
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
  onDone: () => void;
}

/** Створення й редагування: при редагуванні початкова сума змінюється як звичайний внесок. */
export function DepositForm({ deposit, basePath, members, currentUserId, today, onDone }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [hasTerm, setHasTerm] = useState(Boolean(deposit?.termMonths));
  // Для редагування схема та сама, але initialAmountMinor підставляємо нулем і не надсилаємо.
  const { errors, formError, submitting, formProps } = useZodForm(depositInputSchema, (data) => ({
    name: data.get('name'),
    bank: data.get('bank'),
    currency: data.get('currency'),
    annualRateBp: parsePercentBp(data.get('rate')),
    taxRateBp: parsePercentBp(data.get('tax')),
    capitalization: data.get('capitalization') === 'on',
    deductFromIncome: data.get('deductFromIncome') === 'on',
    startDate: data.get('startDate'),
    termMonths: data.get('term') === 'fixed' ? Number(data.get('termMonths')) : null,
    initialAmountMinor: deposit ? 0 : (parseMoney(data.get('initial')) ?? 0),
    monthlyTopUpMinor: parseMoney(data.get('topUp')) ?? 0,
    topUpDay: Number(data.get('topUpDay')),
    personId: data.get('personId') === NOBODY ? null : data.get('personId'),
  }));

  const path = `${basePath}/deposits`;

  return (
    <form
      {...formProps(async ({ initialAmountMinor, ...data }) => {
        if (deposit) await api(`${path}/${deposit.id}`, 'PATCH', data);
        else await api(path, 'POST', { ...data, initialAmountMinor });
        onDone();
        router.refresh();
      })}
      onChangeCapture={(event) => {
        const { target } = event;
        if (target instanceof HTMLInputElement && target.name === 'term')
          setHasTerm(target.value === 'fixed');
      }}
      className="flex flex-col gap-5"
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('finance.deposits.form.name')}
          name="name"
          defaultValue={deposit?.name}
          placeholder={t('finance.deposits.form.namePlaceholder')}
          autoFocus={!deposit}
          error={errors['name']}
        />
        <TextField
          label={t('finance.deposits.form.bank')}
          name="bank"
          defaultValue={deposit?.bank ?? ''}
          error={errors['bank']}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={t('finance.deposits.form.rate')}
          name="rate"
          inputMode="decimal"
          defaultValue={deposit ? String(deposit.annualRateBp / 100) : ''}
          placeholder="15"
          error={errors['annualRateBp']}
        />
        <TextField
          label={t('finance.deposits.form.tax')}
          name="tax"
          inputMode="decimal"
          defaultValue={String((deposit?.taxRateBp ?? DEFAULT_DEPOSIT_TAX_BP) / 100)}
          error={errors['taxRateBp']}
        />
        <SelectField
          label={t('finance.deposits.form.currency')}
          name="currency"
          defaultValue={deposit?.currency ?? 'UAH'}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </SelectField>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{t('finance.deposits.form.taxHint')}</p>

      <ChoiceField
        label={t('finance.deposits.form.capitalization')}
        name="capitalization"
        variant="segmented"
        defaultValue={deposit && !deposit.capitalization ? 'off' : 'on'}
        options={[
          { value: 'on', label: t('finance.deposits.form.capitalizationOn') },
          { value: 'off', label: t('finance.deposits.form.capitalizationOff') },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker
          label={t('finance.deposits.form.start')}
          name="startDate"
          defaultValue={deposit?.startDate ?? today}
          error={errors['startDate']}
        />
        <ChoiceField
          label={t('finance.deposits.form.term')}
          name="term"
          variant="segmented"
          defaultValue={hasTerm ? 'fixed' : 'open'}
          options={[
            { value: 'open', label: t('finance.deposits.form.termOpen') },
            { value: 'fixed', label: t('finance.deposits.form.termFixed') },
          ]}
        />
      </div>

      {hasTerm && (
        <TextField
          label={t('finance.deposits.form.termMonths')}
          name="termMonths"
          type="number"
          min={1}
          max={600}
          defaultValue={deposit?.termMonths ?? 12}
          error={errors['termMonths']}
        />
      )}

      <div className={deposit ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-3'}>
        {!deposit && (
          <TextField
            label={t('finance.deposits.form.initial')}
            name="initial"
            inputMode="decimal"
            placeholder="0"
            error={errors['initialAmountMinor']}
          />
        )}
        <TextField
          label={t('finance.deposits.form.topUp')}
          name="topUp"
          inputMode="decimal"
          defaultValue={moneyInputValue(deposit?.monthlyTopUpMinor ?? null)}
          placeholder="0"
          hint={t('finance.deposits.form.topUpHint')}
          error={errors['monthlyTopUpMinor']}
        />
        <TextField
          label={t('finance.deposits.form.topUpDay')}
          name="topUpDay"
          type="number"
          min={1}
          max={31}
          defaultValue={deposit?.topUpDay ?? Number(today.slice(8, 10))}
          error={errors['topUpDay']}
        />
      </div>
      <SwitchField
        label={t('finance.deposits.form.deduct')}
        hint={t('finance.deposits.form.deductHint')}
        name="deductFromIncome"
        defaultChecked={deposit?.deductFromIncome ?? true}
      />

      <SelectField
        label={t('finance.deposits.form.person')}
        name="personId"
        defaultValue={deposit ? (deposit.person?.id ?? NOBODY) : currentUserId}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
        <option value={NOBODY}>{t('finance.transactions.nobody')}</option>
      </SelectField>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {deposit ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
