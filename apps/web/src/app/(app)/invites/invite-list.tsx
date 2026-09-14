'use client';

import type { InviteStatus, InviteSummary } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/hooks/use-error-text';
import { api } from '@/lib/api/client';

const STATUS_TONE: Record<InviteStatus, 'green' | 'amber' | 'red' | 'neutral'> = {
  PENDING: 'amber',
  ACCEPTED: 'green',
  REVOKED: 'neutral',
  EXPIRED: 'red',
};

/** expiresLabel форматує сервер: Intl у Node і браузері дає різний текст — гідратація впала б. */
export type InviteRow = InviteSummary & { expiresLabel: string };

export function InviteList({ invites }: { invites: InviteRow[] }) {
  const t = useTranslations('invites');
  const errorText = useErrorText();
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string) {
    setRevoking(id);
    setError(null);
    try {
      await api(`/invites/${id}`, 'DELETE');
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRevoking(null);
    }
  }

  if (invites.length === 0) return <p className="text-sm text-zinc-500">{t('empty')}</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="text-xs text-zinc-500">
                {invite.space ? t('toSpace') : t('separateAccount')} ·{' '}
                {t('until', { date: invite.expiresLabel })}
              </p>
            </div>
            <Badge tone={STATUS_TONE[invite.status]}>{t(`status.${invite.status}`)}</Badge>
            {invite.status === 'PENDING' && (
              <Button
                variant="danger"
                size="sm"
                loading={revoking === invite.id}
                onClick={() => revoke(invite.id)}
              >
                {t('revoke')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
