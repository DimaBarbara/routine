import { execSync } from 'node:child_process';

import pg from 'pg';

import { assertTestDatabase, TEST_DATABASE_URL } from './test-db.js';

/**
 * Недеструктивна підготовка: створює тестову базу, якщо її немає, і застосовує
 * міграції. Дані між запусками чистить сам тест — лише в базі *_test.
 */
export default async function setup() {
  const databaseName = assertTestDatabase(TEST_DATABASE_URL);

  const maintenanceUrl = new URL(TEST_DATABASE_URL);
  maintenanceUrl.pathname = '/postgres';
  maintenanceUrl.search = '';

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    // Імʼя вже провалідоване регуляркою в assertTestDatabase.
    if (!rowCount) await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await client.end();
  }

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
