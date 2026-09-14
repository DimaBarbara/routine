import { z } from 'zod';

/** Повідомлення — ключі перекладів (namespace `validation`), тексти живуть на фронті. */
export const emailSchema = z.email({ error: 'validation.emailInvalid' }).max(254);

export const passwordSchema = z
  .string({ error: 'validation.required' })
  .min(8, { error: 'validation.passwordMin' })
  .max(128, { error: 'validation.passwordMax' });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'validation.required' }).min(1, { error: 'validation.required' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const nameSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .min(2, { error: 'validation.nameMin' })
  .max(60, { error: 'validation.nameMax' });

export const registerSchema = z.object({
  token: z.string({ error: 'validation.required' }).min(1, { error: 'validation.required' }),
  name: nameSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;
