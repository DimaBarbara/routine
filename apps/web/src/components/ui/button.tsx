import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-card hover:bg-primary-hover',
  secondary: 'border border-border bg-card text-foreground shadow-card hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  soft: 'bg-accent text-accent-foreground hover:bg-accent/70',
  danger: 'text-destructive hover:bg-destructive-soft',
};

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
  icon: 'size-9',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
