import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { SpaceMember, SpaceSummary } from '@routine/contracts';

import type { AuthUser } from '../../common/request.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SpaceMemberGuard } from './space-member.guard.js';
import { SpacesService } from './spaces.service.js';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SpaceSummary[]> {
    return this.spaces.listForUser(user.id);
  }

  @Get(':spaceId/members')
  @UseGuards(SpaceMemberGuard)
  members(@Param('spaceId') spaceId: string): Promise<SpaceMember[]> {
    return this.spaces.listMembers(spaceId);
  }
}
