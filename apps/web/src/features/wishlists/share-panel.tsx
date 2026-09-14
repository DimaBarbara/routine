'use client';

import type { WishlistShareLink } from '@routine/contracts';
import { Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useErrorText } from '@/hooks/use-error-text';
import { api } from '@/lib/api/client';

export function SharePanel({ basePath, shareUrl }: { basePath: string; shareUrl: string | null }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState<'enable' | 'disable' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(action: 'enable' | 'disable') {
    setBusy(action);
    setError(null);
    try {
      await api<WishlistShareLink>(`${basePath}/share`, action === 'enable' ? 'POST' : 'DELETE');
      setCopied(false);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-zinc-500" aria-hidden />
        <h2 className="font-semibold">{t('wishlists.share.title')}</h2>
      </div>
      <p className="text-sm text-zinc-500">
        {shareUrl ? t('wishlists.share.on') : t('wishlists.share.off')}
      </p>

      {shareUrl ? (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              aria-label={t('wishlists.share.title')}
              onFocus={(event) => event.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
            <Button
              size="sm"
              className="h-9"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
              }}
            >
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'enable'}
              onClick={() => change('enable')}
              title={t('wishlists.share.regenerateHint')}
            >
              {t('wishlists.share.regenerate')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy === 'disable'}
              onClick={() => change('disable')}
            >
              {t('wishlists.share.disable')}
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="secondary"
          loading={busy === 'enable'}
          onClick={() => change('enable')}
          className="w-fit"
        >
          {t('wishlists.share.enable')}
        </Button>
      )}

      {error && <Alert tone="error">{error}</Alert>}
    </Card>
  );
}
