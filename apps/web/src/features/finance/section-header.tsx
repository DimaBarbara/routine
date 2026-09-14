import { cn } from '@/lib/cn';

interface Props {
  icon: React.ReactNode;
  tone: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** Однаковий заголовок для секцій «Готівка» й «Депозити» — щоб сторінка читалась як одне ціле. */
export function SectionHeader({ icon, tone, title, hint, action }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </header>
  );
}
