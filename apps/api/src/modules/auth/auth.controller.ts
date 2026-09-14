import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import {
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
  type SessionUser,
} from '@routine/contracts';
import type { Response } from 'express';

import type { AppRequest, AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { SessionService } from './session.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const { userId, session } = await this.auth.login(body, req.headers['user-agent']);
    this.sessions.setCookie(res, session.token, session.expiresAt);
    return this.auth.getSessionUser(userId);
  }

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const { userId, session } = await this.auth.register(body, req.headers['user-agent']);
    this.sessions.setCookie(res, session.token, session.expiresAt);
    return this.auth.getSessionUser(userId);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    if (req.sessionToken) await this.sessions.revoke(req.sessionToken);
    this.sessions.clearCookie(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.auth.getSessionUser(user.id);
  }
}
