'use client';

import { changePasswordSchema, type SessionUser, updateProfileSchema } from '@routine/contracts';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField, TextField } from '@/components/ui/field';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

export function NameForm({ user }: { user: SessionUser }) {
  const t = useTranslations();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { errors, formError, submitting, formProps } = useZodForm(updateProfileSchema);

  return (
    <form
      {...formProps(async (data) => {
        await api<SessionUser>('/profile', 'PATCH', data);
        setSaved(true);
        router.refresh();
      })}
      onInput={() => setSaved(false)}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('profile.nameTitle')}
          name="name"
          defaultValue={user.name}
          autoComplete="name"
          error={errors['name']}
        />
        <TextField
          label={t('profile.email')}
          value={user.email}
          readOnly
          disabled
          hint={t('profile.emailHint')}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={submitting}>
          {t('common.save')}
        </Button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" aria-hidden /> {t('profile.saved')}
          </span>
        )}
      </div>
    </form>
  );
}

/** Серверна схема + підтвердження нового пароля, яке існує лише у формі. */
const passwordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'validation.passwordMismatch',
  });

export function PasswordForm() {
  const t = useTranslations('profile');
  const [changed, setChanged] = useState(false);
  const { errors, formError, submitting, formProps, reset } = useZodForm(passwordFormSchema);

  return (
    <form
      {...formProps(async ({ currentPassword, newPassword }, form) => {
        await api('/profile/password', 'POST', { currentPassword, newPassword });
        form.reset();
        reset();
        setChanged(true);
      })}
      onInput={() => setChanged(false)}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      {changed && <Alert tone="success">{t('passwordChanged')}</Alert>}
      <PasswordField
        label={t('currentPassword')}
        name="currentPassword"
        autoComplete="current-password"
        error={errors['currentPassword']}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label={t('newPassword')}
          name="newPassword"
          autoComplete="new-password"
          error={errors['newPassword']}
        />
        <PasswordField
          label={t('confirmPassword')}
          name="confirmPassword"
          autoComplete="new-password"
          error={errors['confirmPassword']}
        />
      </div>
      <Button type="submit" loading={submitting} className="w-fit">
        {t('changePassword')}
      </Button>
    </form>
  );
}
