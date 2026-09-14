'use client';

import { AVATAR_SIZE_PX, type SessionUser } from '@routine/contracts';
import { Camera, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/hooks/use-error-text';
import { ApiError } from '@/lib/api/error';

/**
 * Квадрат по центру, 256px, JPEG — у браузері, до завантаження.
 * Із телефона фото важить мегабайти; на сервер іде кілька десятків КБ.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE_PX,
    AVATAR_SIZE_PX,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
      'image/jpeg',
      0.88,
    ),
  );
}

export function AvatarEditor({ user }: { user: SessionUser }) {
  const t = useTranslations('profile');
  const errorText = useErrorText();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(method: 'PUT' | 'DELETE', body?: FormData) {
    const response = await fetch('/api/profile/avatar', { method, body });
    if (!response.ok) throw await ApiError.fromResponse(response);
    router.refresh();
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy('upload');
    setError(null);
    try {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        setError(t('photoFailed'));
        return;
      }
      const form = new FormData();
      form.append('file', blob, 'avatar.jpg');
      await send('PUT', form);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative w-fit rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        aria-label={user.avatarUrl ? t('change') : t('upload')}
      >
        <Avatar id={user.id} name={user.name} src={user.avatarUrl} size="xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-6" aria-hidden />
        </span>
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={busy === 'upload'} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" aria-hidden /> {user.avatarUrl ? t('change') : t('upload')}
          </Button>
          {user.avatarUrl && (
            <Button
              size="sm"
              variant="ghost"
              loading={busy === 'remove'}
              onClick={async () => {
                setBusy('remove');
                setError(null);
                try {
                  await send('DELETE');
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden /> {t('remove')}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('photoHint')}</p>
        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        hidden
        onChange={onFile}
      />
    </div>
  );
}
