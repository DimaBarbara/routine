import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

import { AppException } from '../../common/app-exception.js';
import type { AppRequest } from '../../common/request.js';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Пускає до /spaces/:spaceId/... лише учасників простору.
 * Чужий простір віддає 404, а не 403 — не підтверджуємо, що він існує.
 */
@Injectable()
export class SpaceMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const spaceId = request.params['spaceId'];

    if (!request.user) throw AppException.unauthorized();
    if (typeof spaceId !== 'string') throw AppException.notFound('SPACE_NOT_FOUND');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_spaceId: { userId: request.user.id, spaceId } },
    });
    if (!membership) throw AppException.notFound('SPACE_NOT_FOUND');

    request.membership = { spaceId, role: membership.role };
    return true;
  }
}
