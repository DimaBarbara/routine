import type { InviteSummary } from '@routine/contracts';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { serverApi } from '@/lib/api/server';
import { requireUser, spaceLabel } from '@/lib/session';

import { CreateInviteForm } from './create-invite-form';
import { InviteList } from './invite-list';

export const metadata: Metadata = { title: 'Запрошення' };

export default async function InvitesPage() {
  const user = await requireUser();
  const invites = await serverApi<InviteSummary[]>('/invites');

  const targets = user.spaces
    .filter((space) => space.role === 'OWNER')
    .map((space) => ({ id: space.id, label: spaceLabel(space) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Запрошення</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {user.isAdmin
            ? 'Запросіть людину у свій простір — вона бачитиме й редагуватиме ваші дані. Або створіть їй окремий акаунт із власним простором.'
            : 'Запросіть людину у свій простір — вона бачитиме й редагуватиме ваші дані.'}
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Нове запрошення</h2>
        <CreateInviteForm isAdmin={user.isAdmin} targets={targets} />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Надіслані</h2>
        <InviteList invites={invites} />
      </Card>
    </div>
  );
}
