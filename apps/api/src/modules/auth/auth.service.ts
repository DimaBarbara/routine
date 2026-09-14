import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import type { LoginInput, RegisterInput, SessionUser } from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { avatarUrl } from '../../common/person.js';
import { PrismaService } from '../../database/prisma.service.js';
import { InvitesService } from '../invites/invites.service.js';
import { SpacesService } from '../spaces/spaces.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  /** Хеш-пустушка: відповідь для неіснуючої пошти займає стільки ж часу, скільки для існуючої. */
  private readonly dummyHash = hash('timing-attack-dummy-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly invites: InvitesService,
    private readonly spaces: SpacesService,
  ) {}

  async login({ email, password }: LoginInput, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const isValid = await verify(user?.passwordHash ?? (await this.dummyHash), password);

    if (!user || !isValid) throw AppException.unauthorized('AUTH_INVALID_CREDENTIALS');

    const session = await this.sessions.create(user.id, userAgent);
    return { userId: user.id, session };
  }

  async register({ token, name, password }: RegisterInput, userAgent?: string) {
    const passwordHash = await hash(password);

    const userId = await this.prisma.$transaction(async (tx) => {
      const invite = await this.invites.findPendingByToken(token, tx);

      const existing = await tx.user.findUnique({ where: { email: invite.email } });
      if (existing) {
        throw AppException.conflict('AUTH_EMAIL_TAKEN');
      }

      // Запросили в простір — людина живе в ньому, без окремого порожнього особистого.
      // Реєстраційний інвайт (без простору) — отримує власний простір.
      const user = await tx.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash,
          ...(invite.spaceId
            ? {}
            : {
                memberships: {
                  create: {
                    role: 'OWNER',
                    space: { create: { name: 'Personal', isPersonal: true } },
                  },
                },
              }),
        },
      });

      await this.invites.consume(invite, user.id, tx);
      return user.id;
    });

    const session = await this.sessions.create(userId, userAgent);
    return { userId, session };
  }

  async getSessionUser(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      avatarUrl: avatarUrl(user),
      spaces: await this.spaces.listForUser(userId),
    };
  }
}
