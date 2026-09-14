'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

interface Props {
  redirectTo?: string;
  variant?: 'ghost' | 'secondary';
}

export function LogoutButton({ redirectTo = '/login', variant = 'ghost' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await api('/auth/logout', 'POST');
    } finally {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={logout} loading={loading}>
      Вийти
    </Button>
  );
}
