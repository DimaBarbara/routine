import { z } from 'zod';

export const roleSchema = z.enum(['OWNER', 'MEMBER']);
export type Role = z.infer<typeof roleSchema>;

export interface SpaceSummary {
  id: string;
  name: string;
  isPersonal: boolean;
  role: Role;
  memberCount: number;
  /** Для чужого особистого простору: показуємо «Простір Дмитра», а не «Особистий». */
  ownerName: string | null;
}

export interface SpaceMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  spaces: SpaceSummary[];
}
