import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { requireUser, spaceLabel } from '@/lib/session';

export const metadata: Metadata = { title: 'Дашборд' };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Привіт, {user.name} 👋</h1>
        <p className="mt-1 text-sm text-zinc-500">Ви увійшли як {user.email}.</p>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Ваші простори</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {user.spaces.map((space) => (
            <li key={space.id} className="flex justify-between">
              <span>{spaceLabel(space)}</span>
              <span className="text-zinc-500">учасників: {space.memberCount}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
