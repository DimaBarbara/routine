'use client';

import type { WishItemDto } from '@routine/contracts';
import { Flame, Gift, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { forwardRef, type HTMLAttributes, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

import { CATEGORY_META } from './meta';

interface Props extends HTMLAttributes<HTMLDivElement> {
  item: WishItemDto;
  /** Показувати, для кого бажання (на дошці так, на публічній сторінці — ні). */
  showOwner?: boolean;
  dragging?: boolean;
  footer?: React.ReactNode;
}

export const WishCard = forwardRef<HTMLDivElement, Props>(function WishCard(
  { item, showOwner = true, dragging = false, footer, className, ...props },
  ref,
) {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const category = CATEGORY_META[item.category];
  const CategoryIcon = category.icon;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card transition',
        dragging && 'rotate-2 shadow-xl ring-2 ring-primary/40',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                category.chip,
              )}
            >
              <CategoryIcon className="size-3" aria-hidden />
              {t(`categories.${item.category}`)}
            </span>
            {item.priority === 'HIGH' && (
              <span
                title={t('priorities.HIGH')}
                className="inline-flex items-center text-orange-500"
              >
                <Flame className="size-3.5" aria-hidden />
                <span className="sr-only">{t('priorities.HIGH')}</span>
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm leading-snug font-medium break-words">{item.title}</p>
        </div>

        {item.imageUrl && !imageFailed && (
          // Довільні зовнішні URL від користувача: next/image вимагав би whitelist доменів.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setImageFailed(true)}
            className="size-12 shrink-0 rounded-xl bg-muted object-cover"
          />
        )}
      </div>

      {(item.priceMinor !== null || showOwner || item.reservation || item.doneKind) && (
        <div className="flex flex-wrap items-center gap-2">
          {item.priceMinor !== null && (
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(locale, item.priceMinor, item.currency)}
            </span>
          )}

          {item.doneKind && <Badge tone="green">{t(`doneKinds.${item.doneKind}`)}</Badge>}

          {item.reservation?.status === 'RESERVED_BY_YOU' && (
            <Badge tone="accent">
              <Gift className="size-3" aria-hidden /> {t('reservation.yours')}
            </Badge>
          )}
          {item.reservation?.status === 'RESERVED' && (
            <Badge tone="neutral">
              <Gift className="size-3" aria-hidden />
              {item.reservation.by
                ? t('reservation.reservedBy', { name: item.reservation.by })
                : t('reservation.reserved')}
            </Badge>
          )}

          {showOwner && (
            <span className="ml-auto">
              {item.owner ? (
                <Avatar id={item.owner.id} name={item.owner.name} size="xs" />
              ) : (
                <span
                  title={t('shared')}
                  className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
                >
                  <Users className="size-3" aria-hidden />
                  <span className="sr-only">{t('shared')}</span>
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {footer}
    </div>
  );
});
