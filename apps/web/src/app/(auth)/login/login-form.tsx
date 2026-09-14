'use client';

import { loginSchema, type SessionUser } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, fieldErrors } from '@/lib/api/error';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});

    setLoading(true);
    try {
      await api<SessionUser>('/auth/login', 'POST', parsed.data);
      router.replace(next);
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
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors['email']}
      />
      <TextField
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors['password']}
      />
      <Button type="submit" loading={loading} className="mt-2">
        Увійти
      </Button>
    </form>
  );
}
