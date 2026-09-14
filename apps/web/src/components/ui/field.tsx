import { type InputHTMLAttributes, type SelectHTMLAttributes, useId } from 'react';

import { cn } from '@/lib/cn';

const control =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={cn(
          control,
          error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700',
          className,
        )}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        {...props}
        id={id}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={cn(control, 'border-zinc-300 dark:border-zinc-700', className)}
      >
        {children}
      </select>
    </FieldShell>
  );
}

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: FieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
      {(error ?? hint) && (
        <p
          id={`${id}-desc`}
          className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
