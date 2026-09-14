import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Спільна конфігурація застосунку для bootstrap та e2e-тестів,
 * щоб тести ганяли рівно ту саму поведінку, що й прод.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
