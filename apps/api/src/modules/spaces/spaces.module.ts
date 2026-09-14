import { Module } from '@nestjs/common';

import { SpaceMemberGuard } from './space-member.guard.js';
import { SpacesController } from './spaces.controller.js';
import { SpacesService } from './spaces.service.js';

@Module({
  controllers: [SpacesController],
  providers: [SpacesService, SpaceMemberGuard],
  exports: [SpacesService, SpaceMemberGuard],
})
export class SpacesModule {}
