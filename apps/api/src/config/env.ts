import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обовʼязковий'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  INVITE_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /** «Сьогодні» для регулярних доходів і депозитів. Render живе в UTC. */
  APP_TIMEZONE: z.string().default('Europe/Kyiv'),
  /** nbu — офіційні курси; fixed — сталі курси без мережі (тести, офлайн). */
  RATES_SOURCE: z.enum(['nbu', 'fixed']).default('nbu'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Некоректні змінні оточення:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
