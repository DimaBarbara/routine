'use client';

import {
  CURRENCIES,
  WISH_PRIORITIES,
  type WishlistItemDto,
  wishlistItemInputSchema,
} from '@routine/contracts';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

import { parsePrice, priceInputValue } from './price';

interface Props {
  open: boolean;
  onClose: () => void;
  basePath: string;
  /** Без item — створення, з item — редагування. */
  item?: WishlistItemDto;
}

export function ItemDialog({ open, onClose, basePath, item }: Props) {
  const t = useTranslations('wishlists.item');
  return (
    <Modal open={open} onClose={onClose} title={item ? t('editTitle') : t('newTitle')}>
      <ItemForm basePath={basePath} item={item} onDone={onClose} />
    </Modal>
  );
}

function ItemForm({
  basePath,
  item,
  onDone,
}: {
  basePath: string;
  item?: WishlistItemDto;
  onDone: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { errors, formError, submitting, formProps } = useZodForm(
    wishlistItemInputSchema,
    (data) => ({
      title: data.get('title'),
      url: data.get('url'),
      imageUrl: data.get('imageUrl'),
      priceMinor: parsePrice(data.get('price')),
      currency: data.get('currency'),
      priority: data.get('priority'),
      note: data.get('note'),
    }),
  );

  return (
    <form
      {...formProps(async (data) => {
        if (item) await api(`${basePath}/items/${item.id}`, 'PATCH', data);
        else await api(`${basePath}/items`, 'POST', data);
        onDone();
        router.refresh();
      })}
      className="flex flex-col gap-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label={t('wishlists.item.title')}
        name="title"
        defaultValue={item?.title}
        placeholder={t('wishlists.item.titlePlaceholder')}
        autoFocus
        error={errors['title']}
      />
      <TextField
        label={t('wishlists.item.url')}
        name="url"
        type="url"
        inputMode="url"
        defaultValue={item?.url ?? ''}
        placeholder="https://"
        error={errors['url']}
      />

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <TextField
          label={t('wishlists.item.price')}
          name="price"
          inputMode="decimal"
          defaultValue={priceInputValue(item?.priceMinor ?? null)}
          placeholder="0"
          error={errors['priceMinor']}
        />
        <SelectField
          label={t('wishlists.item.currency')}
          name="currency"
          defaultValue={item?.currency ?? 'UAH'}
          error={errors['currency']}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </SelectField>
      </div>

      <SelectField
        label={t('wishlists.item.priority')}
        name="priority"
        defaultValue={item?.priority ?? 'MEDIUM'}
        error={errors['priority']}
      >
        {[...WISH_PRIORITIES].reverse().map((priority) => (
          <option key={priority} value={priority}>
            {t(`wishlists.item.priorities.${priority}`)}
          </option>
        ))}
      </SelectField>

      <TextField
        label={t('wishlists.item.imageUrl')}
        name="imageUrl"
        type="url"
        inputMode="url"
        defaultValue={item?.imageUrl ?? ''}
        placeholder="https://"
        error={errors['imageUrl']}
      />
      <TextAreaField
        label={t('wishlists.item.note')}
        name="note"
        defaultValue={item?.note ?? ''}
        placeholder={t('wishlists.item.notePlaceholder')}
        error={errors['note']}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {item ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
