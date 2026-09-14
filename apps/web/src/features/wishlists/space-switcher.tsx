'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export const SPACE_COOKIE = 'routine_space';

interface Props {
  currentId: string;
  spaces: { id: string; label: string }[];
}

/** Перемикач простору + запамʼятовування останнього, щоб /wishlists вів туди ж. */
export function SpaceSwitcher({ currentId, spaces }: Props) {
  const t = useTranslations('wishlists');
  const router = useRouter();

  useEffect(() => {
    document.cookie = `${SPACE_COOKIE}=${currentId}; path=/; max-age=31536000; samesite=lax`;
  }, [currentId]);

  if (spaces.length < 2) return null;

  return (
    <select
      aria-label={t('space')}
      value={currentId}
      onChange={(event) => router.push(`/s/${event.target.value}/wishlists`)}
      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {spaces.map((space) => (
        <option key={space.id} value={space.id}>
          {space.label}
        </option>
      ))}
    </select>
  );
}
