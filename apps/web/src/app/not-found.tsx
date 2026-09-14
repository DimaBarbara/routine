import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="max-w-sm text-center">
        <p className="text-5xl font-semibold text-zinc-300 dark:text-zinc-700">404</p>
        <h1 className="mt-4 text-lg font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t('text')}</p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium underline">
          {t('home')}
        </Link>
      </Card>
    </main>
  );
}
