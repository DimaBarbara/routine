import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

import { dateAt, shiftMonth } from '@/lib/today';

/** Серверний: назву місяця форматує Intl на сервері — клієнту нема що розходитись. */
export async function MonthSwitcher({ month, basePath }: { month: string; basePath: string }) {
  const [t, format] = await Promise.all([getTranslations('finance.month'), getFormatter()]);
  const label = format.dateTime(dateAt(month), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const link =
    'flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground';

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-card">
      <Link
        href={`${basePath}?month=${shiftMonth(month, -1)}`}
        aria-label={t('prev')}
        className={link}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
      <span className="min-w-36 px-2 text-center text-sm font-semibold capitalize">{label}</span>
      <Link
        href={`${basePath}?month=${shiftMonth(month, 1)}`}
        aria-label={t('next')}
        className={link}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
