import { z } from 'zod';

export const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const requiredText = (max: number) =>
  z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .max(max, { error: 'validation.tooLong' });

export const optionalText = (max: number) =>
  z
    .preprocess(emptyToNull, z.string().trim().max(max, { error: 'validation.tooLong' }).nullish())
    .transform((value) => value ?? null);

/** Календарна дата без часу: `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date({ error: 'validation.dateInvalid' });

export const optionalIsoDateSchema = z
  .preprocess(emptyToNull, isoDateSchema.nullish())
  .transform((value) => value ?? null);

/** Місяць: `YYYY-MM`. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'validation.invalid' });
