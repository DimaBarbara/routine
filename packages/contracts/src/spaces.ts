import { z } from 'zod';

export const roleSchema = z.enum(['OWNER', 'MEMBER']);
export type Role = z.infer<typeof roleSchema>;

/** Людина в інтерфейсі: учасник простору, власник бажання, автор операції. */
export interface Person {
  id: string;
  name: string;
  /** null — фото немає, показуємо ініціали. */
  avatarUrl: string | null;
}

export interface SpaceSummary {
  id: string;
  name: string;
  isPersonal: boolean;
  role: Role;
  memberCount: number;
  /** Для чужого особистого простору: показуємо «Простір Дмитра», а не «Особистий». */
  ownerName: string | null;
}

export interface SpaceMember extends Person {
  email: string;
  role: Role;
  joinedAt: string;
}

export interface SessionUser extends Person {
  email: string;
  isAdmin: boolean;
  spaces: SpaceSummary[];
}
