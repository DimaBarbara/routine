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
  'w-full rounded-xl border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/15 disabled:bg-muted disabled:text-muted-foreground';

const border = (error?: string) => (error ? 'border-destructive' : 'border-input');

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
        className={cn(control, 'h-11', border(error), className)}
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
          className={cn(control, 'h-11 pr-11', border(error), className)}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? t('hidePassword') : t('showPassword')}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
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
        className={cn(control, 'min-h-20 py-2.5', border(error), className)}
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
        className={cn(control, 'h-11', border(error), className)}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/**
 * Група радіокнопок у вигляді «чипів» або сегментів. Нативні input[type=radio]:
 * працюють із FormData, клавіатурою та читачами екрана без додаткового коду.
 */
export function ChoiceField<T extends string>({
  label,
  name,
  options,
  defaultValue,
  error,
  variant = 'chips',
  className,
}: {
  label: string;
  name: string;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  defaultValue?: T;
  error?: string;
  variant?: 'chips' | 'segmented';
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset
      className={cn('flex flex-col gap-1.5', className)}
      aria-describedby={error ? `${id}-desc` : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium text-foreground">{label}</legend>
      <div
        className={cn(
          variant === 'segmented'
            ? 'grid auto-cols-fr grid-flow-col rounded-xl bg-muted p-1'
            : 'flex flex-wrap gap-2',
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex items-center justify-center gap-1.5 text-sm font-medium transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                variant === 'segmented'
                  ? 'h-9 rounded-lg px-2 text-muted-foreground peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-card'
                  : 'h-9 rounded-full border border-border px-3 text-muted-foreground peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground hover:border-input hover:text-foreground',
              )}
            >
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-desc`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
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
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {(error ?? hint) && (
        <p
          id={`${id}-desc`}
          className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
