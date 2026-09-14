import { cn } from '@/lib/cn';

const tones = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-destructive-soft text-destructive',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
