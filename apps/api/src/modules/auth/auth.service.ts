import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import type { LoginInput, RegisterInput, SessionUser } from '@routine/contracts';

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

    if (!user || !isValid) throw new UnauthorizedException('Невірна пошта або пароль');

    const session = await this.sessions.create(user.id, userAgent);
    return { userId: user.id, session };
  }

  async register({ token, name, password }: RegisterInput, userAgent?: string) {
    const passwordHash = await hash(password);

    const userId = await this.prisma.$transaction(async (tx) => {
      const invite = await this.invites.findPendingByToken(token, tx);

      const existing = await tx.user.findUnique({ where: { email: invite.email } });
      if (existing) {
        throw new ConflictException('Акаунт із цією поштою вже існує — увійдіть, щоб прийняти');
      }

      // Кожен отримує власний простір, навіть якщо його запросили в чужий.
      const user = await tx.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash,
          memberships: {
            create: { role: 'OWNER', space: { create: { name: 'Особистий', isPersonal: true } } },
          },
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
      spaces: await this.spaces.listForUser(userId),
    };
  }
}
