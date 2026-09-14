import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import type { SessionUser } from '@routine/contracts';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { ClockService } from '../src/common/clock.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { assertTestDatabase } from './test-db.js';

export type Agent = ReturnType<typeof request.agent>;

/** Керований «сьогодні»: тест може перемотувати час для регулярних доходів і депозитів. */
export class TestClock {
  constructor(public current = '2026-09-14') {}
  today() {
    return this.current;
  }
}

export async function createTestApp({ clock }: { clock?: TestClock } = {}) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (clock) builder.overrideProvider(ClockService).useValue(clock);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication<INestApplication<Server>>());
  await app.init();

  const prisma = app.get(PrismaService);
  assertTestDatabase(process.env['DATABASE_URL']);
  // CASCADE прибирає й таблиці модулів (у тому числі схему wishlist).
  await prisma.$executeRawUnsafe('TRUNCATE "public"."User", "public"."Space" CASCADE');

  return { app, prisma, http: () => request(app.getHttpServer()) };
}

export async function seedUser(
  prisma: PrismaService,
  user: { email: string; password: string; name: string; isAdmin?: boolean },
) {
  return prisma.user.create({
    data: {
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin ?? false,
      passwordHash: await hash(user.password),
      memberships: {
        create: { role: 'OWNER', space: { create: { name: 'Personal', isPersonal: true } } },
      },
    },
  });
}

export async function loggedInAgent(
  app: INestApplication<Server>,
  credentials: { email: string; password: string },
): Promise<{ agent: Agent; me: SessionUser }> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/login').send(credentials).expect(200);
  return { agent, me: res.body as SessionUser };
}
