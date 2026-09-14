import type { InvitePreview } from '@routine/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { LogoutButton } from '@/components/logout-button';
import { ApiError } from '@/lib/api/error';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/session';

import { AcceptInvite } from './accept-invite';
import { RegisterForm } from './register-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('invite') };
}

const bold = (chunks: React.ReactNode) => <b>{chunks}</b>;

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params;
  const t = await getTranslations('invite');

  let preview: InvitePreview;
  try {
    preview = await serverApi<InvitePreview>(`/invites/preview/${encodeURIComponent(token)}`);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) throw error;
    return (
      <AuthShell title={t('invalidTitle')}>
        <p className="text-sm text-muted-foreground">{t('invalidText')}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium underline">
          {t('toLogin')}
        </Link>
      </AuthShell>
    );
  }

  const user = await getSessionUser();
  const intro = t.rich(preview.spaceName ? 'introSpace' : 'introAccount', {
    name: preview.invitedBy,
    b: bold,
  });

  if (user && user.email !== preview.email) {
    return (
      <AuthShell title={t('mismatchTitle')}>
        <p className="text-sm text-muted-foreground">
          {t.rich('mismatchText', { current: user.email, invited: preview.email, b: bold })}
        </p>
        <div className="mt-6">
          <LogoutButton redirectTo={`/invite/${token}`} variant="secondary" />
        </div>
      </AuthShell>
    );
  }

  if (user) {
    return (
      <AuthShell title={t('title')}>
        <p className="mb-6 text-sm text-muted-foreground">{intro}</p>
        {preview.spaceId ? (
          <AcceptInvite token={token} spaceId={preview.spaceId} />
        ) : (
          <p className="text-sm">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/dashboard" className="font-medium underline">
              {t('toDashboard')}
            </Link>
          </p>
        )}
      </AuthShell>
    );
  }

  if (preview.accountExists) {
    return (
      <AuthShell title={t('title')}>
        <p className="mb-6 text-sm text-muted-foreground">
          {intro} {t.rich('loginToAccept', { email: preview.email, b: bold })}
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {t('login')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('registerTitle')}>
      <p className="mb-6 text-sm text-muted-foreground">{intro}</p>
      <RegisterForm token={token} email={preview.email} spaceId={preview.spaceId} />
    </AuthShell>
  );
}
