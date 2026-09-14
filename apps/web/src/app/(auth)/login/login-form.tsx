'use client';

import { loginSchema, type SessionUser } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField, TextField } from '@/components/ui/field';
import { NAVIGATING, useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(loginSchema);

  return (
    <form
      {...formProps(async (data) => {
        await api<SessionUser>('/auth/login', 'POST', data);
        router.replace(next);
        router.refresh();
        return NAVIGATING;
      })}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label={t('fields.email')}
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors['email']}
      />
      <PasswordField
        label={t('fields.password')}
        name="password"
        autoComplete="current-password"
        error={errors['password']}
      />
      <Button type="submit" loading={submitting} className="mt-2">
        {t('login.submit')}
      </Button>
    </form>
  );
}
