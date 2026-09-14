import { Injectable } from '@nestjs/common';
import type { SpaceMember, SpaceSummary } from '@routine/contracts';

import { avatarUrl } from '../../common/person.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<SpaceSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        space: {
          include: {
            _count: { select: { memberships: true } },
            memberships: {
              where: { role: 'OWNER' },
              take: 1,
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      // особистий простір — першим
      orderBy: [{ space: { isPersonal: 'desc' } }, { joinedAt: 'asc' }],
    });

    return memberships.map(({ role, space }) => ({
      id: space.id,
      name: space.name,
      isPersonal: space.isPersonal,
      role,
      memberCount: space._count.memberships,
      ownerName: space.memberships[0]?.user.name ?? null,
    }));
  }

  async listMembers(spaceId: string): Promise<SpaceMember[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { spaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(({ user, role, joinedAt }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: avatarUrl(user),
      role,
      joinedAt: joinedAt.toISOString(),
    }));
  }
}
