import { cn } from '@/lib/cn';

const tones = {
  error: 'bg-destructive-soft text-destructive',
  success: 'bg-success-soft text-success',
  info: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
};

export function Alert({
  tone = 'info',
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl px-4 py-3 text-sm', tones[tone], className)}
    >
      {children}
    </div>
  );
}
