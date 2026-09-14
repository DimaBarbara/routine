import { z } from 'zod';

import { type Role, roleSchema } from './spaces.js';

/**
 * `spaceId: null` — реєстраційний інвайт (лише адмін): людина отримує власний простір.
 * `spaceId: <id>` — запрошення у простір: видає OWNER цього простору.
 */
export const createInviteSchema = z.object({
  email: z.email('Некоректна пошта'),
  spaceId: z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  role: roleSchema.optional().default('MEMBER'),
});
export type CreateInviteInput = z.input<typeof createInviteSchema>;
export type CreateInviteData = z.output<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Потрібне запрошення'),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface InviteSummary {
  id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  space: { id: string; name: string } | null;
  expiresAt: string;
  createdAt: string;
}

/** Повертається одразу після створення — сирий токен більше ніде не зберігається. */
export interface CreatedInvite extends InviteSummary {
  url: string;
}

/** Публічний прев'ю інвайта на сторінці /invite/[token]. */
export interface InvitePreview {
  email: string;
  invitedBy: string;
  spaceId: string | null;
  spaceName: string | null;
  /** Акаунт із цією поштою вже є — треба увійти й прийняти, а не реєструватися. */
  accountExists: boolean;
}

export interface AcceptInviteResult {
  spaceId: string;
}
