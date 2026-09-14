import { cn } from '@/lib/cn';

const PALETTE = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
];

/** Стабільний колір для людини: однаковий на всіх екранах і після перезавантаження. */
function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const sizes = { xs: 'size-5 text-[10px]', sm: 'size-7 text-xs', md: 'size-9 text-sm' };

export function Avatar({
  id,
  name,
  size = 'sm',
  className,
}: {
  id: string;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        colorFor(id),
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
