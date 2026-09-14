import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ProfileController, UsersController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController, UsersController],
  providers: [ProfileService],
})
export class ProfileModule {}
