'use client';

import type { InviteStatus, InviteSummary } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/error';

const STATUS: Record<InviteStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'neutral' }> =
  {
    PENDING: { label: 'очікує', tone: 'amber' },
    ACCEPTED: { label: 'прийнято', tone: 'green' },
    REVOKED: { label: 'відкликано', tone: 'neutral' },
    EXPIRED: { label: 'прострочено', tone: 'red' },
  };

const dateFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' });

export function InviteList({ invites }: { invites: InviteSummary[] }) {
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
      setError(errorMessage(err));
    } finally {
      setRevoking(null);
    }
  }

  if (invites.length === 0) {
    return <p className="text-sm text-zinc-500">Ви ще нікого не запрошували.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="text-xs text-zinc-500">
                {invite.space ? 'У простір' : 'Окремий акаунт'} · до{' '}
                {dateFormat.format(new Date(invite.expiresAt))}
              </p>
            </div>
            <Badge tone={STATUS[invite.status].tone}>{STATUS[invite.status].label}</Badge>
            {invite.status === 'PENDING' && (
              <Button
                variant="danger"
                size="sm"
                loading={revoking === invite.id}
                onClick={() => revoke(invite.id)}
              >
                Відкликати
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
