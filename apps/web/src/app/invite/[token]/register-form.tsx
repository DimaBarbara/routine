'use client';

import { registerSchema, type SessionUser } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField, TextField } from '@/components/ui/field';
import { NAVIGATING, useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

/** Серверна схема + підтвердження пароля, яке існує лише у формі. */
const registerFormSchema = registerSchema
  .extend({ passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    error: 'validation.passwordMismatch',
  });

interface Props {
  token: string;
  email: string;
  spaceId: string | null;
}

export function RegisterForm({ token, email, spaceId }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(registerFormSchema, (data) => ({
    ...Object.fromEntries(data),
    token,
  }));

  return (
    <form
      {...formProps(async ({ name, password }) => {
        await api<SessionUser>('/auth/register', 'POST', { token, name, password });
        // Запросили в простір — одразу туди, а не в порожній особистий.
        router.replace(spaceId ? `/s/${spaceId}/wishlist` : '/dashboard');
        router.refresh();
        return NAVIGATING;
      })}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label={t('fields.email')}
        value={email}
        disabled
        readOnly
        hint={t('invite.emailHint')}
      />
      <TextField
        label={t('fields.name')}
        name="name"
        autoComplete="given-name"
        autoFocus
        error={errors['name']}
      />
      <PasswordField
        label={t('fields.password')}
        name="password"
        autoComplete="new-password"
        hint={t('invite.passwordHint')}
        error={errors['password']}
      />
      <PasswordField
        label={t('fields.passwordConfirm')}
        name="passwordConfirm"
        autoComplete="new-password"
        error={errors['passwordConfirm']}
      />
      <Button type="submit" loading={submitting} className="mt-2">
        {t('invite.register')}
      </Button>
    </form>
  );
}
