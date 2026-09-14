import { defineConfig } from 'prisma/config';

// Prisma CLI не читає .env сам. Відсутній файл — нормально (прод, CI).
try {
  process.loadEnvFile();
} catch {
  // env уже заданий зовні
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
