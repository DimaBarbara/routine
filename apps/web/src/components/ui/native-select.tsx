import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Не `size` — це вже HTML-атрибут select (кількість видимих рядків). */
  density?: 'sm' | 'md';
  wrapperClassName?: string;
}

/**
 * Нативний select (клавіатура й мобільні пікери — від браузера), але зі своєю стрілкою:
 * системна липне до правого краю й виглядає по-різному в кожному браузері.
 */
export function NativeSelect({
  density = 'md',
  className,
  wrapperClassName,
  style,
  children,
  ...props
}: Props) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        {...props}
        // Відступ під стрілку — inline: інакше px-* із className може його перебити.
        style={{ ...style, paddingRight: density === 'md' ? '2.5rem' : '1.75rem' }}
        className={cn('w-full cursor-pointer appearance-none', className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          density === 'md' ? 'right-3.5 size-4' : 'right-2 size-3.5',
        )}
      />
    </div>
  );
}
