import { AppException } from '../../common/app-exception.js';
import type { PrismaService } from '../../database/prisma.service.js';

export const personSelect = { select: { id: true, name: true } } as const;

/** Операцію можна приписати лише учаснику цього простору. */
export async function assertPerson(
  prisma: PrismaService,
  spaceId: string,
  personId: string | null,
) {
  if (personId === null) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_spaceId: { userId: personId, spaceId } },
  });
  if (!membership) throw AppException.badRequest('FINANCE_INVALID_PERSON');
}

export async function listMembers(prisma: PrismaService, spaceId: string) {
  const memberships = await prisma.membership.findMany({
    where: { spaceId },
    include: { user: personSelect },
    orderBy: { joinedAt: 'asc' },
  });
  return memberships.map((membership) => membership.user);
}
