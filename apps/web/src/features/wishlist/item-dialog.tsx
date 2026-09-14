'use client';

import {
  CURRENCIES,
  WISH_CATEGORIES,
  WISH_DONE_KINDS,
  WISH_PRIORITIES,
  WISH_STATUSES,
  type WishItemDto,
  wishItemInputSchema,
  type WishPerson,
  type WishStatus,
} from '@routine/contracts';
import { ExternalLink, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ChoiceField, SelectField, TextAreaField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useErrorText } from '@/hooks/use-error-text';
import { useZodForm } from '@/hooks/use-zod-form';
import { api } from '@/lib/api/client';

import { CATEGORY_META } from './meta';
import { parsePrice, priceInputValue } from './price';

/** Значення «спільне» в select: порожній рядок, бо FormData не передає null. */
const SHARED = '';

interface Props {
  open: boolean;
  onClose: () => void;
  basePath: string;
  members: WishPerson[];
  currentUserId: string;
  /** Без item — створення в колонці initialStatus. */
  item?: WishItemDto;
  initialStatus?: WishStatus;
  onSaved: () => void;
}

export function ItemDialog({ open, onClose, item, ...props }: Props) {
  const t = useTranslations('wishlist.item');
  return (
    <Modal open={open} onClose={onClose} size="lg" title={item ? t('editTitle') : t('newTitle')}>
      <ItemForm item={item} onClose={onClose} {...props} />
    </Modal>
  );
}

function ItemForm({
  basePath,
  members,
  currentUserId,
  item,
  initialStatus = 'WANT',
  onClose,
  onSaved,
}: Omit<Props, 'open'>) {
  const t = useTranslations();
  const router = useRouter();
  const errorText = useErrorText();
  const [status, setStatus] = useState<WishStatus>(item?.status ?? initialStatus);
  const [reserving, setReserving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { errors, formError, submitting, formProps } = useZodForm(wishItemInputSchema, (data) => ({
    title: data.get('title'),
    category: data.get('category'),
    status: data.get('status'),
    ownerId: data.get('ownerId') === SHARED ? null : data.get('ownerId'),
    priority: data.get('priority'),
    priceMinor: parsePrice(data.get('price')),
    currency: data.get('currency'),
    url: data.get('url'),
    imageUrl: data.get('imageUrl'),
    note: data.get('note'),
    doneKind: data.get('status') === 'DONE' ? (data.get('doneKind') ?? 'BOUGHT') : null,
  }));

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      onSaved();
      onClose();
      router.refresh();
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  const reservationPath = item ? `${basePath}/items/${item.id}/reservation` : '';
  const defaultOwner = item ? (item.owner?.id ?? SHARED) : currentUserId;

  return (
    <form
      {...formProps(async (data) => {
        if (item) await api(`${basePath}/items/${item.id}`, 'PATCH', data);
        else await api(`${basePath}/items`, 'POST', data);
        onSaved();
        onClose();
        router.refresh();
      })}
      onChangeCapture={(event) => {
        const { target } = event;
        if (target instanceof HTMLInputElement && target.name === 'status') {
          setStatus(target.value as WishStatus);
        }
      }}
      className="flex flex-col gap-5"
    >
      {(formError ?? actionError) && <Alert tone="error">{formError ?? actionError}</Alert>}

      {item?.reservation && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-accent-foreground">
            <Gift className="size-4" aria-hidden />
            {item.reservation.status === 'FREE' && t('wishlist.reservation.reserve')}
            {item.reservation.status === 'RESERVED_BY_YOU' && t('wishlist.reservation.yours')}
            {item.reservation.status === 'RESERVED' &&
              (item.reservation.by
                ? t('wishlist.reservation.reservedBy', { name: item.reservation.by })
                : t('wishlist.reservation.reserved'))}
          </span>
          {item.reservation.status === 'FREE' && (
            <Button
              type="button"
              size="sm"
              loading={reserving}
              onClick={() => {
                setReserving(true);
                void run(() => api(reservationPath, 'POST')).finally(() => setReserving(false));
              }}
            >
              {t('wishlist.reservation.reserve')}
            </Button>
          )}
          {item.reservation.status === 'RESERVED_BY_YOU' && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={reserving}
              onClick={() => {
                setReserving(true);
                void run(() => api(reservationPath, 'DELETE')).finally(() => setReserving(false));
              }}
            >
              {t('wishlist.reservation.cancel')}
            </Button>
          )}
        </div>
      )}

      <TextField
        label={t('wishlist.item.title')}
        name="title"
        defaultValue={item?.title}
        placeholder={t('wishlist.item.titlePlaceholder')}
        autoFocus={!item}
        error={errors['title']}
      />

      <ChoiceField
        label={t('wishlist.item.category')}
        name="category"
        defaultValue={item?.category ?? 'OTHER'}
        error={errors['category']}
        options={WISH_CATEGORIES.map((category) => {
          const Icon = CATEGORY_META[category].icon;
          return {
            value: category,
            label: t(`wishlist.categories.${category}`),
            icon: <Icon className="size-3.5" aria-hidden />,
          };
        })}
      />

      <ChoiceField
        label={t('wishlist.item.status')}
        name="status"
        variant="segmented"
        defaultValue={status}
        error={errors['status']}
        options={WISH_STATUSES.map((value) => ({
          value,
          label: t(`wishlist.columns.${value}`),
        }))}
      />

      {status === 'DONE' && (
        <ChoiceField
          label={t('wishlist.item.doneKind')}
          name="doneKind"
          variant="segmented"
          defaultValue={item?.doneKind ?? 'BOUGHT'}
          options={WISH_DONE_KINDS.map((value) => ({
            value,
            label: t(`wishlist.doneKinds.${value}`),
          }))}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label={t('wishlist.item.owner')}
          name="ownerId"
          defaultValue={defaultOwner}
          error={errors['ownerId']}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.id === currentUserId ? t('wishlist.item.ownerMe') : member.name}
            </option>
          ))}
          <option value={SHARED}>{t('wishlist.shared')}</option>
        </SelectField>

        <SelectField
          label={t('wishlist.item.priority')}
          name="priority"
          defaultValue={item?.priority ?? 'MEDIUM'}
          error={errors['priority']}
        >
          {[...WISH_PRIORITIES].reverse().map((priority) => (
            <option key={priority} value={priority}>
              {t(`wishlist.priorities.${priority}`)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <TextField
          label={t('wishlist.item.price')}
          name="price"
          inputMode="decimal"
          defaultValue={priceInputValue(item?.priceMinor ?? null)}
          placeholder="0"
          error={errors['priceMinor']}
        />
        <SelectField
          label={t('wishlist.item.currency')}
          name="currency"
          defaultValue={item?.currency ?? 'UAH'}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('wishlist.item.url')}
          name="url"
          type="url"
          inputMode="url"
          defaultValue={item?.url ?? ''}
          placeholder="https://"
          error={errors['url']}
        />
        <TextField
          label={t('wishlist.item.imageUrl')}
          name="imageUrl"
          type="url"
          inputMode="url"
          defaultValue={item?.imageUrl ?? ''}
          placeholder="https://"
          error={errors['imageUrl']}
        />
      </div>

      <TextAreaField
        label={t('wishlist.item.note')}
        name="note"
        defaultValue={item?.note ?? ''}
        placeholder={t('wishlist.item.notePlaceholder')}
        error={errors['note']}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-2">
          {item && (
            <ConfirmAction
              label={t('common.delete')}
              question={t('wishlist.item.deleteConfirm')}
              onConfirm={() => run(() => api(`${basePath}/items/${item.id}`, 'DELETE'))}
            />
          )}
          {item?.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t('wishlist.item.open')} <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {item ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </div>
    </form>
  );
}
