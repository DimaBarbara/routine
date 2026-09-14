'use client';

import { type FormEvent, useRef, useState } from 'react';
import type { z } from 'zod';

import { ApiError } from '@/lib/api/error';

import { useErrorText, useValidationText } from './use-error-text';

type Issue = { path: PropertyKey[] | string; message: string };

/** Повернути з onValid, якщо далі йде навігація: кнопка лишиться в стані завантаження. */
export const NAVIGATING = Symbol('navigating');

/**
 * Валідація тими самими zod-схемами, що й на бекенді.
 * До першої відправки помилки не показуються; після — перевіряються на кожну зміну,
 * тож помилка зникає, щойно людина виправила поле.
 */
export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  toValues: (data: FormData) => unknown = (data) => Object.fromEntries(data),
) {
  const validationText = useValidationText();
  const errorText = useErrorText();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const collect = (issues: Issue[]) => {
    const result: Record<string, string> = {};
    for (const issue of issues) {
      const key = Array.isArray(issue.path) ? issue.path.map(String).join('.') : String(issue.path);
      result[key] ??= validationText(issue.message);
    }
    return result;
  };

  const showErrors = (form: HTMLFormElement, issues: Issue[]) => {
    const collected = collect(issues);
    setErrors(collected);
    const first = Object.keys(collected)[0];
    const field = first ? form.elements.namedItem(first) : null;
    if (field instanceof HTMLElement) field.focus();
  };

  function formProps(
    onValid: (data: z.output<TSchema>, form: HTMLFormElement) => Promise<unknown>,
  ) {
    return {
      noValidate: true,
      onChange: (event: FormEvent<HTMLFormElement>) => {
        if (!submitted.current) return;
        const result = schema.safeParse(toValues(new FormData(event.currentTarget)));
        setErrors(result.success ? {} : collect(result.error.issues));
      },
      onSubmit: async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        submitted.current = true;
        setFormError(null);

        const result = schema.safeParse(toValues(new FormData(form)));
        if (!result.success) return showErrors(form, result.error.issues);

        setErrors({});
        setSubmitting(true);
        let outcome: unknown;
        try {
          outcome = await onValid(result.data, form);
        } catch (error) {
          if (error instanceof ApiError && error.issues.length) showErrors(form, error.issues);
          else setFormError(errorText(error));
        } finally {
          if (outcome !== NAVIGATING) setSubmitting(false);
        }
      },
    };
  }

  function reset() {
    submitted.current = false;
    setErrors({});
    setFormError(null);
  }

  return { errors, formError, submitting, formProps, reset };
}
