import { ChevronRight, Gift } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';
import { requireUser, spaceLabel } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('dashboard') };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [t, ts, tn] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('spaces'),
    getTranslations('nav'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('greeting', { name: user.name })}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t('signedInAs', { email: user.email })}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">{t('modules')}</h2>
        <Link
          href="/wishlists"
          className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          <Card className="flex items-center gap-4 transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-600">
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Gift className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{tn('wishlists')}</p>
              <p className="text-sm text-zinc-500">{t('wishlistsCard')}</p>
            </div>
            <ChevronRight className="size-5 text-zinc-400" aria-hidden />
          </Card>
        </Link>
      </section>

      <Card>
        <h2 className="mb-3 font-semibold">{t('spaces')}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {user.spaces.map((space) => (
            <li key={space.id} className="flex justify-between gap-4">
              <span>{spaceLabel(space, ts)}</span>
              <span className="text-zinc-500">{ts('members', { count: space.memberCount })}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
