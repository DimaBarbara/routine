import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * Спільна конфігурація для bootstrap та e2e-тестів,
 * щоб тести ганяли рівно ту саму поведінку, що й прод.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  // Саме '/api', а не 'api': Nest 12 + Express 5 реєструє 404-обробник через app.use(prefix),
  // і без слеша він не спрацьовує — невідомі маршрути віддавали HTML Express замість JSON.
  app.setGlobalPrefix('/api');
  app.use(cookieParser());
  return app;
}
