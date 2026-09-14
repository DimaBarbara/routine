'use client';

import { useTranslations } from 'next-intl';

import { ApiError } from '@/lib/api/error';

export function useErrorText() {
  const t = useTranslations('errors');
  return (error: unknown) => t(error instanceof ApiError ? error.code : 'INTERNAL');
}

/** Повідомлення zod-схем — ключі `validation.*`; невідоме показуємо як загальну помилку. */
export function useValidationText() {
  const t = useTranslations('validation');
  return (message: string) => {
    const key = message.replace(/^validation\./, '') as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : t('invalid');
  };
}
