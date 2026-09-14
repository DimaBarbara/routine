import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { getSessionUser, safeNextPath } from '@/lib/session';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Вхід' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const next = safeNextPath((await searchParams).next);

  // Перевірка тут, а не в proxy: протухла cookie інакше дала б нескінченний редірект.
  if (await getSessionUser()) redirect(next);

  return (
    <Card>
      <h1 className="text-lg font-semibold">Вхід</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">Реєстрація — лише за запрошенням.</p>
      <LoginForm next={next} />
    </Card>
  );
}
