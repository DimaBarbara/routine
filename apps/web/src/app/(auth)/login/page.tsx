import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { getSessionUser, safeNextPath } from '@/lib/session';

import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('login') };
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const next = safeNextPath((await searchParams).next);

  // Перевірка тут, а не в proxy: протухла cookie інакше дала б нескінченний редірект.
  if (await getSessionUser()) redirect(next);

  const t = await getTranslations('login');
  return (
    <AuthShell title={t('title')}>
      <p className="mb-6 text-sm text-zinc-500">{t('subtitle')}</p>
      <LoginForm next={next} />
    </AuthShell>
  );
}
