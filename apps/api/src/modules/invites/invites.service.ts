import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AcceptInviteResult,
  CreatedInvite,
  CreateInviteData,
  InvitePreview,
  InviteStatus,
  InviteSummary,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { daysFromNow, generateToken, hashToken } from '../../common/crypto.js';
import type { AuthUser } from '../../common/request.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Invite, Prisma, Space } from '../../generated/prisma/client.js';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(user: AuthUser, input: CreateInviteData): Promise<CreatedInvite> {
    const email = input.email.toLowerCase();

    if (input.spaceId === null) {
      if (!user.isAdmin) {
        throw AppException.forbidden('INVITE_ADMIN_ONLY');
      }
      if (await this.prisma.user.findUnique({ where: { email } })) {
        throw AppException.conflict('INVITE_USER_EXISTS');
      }
    } else {
      const membership = await this.prisma.membership.findUnique({
        where: { userId_spaceId: { userId: user.id, spaceId: input.spaceId } },
      });
      if (!membership) throw AppException.notFound('SPACE_NOT_FOUND');
      if (membership.role !== 'OWNER') {
        throw AppException.forbidden('INVITE_OWNER_ONLY');
      }
      const alreadyMember = await this.prisma.membership.findFirst({
        where: { spaceId: input.spaceId, user: { email } },
      });
      if (alreadyMember) throw AppException.conflict('INVITE_ALREADY_MEMBER');
    }

    const token = generateToken();

    const invite = await this.prisma.$transaction(async (tx) => {
      // Нове запрошення на ту саму пошту в той самий простір гасить попереднє.
      await tx.invite.updateMany({
        where: { email, spaceId: input.spaceId, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.invite.create({
        data: {
          email,
          role: input.role,
          spaceId: input.spaceId,
          createdById: user.id,
          tokenHash: hashToken(token),
          expiresAt: daysFromNow(this.config.get('INVITE_TTL_DAYS', { infer: true })),
        },
        include: { space: true },
      });
    });

    return {
      ...this.toSummary(invite),
      url: `${this.config.get('WEB_URL', { infer: true })}/invite/${token}`,
    };
  }

  async listCreatedBy(userId: string): Promise<InviteSummary[]> {
    const invites = await this.prisma.invite.findMany({
      where: { createdById: userId },
      include: { space: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return invites.map((invite) => this.toSummary(invite));
  }

  async revoke(userId: string, inviteId: string): Promise<InviteSummary> {
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, createdById: userId },
    });
    if (!invite) throw AppException.notFound('INVITE_NOT_FOUND');
    if (invite.acceptedAt) throw AppException.conflict('INVITE_ALREADY_USED');

    const updated = await this.prisma.invite.update({
      where: { id: invite.id },
      data: { revokedAt: invite.revokedAt ?? new Date() },
      include: { space: true },
    });
    return this.toSummary(updated);
  }

  async preview(token: string): Promise<InvitePreview> {
    const invite = await this.findPendingByToken(token, this.prisma);
    const [creator, space, account] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: invite.createdById } }),
      invite.spaceId ? this.prisma.space.findUnique({ where: { id: invite.spaceId } }) : null,
      this.prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } }),
    ]);

    return {
      email: invite.email,
      invitedBy: creator.name,
      spaceId: space?.id ?? null,
      spaceName: space?.name ?? null,
      accountExists: account !== null,
    };
  }

  /** Існуючий користувач приймає запрошення у простір. */
  async accept(user: AuthUser, token: string): Promise<AcceptInviteResult> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await this.findPendingByToken(token, tx);

      if (invite.email !== user.email) {
        throw AppException.forbidden('INVITE_EMAIL_MISMATCH');
      }
      if (!invite.spaceId) {
        throw AppException.badRequest('INVITE_REGISTRATION_ONLY');
      }

      await this.consume(invite, user.id, tx);
      return { spaceId: invite.spaceId };
    });
  }

  async findPendingByToken(token: string, db: Db): Promise<Invite> {
    const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || this.statusOf(invite) !== 'PENDING') {
      throw AppException.badRequest('INVITE_INVALID');
    }
    return invite;
  }

  /**
   * Атомарно гасить інвайт і видає членство. Умовний updateMany захищає від
   * гонки, коли одне посилання відкрили у двох вкладках одночасно.
   */
  async consume(invite: Invite, userId: string, db: Db): Promise<void> {
    const { count } = await db.invite.updateMany({
      where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { acceptedAt: new Date(), acceptedById: userId },
    });
    if (count !== 1) throw AppException.badRequest('INVITE_INVALID');

    if (invite.spaceId) {
      await db.membership.upsert({
        where: { userId_spaceId: { userId, spaceId: invite.spaceId } },
        create: { userId, spaceId: invite.spaceId, role: invite.role },
        update: {},
      });
    }
  }

  private statusOf(invite: Invite): InviteStatus {
    if (invite.acceptedAt) return 'ACCEPTED';
    if (invite.revokedAt) return 'REVOKED';
    if (invite.expiresAt <= new Date()) return 'EXPIRED';
    return 'PENDING';
  }

  private toSummary(invite: Invite & { space: Space | null }): InviteSummary {
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: this.statusOf(invite),
      space: invite.space ? { id: invite.space.id, name: invite.space.name } : null,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }
}
