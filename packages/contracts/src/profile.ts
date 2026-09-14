import { z } from 'zod';

import { nameSchema, passwordSchema } from './auth.js';

export const updateProfileSchema = z.object({ name: nameSchema });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Браузер стискає фото до 256px, тож реальний розмір — десятки КБ; межа з великим запасом. */
export const AVATAR_MAX_BYTES = 512_000;
export const AVATAR_SIZE_PX = 256;
