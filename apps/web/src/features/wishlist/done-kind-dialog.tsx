'use client';

import type { WishDoneKind } from '@routine/contracts';
import { Gift, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';

interface Props {
  title: string | null;
  onChoose: (kind: WishDoneKind) => void;
  onCancel: () => void;
}

/** Після перетягування у «Виконано»: одне питання, два великі варіанти. */
export function DoneKindDialog({ title, onChoose, onCancel }: Props) {
  const t = useTranslations('wishlist');

  const options = [
    {
      kind: 'BOUGHT' as const,
      icon: ShoppingBag,
      tone: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
    },
    {
      kind: 'GIFTED' as const,
      icon: Gift,
      tone: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
    },
  ];

  return (
    <Modal
      open={title !== null}
      onClose={onCancel}
      title={t('done.title')}
      description={title ? t('done.description', { title }) : undefined}
    >
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ kind, icon: Icon, tone }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChoose(kind)}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border p-5 font-medium transition hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            {t(`doneKinds.${kind}`)}
          </button>
        ))}
      </div>
    </Modal>
  );
}
