'use client';

import { registerSchema, type SessionUser } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, fieldErrors } from '@/lib/api/error';

interface Props {
  token: string;
  email: string;
  spaceId: string | null;
}

export function RegisterForm({ token, email, spaceId }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('passwordConfirm')) {
      return setErrors({ passwordConfirm: 'Паролі не збігаються' });
    }

    const parsed = registerSchema.safeParse({
      token,
      name: form.get('name'),
      password: form.get('password'),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});

    setLoading(true);
    try {
      await api<SessionUser>('/auth/register', 'POST', parsed.data);
      // Запросили в простір — одразу туди, а не в порожній особистий.
      router.replace(spaceId ? `/dashboard?space=${spaceId}` : '/dashboard');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.issues.length) setErrors(fieldErrors(error.issues));
      else setFormError(errorMessage(error));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label="Пошта"
        value={email}
        disabled
        readOnly
        hint="Запрошення привʼязане до цієї пошти"
      />
      <TextField
        label="Імʼя"
        name="name"
        autoComplete="given-name"
        autoFocus
        error={errors['name']}
      />
      <TextField
        label="Пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Щонайменше 8 символів"
        error={errors['password']}
      />
      <TextField
        label="Пароль ще раз"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        error={errors['passwordConfirm']}
      />
      <Button type="submit" loading={loading} className="mt-2">
        Створити акаунт
      </Button>
    </form>
  );
}
