'use client';

import type { WishReservationView } from '@routine/contracts';
import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  reservation: WishReservationView;
  busy: boolean;
  onReserve: () => void;
  onCancel: () => void;
}

export function ReservationStatus({ reservation, busy, onReserve, onCancel }: Props) {
  const t = useTranslations('wishlists.reservation');

  if (reservation.status === 'FREE') {
    return (
      <Button variant="secondary" size="sm" onClick={onReserve} loading={busy} className="w-full">
        <Gift className="size-4" aria-hidden /> {t('reserve')}
      </Button>
    );
  }

  if (reservation.status === 'RESERVED_BY_YOU') {
    return (
      <div className="flex items-center justify-between gap-2">
        <Badge tone="green">{t('yours')}</Badge>
        <Button variant="ghost" size="sm" onClick={onCancel} loading={busy}>
          {t('cancel')}
        </Button>
      </div>
    );
  }

  return (
    <span className="self-start">
      <Badge tone="neutral">
        {reservation.by ? t('reservedBy', { name: reservation.by }) : t('reserved')}
      </Badge>
    </span>
  );
}
