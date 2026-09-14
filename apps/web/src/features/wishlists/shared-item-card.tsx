'use client';

import {
  guestReservationSchema,
  type SharedWishlistViewer,
  type WishlistItemDto,
} from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

import { ItemCard } from './item-card';
import { ReservationStatus } from './reservation-status';

const GUEST_NAME_KEY = 'routine:guest-name';

interface Props {
  item: WishlistItemDto;
  token: string;
  viewer: SharedWishlistViewer;
  ownerName: string;
}

/** Бажання на публічній сторінці: лише резервації, без редагування. */
export function SharedItemCard({ item, token, viewer, ownerName }: Props) {
  const errorText = useErrorText();
  const router = useRouter();
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `/shared/wishlists/${token}/items/${item.id}/reservation`;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setAskName(false);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ItemCard
      item={item}
      footer={
        item.reservation && (
          <>
            {askName ? (
              <GuestNameForm
                ownerName={ownerName}
                onCancel={() => setAskName(false)}
                onSubmit={(guestName) =>
                  api(path, 'POST', { guestName }).then(() => router.refresh())
                }
              />
            ) : (
              <ReservationStatus
                reservation={item.reservation}
                busy={busy}
                onReserve={() =>
                  viewer === 'GUEST' ? setAskName(true) : run(() => api(path, 'POST', {}))
                }
                onCancel={() => run(() => api(path, 'DELETE'))}
              />
            )}
            {error && <Alert tone="error">{error}</Alert>}
          </>
        )
      }
    />
  );
}

function GuestNameForm({
  ownerName,
  onSubmit,
  onCancel,
}: {
  ownerName: string;
  onSubmit: (guestName: string) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const { errors, formError, submitting, formProps } = useZodForm(
    guestReservationSchema.required(),
  );
  // Читаємо лише в браузері й лише коли форма відкрита — без розбіжностей гідратації.
  const [savedName] = useState(() => {
    try {
      return localStorage.getItem(GUEST_NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });

  return (
    <form
      {...formProps(async ({ guestName }) => {
        try {
          localStorage.setItem(GUEST_NAME_KEY, guestName);
        } catch {
          // приватний режим — не страшно
        }
        await onSubmit(guestName);
      })}
      className="flex flex-col gap-3"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label={t('wishlists.reservation.guestName')}
        name="guestName"
        defaultValue={savedName}
        autoComplete="given-name"
        autoFocus
        hint={t('wishlists.reservation.guestHint', { owner: ownerName })}
        error={errors['guestName']}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} className="flex-1">
          {t('wishlists.reservation.reserve')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
