'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { isLocale, LOCALE_COOKIE, locales } from '@/i18n/config';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme/use-theme';

const THEMES = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

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

  return (
    <div
      role="radiogroup"
      aria-label={t('theme')}
      className="inline-flex rounded-xl bg-muted p-0.5"
    >
      {THEMES.map(({ value, icon: Icon }) => {
        // До гідратації theme === null: жодна кнопка не підсвічена, розбіжності немає.
        const active = theme === value;
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
              'flex size-7 items-center justify-center rounded-[10px] transition',
              active
                ? 'bg-card text-foreground shadow-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
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
      className="h-8 rounded-xl border-0 bg-muted px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {locales.map((value) => (
        <option key={value} value={value}>
          {value === 'uk' ? 'UA' : value.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
