'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/** Нативний <dialog>: фокус-пастка, Esc і inert-фон — від браузера, без бібліотек. */
export function Modal({ open, onClose, title, description, size = 'md', children }: Props) {
  const t = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-3xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        size === 'lg' ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="-m-1.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {/* Вміст монтується лише у відкритому стані — форма щоразу стартує з чистого аркуша. */}
        {open && children}
      </div>
    </dialog>
  );
}
