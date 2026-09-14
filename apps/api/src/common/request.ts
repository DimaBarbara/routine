import type { Role } from '@routine/contracts';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AppRequest extends Request {
  user?: AuthUser;
  sessionToken?: string;
  /** Заповнює SpaceMemberGuard для маршрутів /spaces/:spaceId/... */
  membership?: { spaceId: string; role: Role };
}
