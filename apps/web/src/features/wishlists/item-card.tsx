'use client';

import type { WishlistItemDto } from '@routine/contracts';
import { ExternalLink, ImageOff } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

import { formatPrice } from './price';

const PRIORITY_TONE = { HIGH: 'amber', MEDIUM: 'neutral', LOW: 'neutral' } as const;

interface Props {
  item: WishlistItemDto;
  /** Резервація або дії — залежить від того, хто і де дивиться. */
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ItemCard({ item, footer, actions }: Props) {
  const t = useTranslations('wishlists.item');
  const locale = useLocale();
  const [imageFailed, setImageFailed] = useState(false);
  const isReservedByOthers = item.reservation?.status === 'RESERVED';

  return (
    <Card className={cn('flex flex-col overflow-hidden p-0', isReservedByOthers && 'opacity-70')}>
      {item.imageUrl && (
        <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
          {imageFailed ? (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <ImageOff className="size-8" aria-hidden />
            </div>
          ) : (
            // Довільні зовнішні URL від користувача: next/image вимагав би whitelist доменів.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium break-words">{item.title}</h3>
          {item.priority !== 'MEDIUM' && (
            <Badge tone={PRIORITY_TONE[item.priority]}>{t(`priorities.${item.priority}`)}</Badge>
          )}
        </div>

        {item.priceMinor !== null && (
          <p className="text-lg font-semibold tabular-nums">
            {formatPrice(locale, item.priceMinor, item.currency)}
          </p>
        )}

        {item.note && (
          <p className="text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">
            {item.note}
          </p>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            {t('open')} <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">({new URL(item.url).hostname})</span>
          </a>
        )}

        {(footer ?? actions) && (
          <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {footer}
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}
