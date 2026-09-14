import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import {
  AVATAR_MAX_BYTES,
  type ChangePasswordInput,
  type SessionUser,
  type UpdateProfileInput,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { hashToken } from '../../common/crypto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { detectImageType } from './image-type.js';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async updateName(userId: string, { name }: UpdateProfileInput): Promise<SessionUser> {
    await this.prisma.user.update({ where: { id: userId }, data: { name } });
    return this.auth.getSessionUser(userId);
  }

  /** Після зміни пароля всі інші пристрої виходять — поточна сесія лишається. */
  async changePassword(userId: string, currentSessionToken: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verify(user.passwordHash, input.currentPassword))) {
      throw AppException.badRequest('PROFILE_WRONG_PASSWORD');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hash(input.newPassword) },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null, NOT: { tokenHash: hashToken(currentSessionToken) } },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async setAvatar(
    userId: string,
    file: { buffer: Buffer; size: number } | undefined,
  ): Promise<SessionUser> {
    if (!file || file.size === 0 || file.size > AVATAR_MAX_BYTES) {
      throw AppException.badRequest('PROFILE_AVATAR_INVALID');
    }
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) throw AppException.badRequest('PROFILE_AVATAR_INVALID');

    const data = new Uint8Array(file.buffer);
    await this.prisma.$transaction([
      this.prisma.userAvatar.upsert({
        where: { userId },
        create: { userId, data, mimeType },
        update: { data, mimeType },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt: new Date() } }),
    ]);
    return this.auth.getSessionUser(userId);
  }

  async removeAvatar(userId: string): Promise<SessionUser> {
    await this.prisma.$transaction([
      this.prisma.userAvatar.deleteMany({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt: null } }),
    ]);
    return this.auth.getSessionUser(userId);
  }

  async avatar(userId: string) {
    const avatar = await this.prisma.userAvatar.findUnique({ where: { userId } });
    if (!avatar) throw AppException.notFound('NOT_FOUND');
    return avatar;
  }
}
