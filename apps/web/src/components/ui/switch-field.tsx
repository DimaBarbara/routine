'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/cn';

interface Props {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}

/** Перемикач «так/ні». У формі — прихований input зі значенням on/off. */
export function SwitchField({ label, name, defaultChecked = false, hint }: Props) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => setChecked((value) => !value)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-card transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
      <input type="hidden" name={name} value={checked ? 'on' : 'off'} />
    </div>
  );
}
