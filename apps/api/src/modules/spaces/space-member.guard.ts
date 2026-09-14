import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

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

    if (!request.user) throw new UnauthorizedException('Потрібно увійти');
    if (typeof spaceId !== 'string') throw new NotFoundException('Простір не знайдено');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_spaceId: { userId: request.user.id, spaceId } },
    });
    if (!membership) throw new NotFoundException('Простір не знайдено');

    request.membership = { spaceId, role: membership.role };
    return true;
  }
}
