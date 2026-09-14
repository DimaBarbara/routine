import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import type { AppRequest } from '../../common/request.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SESSION_COOKIE, SessionService } from './session.service.js';

/** Глобальний: усе закрите за замовчуванням, відкривається лише через @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AppRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];

    if (typeof token === 'string' && token.length > 0) {
      const result = await this.sessions.validate(token);
      if (result) {
        const { id, email, name, isAdmin } = result.user;
        request.user = { id, email, name, isAdmin };
        request.sessionToken = token;
        if (result.renewedExpiresAt) {
          this.sessions.setCookie(http.getResponse<Response>(), token, result.renewedExpiresAt);
        }
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || request.user) return true;

    throw new UnauthorizedException('Потрібно увійти');
  }
}
