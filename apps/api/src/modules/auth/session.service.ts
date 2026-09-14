import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import { daysFromNow, generateToken, hashToken } from '../../common/crypto.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../database/prisma.service.js';

export const SESSION_COOKIE = 'routine_session';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get ttlDays() {
    return this.config.get('SESSION_TTL_DAYS', { infer: true });
  }

  async create(userId: string, userAgent?: string) {
    const token = generateToken();
    const expiresAt = daysFromNow(this.ttlDays);

    await this.prisma.session.create({
      data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 255) },
    });

    return { token, expiresAt };
  }

  /**
   * Ковзна сесія: коли лишилось менше половини терміну — продовжуємо.
   * Хто заходить хоча б раз на 15 днів, не розлогінюється ніколи.
   */
  async validate(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

    const halfTtlMs = (this.ttlDays * 24 * 60 * 60 * 1000) / 2;
    let renewedExpiresAt: Date | null = null;
    if (session.expiresAt.getTime() - Date.now() < halfTtlMs) {
      renewedExpiresAt = daysFromNow(this.ttlDays);
      await this.prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: renewedExpiresAt },
      });
    }

    return { user: session.user, renewedExpiresAt };
  }

  async revoke(token: string) {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  setCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), expires: expiresAt });
  }

  clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
    };
  }
}
