'use client';

import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  type FinancePerson,
  INCOME_KINDS,
  type TransactionDto,
  transactionInputSchema,
  type TransactionType,
} from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { DatePicker } from '@/components/ui/date-picker';
import { ChoiceField, SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';
import { moneyInputValue, parseMoney } from '@/lib/money';

import { EXPENSE_META, INCOME_META } from './meta';

const NOBODY = '';

interface Props {
  open: boolean;
  onClose: () => void;
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
  initialType?: TransactionType;
  transaction?: TransactionDto;
}

export function TransactionDialog({
  open,
  onClose,
  transaction,
  initialType = 'EXPENSE',
  ...props
}: Props) {
  const t = useTranslations('finance.transactions');
  const type = transaction?.type ?? initialType;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={transaction ? t('editTitle') : type === 'EXPENSE' ? t('newExpense') : t('newIncome')}
    >
      <TransactionForm transaction={transaction} initialType={type} onClose={onClose} {...props} />
    </Modal>
  );
}

function TransactionForm({
  basePath,
  members,
  currentUserId,
  today,
  initialType,
  transaction,
  onClose,
}: Omit<Props, 'open'> & { initialType: TransactionType }) {
  const t = useTranslations();
  const router = useRouter();
  const errorText = useErrorText();
  const [type, setType] = useState<TransactionType>(initialType);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { errors, formError, submitting, formProps } = useZodForm(
    transactionInputSchema,
    (data) => ({
      type: data.get('type'),
      amountMinor: parseMoney(data.get('amount')),
      currency: data.get('currency'),
      date: data.get('date'),
      note: data.get('note'),
      personId: data.get('personId') === NOBODY ? null : data.get('personId'),
      ...(data.get('type') === 'EXPENSE'
        ? { category: data.get('category') ?? undefined }
        : { incomeKind: data.get('incomeKind') ?? undefined }),
    }),
  );

  const path = `${basePath}/transactions`;

  return (
    <form
      {...formProps(async (data) => {
        if (transaction) await api(`${path}/${transaction.id}`, 'PATCH', data);
        else await api(path, 'POST', data);
        onClose();
        router.refresh();
      })}
      onChangeCapture={(event) => {
        const { target } = event;
        if (target instanceof HTMLInputElement && target.name === 'type') {
          setType(target.value as TransactionType);
        }
      }}
      className="flex flex-col gap-5"
    >
      {(formError ?? deleteError) && <Alert tone="error">{formError ?? deleteError}</Alert>}

      <ChoiceField
        label={t('finance.transactions.editTitle')}
        name="type"
        variant="segmented"
        defaultValue={type}
        options={[
          { value: 'EXPENSE', label: t('finance.transactions.expense') },
          { value: 'INCOME', label: t('finance.transactions.income') },
        ]}
      />

      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <TextField
          label={t('finance.transactions.amount')}
          name="amount"
          inputMode="decimal"
          autoFocus={!transaction}
          defaultValue={moneyInputValue(transaction?.amountMinor ?? null)}
          placeholder="0"
          error={errors['amountMinor']}
          className="text-lg font-semibold"
        />
        <SelectField
          label={t('finance.transactions.currency')}
          name="currency"
          defaultValue={transaction?.currency ?? 'UAH'}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </SelectField>
      </div>

      {type === 'EXPENSE' ? (
        <ChoiceField
          key="category"
          label={t('finance.transactions.category')}
          name="category"
          defaultValue={transaction?.category ?? undefined}
          error={errors['category']}
          options={EXPENSE_CATEGORIES.map((category) => {
            const Icon = EXPENSE_META[category].icon;
            return {
              value: category,
              label: t(`finance.categories.${category}`),
              icon: <Icon className="size-3.5" aria-hidden />,
            };
          })}
        />
      ) : (
        <ChoiceField
          key="incomeKind"
          label={t('finance.transactions.kind')}
          name="incomeKind"
          variant="segmented"
          defaultValue={transaction?.incomeKind ?? 'UNPLANNED'}
          error={errors['incomeKind']}
          options={INCOME_KINDS.map((kind) => {
            const Icon = INCOME_META[kind].icon;
            return {
              value: kind,
              label: t(`finance.incomeKinds.${kind}`),
              icon: <Icon className="size-3.5" aria-hidden />,
            };
          })}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <DatePicker
          label={t('finance.transactions.date')}
          name="date"
          defaultValue={transaction?.date ?? today}
          error={errors['date']}
        />
        <SelectField
          label={t('finance.transactions.person')}
          name="personId"
          defaultValue={transaction ? (transaction.person?.id ?? NOBODY) : currentUserId}
          error={errors['personId']}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
          <option value={NOBODY}>{t('finance.transactions.nobody')}</option>
        </SelectField>
      </div>

      <TextField
        label={t('finance.transactions.note')}
        name="note"
        defaultValue={transaction?.note ?? ''}
        placeholder={
          type === 'EXPENSE'
            ? t('finance.transactions.notePlaceholderExpense')
            : t('finance.transactions.notePlaceholderIncome')
        }
        error={errors['note']}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {transaction ? (
          <ConfirmAction
            label={t('common.delete')}
            question={t('finance.transactions.deleteConfirm')}
            onConfirm={async () => {
              try {
                await api(`${path}/${transaction.id}`, 'DELETE');
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
            {transaction ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </div>
    </form>
  );
}
