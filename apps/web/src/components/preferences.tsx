'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore, useTransition } from 'react';

import { isLocale, LOCALE_COOKIE, localeNames, locales } from '@/i18n/config';
import { cn } from '@/lib/cn';

const THEMES = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

export function Preferences({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LocaleSwitcher />
      <ThemeSwitcher />
    </div>
  );
}

function ThemeSwitcher() {
  const t = useTranslations('preferences');
  const { theme, setTheme } = useTheme();
  // Тема відома лише в браузері — до гідратації не підсвічуємо жодну кнопку.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="radiogroup"
      aria-label={t('theme')}
      className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
    >
      {THEMES.map(({ value, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => setTheme(value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function LocaleSwitcher() {
  const t = useTranslations('preferences');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: string) {
    if (!isLocale(next)) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <select
      aria-label={t('language')}
      value={locale}
      disabled={isPending}
      onChange={(event) => change(event.target.value)}
      className="h-8 rounded-lg border border-zinc-200 bg-transparent px-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
    >
      {locales.map((value) => (
        <option key={value} value={value}>
          {localeNames[value]}
        </option>
      ))}
    </select>
  );
}
