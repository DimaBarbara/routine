import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';
import { requireUser, spaceLabel } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('dashboard') };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [t, ts] = await Promise.all([getTranslations('dashboard'), getTranslations('spaces')]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('greeting', { name: user.name })}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{t('signedInAs', { email: user.email })}</p>
      </div>
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
