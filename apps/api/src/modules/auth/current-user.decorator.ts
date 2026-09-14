import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { AppException } from '../../common/app-exception.js';
import type { AppRequest, AuthUser } from '../../common/request.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AppRequest>();
  if (!request.user) throw AppException.unauthorized();
  return request.user;
});

/** Для публічних маршрутів, де вхід необовʼязковий. */
export const OptionalUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<AppRequest>().user ?? null,
);
