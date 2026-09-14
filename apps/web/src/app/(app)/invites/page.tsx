import type { InviteSummary } from '@routine/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';
import { serverApi } from '@/lib/api/server';
import { requireUser, spaceLabel } from '@/lib/session';
import { canInvite } from '@/lib/space';

import { CreateInviteForm } from './create-invite-form';
import { InviteList } from './invite-list';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('invites') };
}

export default async function InvitesPage() {
  const user = await requireUser();
  // Учасник без власного простору нікого запросити не може — сторінка йому не потрібна.
  if (!canInvite(user)) redirect('/dashboard');
  const [invites, t, ts, format] = await Promise.all([
    serverApi<InviteSummary[]>('/invites'),
    getTranslations('invites'),
    getTranslations('spaces'),
    getFormatter(),
  ]);
  const rows = invites.map((invite) => ({
    ...invite,
    expiresLabel: format.dateTime(new Date(invite.expiresAt), { dateStyle: 'medium' }),
  }));

  const targets = user.spaces
    .filter((space) => space.role === 'OWNER')
    .map((space) => ({ id: space.id, label: spaceLabel(space, ts) }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.isAdmin ? t('descriptionAdmin') : t('description')}
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">{t('newTitle')}</h2>
        <CreateInviteForm isAdmin={user.isAdmin} targets={targets} />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">{t('sentTitle')}</h2>
        <InviteList invites={rows} />
      </Card>
    </div>
  );
}
