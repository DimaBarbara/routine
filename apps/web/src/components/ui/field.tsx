'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react';

import { cn } from '@/lib/cn';

const control =
  'w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 disabled:text-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-100/10 dark:disabled:bg-zinc-800';

const border = (error?: string) =>
  error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, error, hint, className, ...props }: InputProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={cn(control, 'h-10', border(error), className)}
      />
    </FieldShell>
  );
}

export function PasswordField({
  label,
  error,
  hint,
  className,
  ...props
}: Omit<InputProps, 'type'>) {
  const id = useId();
  const t = useTranslations('fields');
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          className={cn(control, 'h-10 pr-10', border(error), className)}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? t('hidePassword') : t('showPassword')}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-zinc-500 dark:hover:text-zinc-200"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={cn(control, 'min-h-20 py-2', border(error), className)}
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
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-desc` : undefined}
        className={cn(control, 'h-10', border(error), className)}
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
