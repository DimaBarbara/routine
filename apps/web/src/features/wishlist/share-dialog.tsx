'use client';

import type { WishShareLinkDto } from '@routine/contracts';
import { Check, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { api } from '@/lib/api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  basePath: string;
  shareUrl: string | null;
}

export function ShareDialog({ open, onClose, basePath, shareUrl }: Props) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [url, setUrl] = useState(shareUrl);
  const [busy, setBusy] = useState<'enable' | 'disable' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(action: 'enable' | 'disable') {
    setBusy(action);
    setError(null);
    try {
      const link = await api<WishShareLinkDto>(
        `${basePath}/share`,
        action === 'enable' ? 'POST' : 'DELETE',
      );
      setUrl(link.shareUrl);
      setCopied(false);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('wishlist.share.title')}
      description={url ? t('wishlist.share.on') : t('wishlist.share.off')}
    >
      <div className="flex flex-col gap-4">
        {url ? (
          <>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                aria-label={t('wishlist.share.title')}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-muted px-3 font-mono text-xs"
              />
              <Button
                className="h-10"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                }}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy === 'enable'}
                onClick={() => change('enable')}
                title={t('wishlist.share.regenerateHint')}
              >
                {t('wishlist.share.regenerate')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busy === 'disable'}
                onClick={() => change('disable')}
              >
                {t('wishlist.share.disable')}
              </Button>
            </div>
          </>
        ) : (
          <Button loading={busy === 'enable'} onClick={() => change('enable')}>
            {t('wishlist.share.enable')}
          </Button>
        )}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  );
}
