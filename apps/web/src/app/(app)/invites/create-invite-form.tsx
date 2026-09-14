'use client';

import { type CreatedInvite, createInviteSchema } from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

/** Порожнє значення в select — реєстраційний інвайт (spaceId: null). */
const NEW_ACCOUNT = '';

interface Props {
  isAdmin: boolean;
  targets: { id: string; label: string }[];
}

export function CreateInviteForm({ isAdmin, targets }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const { errors, formError, submitting, formProps, reset } = useZodForm(
    createInviteSchema,
    (data) => ({
      email: data.get('email'),
      spaceId: data.get('target') === NEW_ACCOUNT ? null : data.get('target'),
    }),
  );

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        {...formProps(async (data, form) => {
          setCreated(await api<CreatedInvite>('/invites', 'POST', data));
          setCopied(false);
          form.reset();
          reset();
          router.refresh();
        })}
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
      >
        <TextField
          label={t('fields.email')}
          name="email"
          type="email"
          placeholder={t('invites.emailPlaceholder')}
          error={errors['email']}
        />
        <SelectField
          label={t('invites.target')}
          name="target"
          defaultValue={targets[0]?.id ?? NEW_ACCOUNT}
        >
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
          {isAdmin && <option value={NEW_ACCOUNT}>{t('invites.newAccount')}</option>}
        </SelectField>
        <Button type="submit" loading={submitting} className="sm:mt-6.5">
          {t('common.create')}
        </Button>
      </form>

      {formError && <Alert tone="error">{formError}</Alert>}

      {created && (
        <Alert tone="success">
          <p>
            {t.rich('invites.created', { email: created.email, b: (chunks) => <b>{chunks}</b> })}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={created.url}
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 font-mono text-xs text-foreground"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => copy(created.url)}>
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
