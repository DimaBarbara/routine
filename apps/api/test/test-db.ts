export const TEST_DATABASE_URL =
  process.env['DATABASE_URL_TEST'] ??
  'postgresql://routine:routine@localhost:5433/routine_test?schema=public';

/** Усе, що чистить дані в тестах, спершу перевіряє, що це саме тестова база. */
export function assertTestDatabase(url: string | undefined): string {
  const name = url ? new URL(url).pathname.slice(1) : '';
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(`Очікувалась тестова база (*_test), отримано: "${name}"`);
  }
  return name;
}
