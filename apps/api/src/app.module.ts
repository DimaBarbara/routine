import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { InvitesModule } from './modules/invites/invites.module.js';
import { SpacesModule } from './modules/spaces/spaces.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    SpacesModule,
    InvitesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
