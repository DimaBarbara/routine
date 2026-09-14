import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Некоректна пошта'),
  password: z.string().min(1, 'Введіть пароль'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  token: z.string().min(1, 'Потрібне запрошення'),
  name: z.string().trim().min(2, 'Мінімум 2 символи').max(60),
  password: z.string().min(8, 'Мінімум 8 символів').max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;
