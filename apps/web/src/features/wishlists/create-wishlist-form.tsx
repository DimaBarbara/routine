'use client';

import { wishlistInputSchema, type WishlistSummary } from '@routine/contracts';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { NAVIGATING, useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

export function CreateWishlistForm({ spaceId }: { spaceId: string }) {
  const t = useTranslations('wishlists');
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(wishlistInputSchema);

  return (
    <form
      {...formProps(async (data) => {
        const created = await api<WishlistSummary>(`/spaces/${spaceId}/wishlists`, 'POST', data);
        router.push(`/s/${spaceId}/wishlists/${created.id}`);
        return NAVIGATING;
      })}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <TextField
          label={t('newLabel')}
          name="title"
          placeholder={t('newPlaceholder')}
          error={errors['title']}
        />
        <Button type="submit" loading={submitting} className="sm:mt-6.5">
          <Plus className="size-4" aria-hidden /> {t('create')}
        </Button>
      </div>
      {formError && <Alert tone="error">{formError}</Alert>}
    </form>
  );
}
