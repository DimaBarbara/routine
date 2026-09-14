'use client';

import type { AcceptInviteResult } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/error';

export function AcceptInvite({ token, spaceId }: { token: string; spaceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      await api<AcceptInviteResult>('/invites/accept', 'POST', { token });
      router.replace(`/dashboard?space=${spaceId}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Button onClick={accept} loading={loading}>
        Прийняти запрошення
      </Button>
    </div>
  );
}
