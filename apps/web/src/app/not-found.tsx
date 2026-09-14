import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="bg-gradient-to-br from-violet-500 to-rose-400 bg-clip-text text-7xl font-bold text-transparent">
        404
      </p>
      <h1 className="mt-2 text-xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('text')}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        {t('home')}
      </Link>
    </main>
  );
}
