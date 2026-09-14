import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * Спільна конфігурація для bootstrap та e2e-тестів,
 * щоб тести ганяли рівно ту саму поведінку, що й прод.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  return app;
}
