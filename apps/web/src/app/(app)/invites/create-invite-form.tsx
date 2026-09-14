'use client';

import { type CreatedInvite, createInviteSchema } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, fieldErrors } from '@/lib/api/error';

/** Порожнє значення в select — реєстраційний інвайт (spaceId: null). */
const NEW_ACCOUNT = '';

interface Props {
  isAdmin: boolean;
  targets: { id: string; label: string }[];
}

export function CreateInviteForm({ isAdmin, targets }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setFormError(null);

    const target = form.get('target');
    const parsed = createInviteSchema.safeParse({
      email: form.get('email'),
      spaceId: target === NEW_ACCOUNT ? null : target,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});

    setLoading(true);
    try {
      setCreated(await api<CreatedInvite>('/invites', 'POST', parsed.data));
      setCopied(false);
      formElement.reset();
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.issues.length) setErrors(fieldErrors(error.issues));
      else setFormError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
      >
        <TextField
          label="Пошта"
          name="email"
          type="email"
          placeholder="friend@example.com"
          error={errors['email']}
        />
        <SelectField label="Куди" name="target" defaultValue={targets[0]?.id ?? NEW_ACCOUNT}>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
          {isAdmin && <option value={NEW_ACCOUNT}>Окремий акаунт (власний простір)</option>}
        </SelectField>
        <Button type="submit" loading={loading} className="sm:mt-6.5">
          Створити
        </Button>
      </form>

      {formError && <Alert tone="error">{formError}</Alert>}

      {created && (
        <Alert tone="success">
          <p>
            Запрошення для <b>{created.email}</b> створено. Скопіюйте посилання і надішліть —
            повторно його не показуємо.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={created.url}
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 min-w-0 flex-1 rounded-md border border-emerald-300 bg-white px-2 font-mono text-xs text-zinc-900 dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => copy(created.url)}>
              {copied ? 'Скопійовано' : 'Копіювати'}
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
