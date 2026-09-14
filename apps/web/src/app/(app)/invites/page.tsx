import type { InviteSummary } from '@routine/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';
import { serverApi } from '@/lib/api/server';
import { requireUser, spaceLabel } from '@/lib/session';

import { CreateInviteForm } from './create-invite-form';
import { InviteList } from './invite-list';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('invites') };
}

export default async function InvitesPage() {
  const user = await requireUser();
  const [invites, t, ts] = await Promise.all([
    serverApi<InviteSummary[]>('/invites'),
    getTranslations('invites'),
    getTranslations('spaces'),
  ]);

  const targets = user.spaces
    .filter((space) => space.role === 'OWNER')
    .map((space) => ({ id: space.id, label: spaceLabel(space, ts) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {user.isAdmin ? t('descriptionAdmin') : t('description')}
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t('newTitle')}</h2>
        <CreateInviteForm isAdmin={user.isAdmin} targets={targets} />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">{t('sentTitle')}</h2>
        <InviteList invites={invites} />
      </Card>
    </div>
  );
}
