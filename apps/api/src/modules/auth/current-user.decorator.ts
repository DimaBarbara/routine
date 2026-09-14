import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { AppRequest, AuthUser } from '../../common/request.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AppRequest>();
  if (!request.user) throw new UnauthorizedException('Потрібно увійти');
  return request.user;
});

/** Для публічних маршрутів, де вхід необовʼязковий. */
export const OptionalUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<AppRequest>().user ?? null,
);
