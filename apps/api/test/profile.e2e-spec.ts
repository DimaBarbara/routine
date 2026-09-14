import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import type { ApiErrorBody, SessionUser, SpaceMember } from '@routine/contracts';
import type request from 'supertest';

import type { PrismaService } from '../src/database/prisma.service.js';
import { type Agent, createTestApp, loggedInAgent, seedUser } from './helpers.js';

const USER = { email: 'me@test.local', password: 'old-password', name: 'Дмитро' };

/** Сигнатура PNG + трохи даних: сервіс перевіряє саме байти, а не розширення. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

describe('Профіль (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;
  let me: Agent;
  let laptop: Agent;
  let userId: string;

  beforeAll(async () => {
    ({ app, prisma, http } = await createTestApp());
    userId = (await seedUser(prisma, USER)).id;
    me = (await loggedInAgent(app, USER)).agent;
    laptop = (await loggedInAgent(app, USER)).agent;
  });

  afterAll(async () => {
    await app.close();
  });

  it('змінює імʼя — воно одразу видно в сесії й серед учасників', async () => {
    const updated = (await me.patch('/api/profile').send({ name: '  Дмитро Б.  ' }).expect(200))
      .body as SessionUser;
    expect(updated.name).toBe('Дмитро Б.');

    const members = (await me.get(`/api/spaces/${updated.spaces[0]!.id}/members`).expect(200))
      .body as SpaceMember[];
    expect(members[0]).toMatchObject({ name: 'Дмитро Б.', avatarUrl: null });

    const tooShort = await me.patch('/api/profile').send({ name: 'Д' }).expect(400);
    expect((tooShort.body as ApiErrorBody).issues).toEqual([
      { path: 'name', message: 'validation.nameMin' },
    ]);
  });

  it('фото: лише справжнє зображення; URL версійований і віддається з правильними заголовками', async () => {
    const fake = await me
      .put('/api/profile/avatar')
      .attach('file', Buffer.from('<html><script>alert(1)</script>'), {
        filename: 'evil.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect((fake.body as ApiErrorBody).code).toBe('PROFILE_AVATAR_INVALID');
    await me.put('/api/profile/avatar').expect(400);

    const withPhoto = (
      await me
        .put('/api/profile/avatar')
        .attach('file', PNG, { filename: 'me.png', contentType: 'image/png' })
        .expect(200)
    ).body as SessionUser;
    expect(withPhoto.avatarUrl).toMatch(new RegExp(`^/api/users/${userId}/avatar\\?v=\\d+$`));

    const image = await me.get(withPhoto.avatarUrl!).expect(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(image.headers['x-content-type-options']).toBe('nosniff');
    expect(image.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(image.body as Buffer, PNG)).toBe(0);

    await http().get(withPhoto.avatarUrl!).expect(401);
  });

  it('нове фото змінює URL, видалення — прибирає', async () => {
    const before = ((await me.get('/api/auth/me')).body as SessionUser).avatarUrl;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const after = (
      await me
        .put('/api/profile/avatar')
        .attach('file', PNG, { filename: 'me.png', contentType: 'image/png' })
        .expect(200)
    ).body as SessionUser;
    expect(after.avatarUrl).not.toBe(before);

    const removed = (await me.delete('/api/profile/avatar').expect(200)).body as SessionUser;
    expect(removed.avatarUrl).toBeNull();
    await me.get(`/api/users/${userId}/avatar`).expect(404);
  });

  it('пароль: невірний поточний — помилка; після зміни інші пристрої виходять, поточний — ні', async () => {
    const wrong = await me
      .post('/api/profile/password')
      .send({ currentPassword: 'nope-nope', newPassword: 'new-password' })
      .expect(400);
    expect((wrong.body as ApiErrorBody).code).toBe('PROFILE_WRONG_PASSWORD');

    await me
      .post('/api/profile/password')
      .send({ currentPassword: USER.password, newPassword: 'new-password' })
      .expect(204);

    await me.get('/api/auth/me').expect(200);
    await laptop.get('/api/auth/me').expect(401);

    await http()
      .post('/api/auth/login')
      .send({ email: USER.email, password: USER.password })
      .expect(401);
    await http()
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'new-password' })
      .expect(200);
  });
});
