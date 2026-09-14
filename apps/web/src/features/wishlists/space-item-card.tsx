'use client';

import type { WishlistItemDto } from '@routine/contracts';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { useErrorText } from '@/hooks/use-error-text';
import { api } from '@/lib/api/client';

import { ItemCard } from './item-card';
import { ItemDialog } from './item-dialog';
import { ReservationStatus } from './reservation-status';

/** Бажання всередині простору: учасники редагують і резервують. */
export function SpaceItemCard({ item, basePath }: { item: WishlistItemDto; basePath: string }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const reservationPath = `${basePath}/items/${item.id}/reservation`;

  return (
    <>
      <ItemCard
        item={item}
        footer={
          <>
            {item.reservation && (
              <ReservationStatus
                reservation={item.reservation}
                busy={busy}
                onReserve={() => run(() => api(reservationPath, 'POST'))}
                onCancel={() => run(() => api(reservationPath, 'DELETE'))}
              />
            )}
            {error && <Alert tone="error">{error}</Alert>}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" aria-hidden /> {t('common.edit')}
            </Button>
            <ConfirmAction
              label={t('common.delete')}
              question={t('wishlists.item.deleteConfirm')}
              onConfirm={() => run(() => api(`${basePath}/items/${item.id}`, 'DELETE'))}
            />
          </div>
        }
      />
      <ItemDialog
        open={editing}
        onClose={() => setEditing(false)}
        basePath={basePath}
        item={item}
      />
    </>
  );
}
