import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LogoutButton } from '@/components/logout-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AvatarEditor } from '@/features/profile/avatar-editor';
import { NameForm, PasswordForm } from '@/features/profile/profile-forms';
import { requireUser } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('profile') };
}

export default async function ProfilePage() {
  const [user, t, tn] = await Promise.all([
    requireUser(),
    getTranslations('profile'),
    getTranslations('nav'),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            {t('title')}
            {user.isAdmin && <Badge tone="amber">{tn('admin')}</Badge>}
          </h1>
          <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {/* На мобільному кнопка виходу живе тут: у верхній панелі — аватар із посиланням на профіль. */}
        <LogoutButton variant="secondary" />
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t('photo')}</h2>
        <AvatarEditor user={user} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t('nameTitle')}</h2>
        <NameForm user={user} />
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">{t('passwordTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('passwordHint')}</p>
        </div>
        <PasswordForm />
      </Card>
    </div>
  );
}
