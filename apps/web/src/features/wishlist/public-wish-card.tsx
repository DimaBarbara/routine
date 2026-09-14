'use client';

import {
  guestReservationSchema,
  type SharedWishViewer,
  type WishItemDto,
} from '@routine/contracts';
import { ExternalLink, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

import { WishCard } from './wish-card';

const GUEST_NAME_KEY = 'routine:guest-name';

interface Props {
  item: WishItemDto;
  token: string;
  viewer: SharedWishViewer;
  ownerName: string;
}

/** Бажання на публічній сторінці: лише резервації, без редагування. */
export function PublicWishCard({ item, token, viewer, ownerName }: Props) {
  const t = useTranslations('wishlist');
  const errorText = useErrorText();
  const router = useRouter();
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `/shared/wishlist/${token}/items/${item.id}/reservation`;

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

  const reservation = item.reservation;

  return (
    <WishCard
      item={item}
      showOwner={false}
      className="h-full"
      footer={
        <div className="mt-auto flex flex-col gap-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t('item.open')} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}

          {reservation?.status === 'FREE' &&
            (askName ? (
              <GuestNameForm
                ownerName={ownerName}
                onCancel={() => setAskName(false)}
                onSubmit={(guestName) => run(() => api(path, 'POST', { guestName }))}
              />
            ) : (
              <Button
                variant="soft"
                loading={busy}
                onClick={() =>
                  viewer === 'GUEST' ? setAskName(true) : run(() => api(path, 'POST', {}))
                }
              >
                <Gift className="size-4" aria-hidden /> {t('reservation.reserve')}
              </Button>
            ))}

          {reservation?.status === 'RESERVED_BY_YOU' && (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => run(() => api(path, 'DELETE'))}
            >
              {t('reservation.cancel')}
            </Button>
          )}

          {error && <Alert tone="error">{error}</Alert>}
        </div>
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
  // Форма зʼявляється лише після кліку — localStorage читаємо вже в браузері, без розбіжностей.
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
        label={t('wishlist.reservation.guestName')}
        name="guestName"
        defaultValue={savedName}
        autoComplete="given-name"
        autoFocus
        hint={t('wishlist.reservation.guestHint', { owner: ownerName })}
        error={errors['guestName']}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} className="flex-1">
          {t('wishlist.reservation.reserve')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
