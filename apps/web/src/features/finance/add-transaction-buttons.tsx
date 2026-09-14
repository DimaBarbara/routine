'use client';

import type { FinancePerson, TransactionType } from '@routine/contracts';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { TransactionDialog } from './transaction-dialog';

interface Props {
  basePath: string;
  members: FinancePerson[];
  currentUserId: string;
  today: string;
}

export function AddTransactionButtons(props: Props) {
  const t = useTranslations('finance');
  const [open, setOpen] = useState<TransactionType | null>(null);

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setOpen('INCOME')}>
          <Plus className="size-4" aria-hidden /> {t('addIncome')}
        </Button>
        <Button onClick={() => setOpen('EXPENSE')}>
          <Minus className="size-4" aria-hidden /> {t('addExpense')}
        </Button>
      </div>
      <TransactionDialog
        {...props}
        open={open !== null}
        initialType={open ?? 'EXPENSE'}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
