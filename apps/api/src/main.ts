import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Render/Vercel стоять за проксі — без цього secure-cookie не виставиться.
  app.set('trust proxy', 1);
  app.enableCors({ origin: config.get('WEB_URL', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  console.log(`🚀 API is running on http://localhost:${port}/api`);
}

await bootstrap();
