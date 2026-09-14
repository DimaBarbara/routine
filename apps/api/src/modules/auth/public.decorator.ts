import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Маршрут доступний без входу. Користувач однаково підставляється, якщо сесія є. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
