'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

interface Props {
  redirectTo?: string;
  variant?: 'ghost' | 'secondary' | 'icon';
}

export function LogoutButton({ redirectTo = '/login', variant = 'ghost' }: Props) {
  const t = useTranslations('nav');
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

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        loading={loading}
        aria-label={t('logout')}
        title={t('logout')}
      >
        {!loading && <LogOut className="size-4" aria-hidden />}
      </Button>
    );
  }

  return (
    <Button variant={variant} size="sm" onClick={logout} loading={loading}>
      {t('logout')}
    </Button>
  );
}
