import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

try {
  process.loadEnvFile();
} catch {
  // env заданий зовні
}

const email = process.env['ADMIN_EMAIL']?.trim().toLowerCase();
const password = process.env['ADMIN_PASSWORD'];
const name = process.env['ADMIN_NAME']?.trim() || 'Admin';

if (!email || !password) {
  console.error('❌ Задайте ADMIN_EMAIL і ADMIN_PASSWORD у .env');
  process.exit(1);
}
if (password.length < 8) {
  console.error('❌ ADMIN_PASSWORD має бути щонайменше 8 символів');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Ідемпотентно: повторний запуск лише гарантує права адміна, пароль не чіпає.
    if (!existing.isAdmin) {
      await prisma.user.update({ where: { id: existing.id }, data: { isAdmin: true } });
    }
    console.log(`✅ Адмін ${email} уже існує`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        isAdmin: true,
        passwordHash: await hash(password),
        memberships: {
          create: { role: 'OWNER', space: { create: { name: 'Personal', isPersonal: true } } },
        },
      },
    });
    console.log(`✅ Створено адміна ${email}`);
  }
} finally {
  await prisma.$disconnect();
}
