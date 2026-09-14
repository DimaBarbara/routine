import type { InvitePreview } from '@routine/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';

import { LogoutButton } from '@/components/logout-button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/error';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/session';

import { AcceptInvite } from './accept-invite';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Запрошення' };

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params;

  let preview: InvitePreview;
  try {
    preview = await serverApi<InvitePreview>(`/invites/preview/${encodeURIComponent(token)}`);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) throw error;
    return (
      <Shell title="Запрошення недійсне">
        <p className="text-sm text-zinc-500">{error.message}. Попросіть надіслати нове.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium underline">
          До входу
        </Link>
      </Shell>
    );
  }

  const user = await getSessionUser();
  const intro = preview.spaceName ? (
    <>
      <b>{preview.invitedBy}</b> запрошує вас до свого простору.
    </>
  ) : (
    <>
      <b>{preview.invitedBy}</b> запрошує вас створити акаунт.
    </>
  );

  if (user && user.email !== preview.email) {
    return (
      <Shell title="Запрошення для іншої пошти">
        <p className="text-sm text-zinc-500">
          Ви увійшли як <b>{user.email}</b>, а запрошення надіслане на <b>{preview.email}</b>.
          Вийдіть і відкрийте посилання знову.
        </p>
        <div className="mt-6">
          <LogoutButton redirectTo={`/invite/${token}`} variant="secondary" />
        </div>
      </Shell>
    );
  }

  if (user) {
    return (
      <Shell title="Запрошення">
        <p className="mb-6 text-sm text-zinc-500">{intro}</p>
        {preview.spaceId ? (
          <AcceptInvite token={token} spaceId={preview.spaceId} />
        ) : (
          <p className="text-sm">
            У вас уже є акаунт.{' '}
            <Link href="/dashboard" className="font-medium underline">
              На дашборд
            </Link>
          </p>
        )}
      </Shell>
    );
  }

  if (preview.accountExists) {
    return (
      <Shell title="Запрошення">
        <p className="mb-6 text-sm text-zinc-500">
          {intro} Акаунт для <b>{preview.email}</b> уже існує — увійдіть, щоб прийняти.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Увійти
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Створення акаунта">
      <p className="mb-6 text-sm text-zinc-500">{intro}</p>
      <RegisterForm token={token} email={preview.email} spaceId={preview.spaceId} />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-2xl font-semibold tracking-tight">routine</p>
        <Card>
          <h1 className="mb-1 text-lg font-semibold">{title}</h1>
          {children}
        </Card>
      </div>
    </main>
  );
}
