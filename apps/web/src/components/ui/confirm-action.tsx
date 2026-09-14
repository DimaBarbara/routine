'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from './button';

interface Props {
  label: React.ReactNode;
  question: string;
  onConfirm: () => Promise<void>;
  size?: 'sm' | 'md';
}

/** Двокрокове видалення замість window.confirm: питання зʼявляється поруч із кнопкою. */
export function ConfirmAction({ label, question, onConfirm, size = 'sm' }: Props) {
  const t = useTranslations('common');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="danger" size={size} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div role="group" aria-label={question} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{question}</span>
      <Button
        variant="danger"
        size={size}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
      >
        {t('confirmDelete')}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)} disabled={busy}>
        {t('cancel')}
      </Button>
    </div>
  );
}
