'use client';

import { wishlistInputSchema, type WishlistSummary } from '@routine/contracts';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { TextAreaField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

interface Props {
  wishlist: Pick<WishlistSummary, 'title' | 'description'>;
  basePath: string;
  listPath: string;
}

export function WishlistActions({ wishlist, basePath, listPath }: Props) {
  const t = useTranslations();
  const errorText = useErrorText();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" aria-hidden /> {t('wishlists.editList')}
        </Button>
        <ConfirmAction
          label={t('wishlists.deleteList')}
          question={t('wishlists.deleteListConfirm')}
          onConfirm={async () => {
            try {
              await api(basePath, 'DELETE');
              router.replace(listPath);
              router.refresh();
            } catch (err) {
              setError(errorText(err));
            }
          }}
        />
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      <Modal open={editing} onClose={() => setEditing(false)} title={t('wishlists.editList')}>
        <EditWishlistForm
          wishlist={wishlist}
          basePath={basePath}
          onDone={() => setEditing(false)}
        />
      </Modal>
    </div>
  );
}

function EditWishlistForm({
  wishlist,
  basePath,
  onDone,
}: {
  wishlist: Props['wishlist'];
  basePath: string;
  onDone: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(wishlistInputSchema);

  return (
    <form
      {...formProps(async (data) => {
        await api(basePath, 'PATCH', data);
        onDone();
        router.refresh();
      })}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label={t('wishlists.listTitle')}
        name="title"
        defaultValue={wishlist.title}
        autoFocus
        error={errors['title']}
      />
      <TextAreaField
        label={t('wishlists.listDescription')}
        name="description"
        defaultValue={wishlist.description ?? ''}
        placeholder={t('wishlists.listDescriptionPlaceholder')}
        error={errors['description']}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
