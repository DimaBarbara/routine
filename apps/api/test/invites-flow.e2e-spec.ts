import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import type {
  AcceptInviteResult,
  ApiErrorBody,
  CreatedInvite,
  InvitePreview,
  SessionUser,
  SpaceMember,
} from '@routine/contracts';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { assertTestDatabase } from './test-db.js';

const ADMIN = { email: 'admin@test.local', password: 'admin-password', name: 'Адмін' };
const FRIEND = { email: 'friend@test.local', password: 'friend-password', name: 'Друг' };
const PARTNER = { email: 'partner@test.local', password: 'partner-password', name: 'Дівчина' };

const tokenOf = (invite: CreatedInvite) => invite.url.split('/invite/')[1] ?? '';

describe('Інвайти, простори та спільний лічильник (e2e)', () => {
  let app: INestApplication<Server>;
  let admin: ReturnType<typeof request.agent>;
  let friend: ReturnType<typeof request.agent>;
  let partner: ReturnType<typeof request.agent>;

  let adminSpaceId: string;
  let friendSpaceId: string;
  let partnerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    const prisma = app.get(PrismaService);
    assertTestDatabase(process.env['DATABASE_URL']);
    await prisma.$executeRawUnsafe('TRUNCATE "public"."User", "public"."Space" CASCADE');
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        name: ADMIN.name,
        isAdmin: true,
        passwordHash: await hash(ADMIN.password),
        memberships: {
          create: { role: 'OWNER', space: { create: { name: 'Особистий', isPersonal: true } } },
        },
      },
    });

    admin = request.agent(app.getHttpServer());
    friend = request.agent(app.getHttpServer());
    partner = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('health відкритий, усе інше вимагає входу', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('невідомий маршрут віддає JSON із кодом, а не HTML Express', async () => {
    const res = await request(app.getHttpServer()).get('/api/definitely-missing').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('відхиляє невірний пароль тим самим повідомленням, що й неіснуючу пошту', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'nope-nope' })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'nope-nope' })
      .expect(401);

    expect((wrongPassword.body as ApiErrorBody).code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('адмін входить і отримує httpOnly-сесію', async () => {
    const res = await admin
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: ADMIN.password })
      .expect(200);

    expect(String(res.headers['set-cookie'])).toMatch(/routine_session=.+HttpOnly/);
    const me = res.body as SessionUser;
    expect(me.isAdmin).toBe(true);
    expect(me.spaces).toHaveLength(1);
    adminSpaceId = me.spaces[0]!.id;
  });

  it('друг реєструється за реєстраційним інвайтом і отримує лише власний простір', async () => {
    const invite = (
      await admin.post('/api/invites').send({ email: FRIEND.email, spaceId: null }).expect(201)
    ).body as CreatedInvite;
    expect(invite.space).toBeNull();

    const preview = (
      await request(app.getHttpServer())
        .get(`/api/invites/preview/${tokenOf(invite)}`)
        .expect(200)
    ).body as InvitePreview;
    expect(preview).toMatchObject({ email: FRIEND.email, spaceName: null, accountExists: false });

    const me = (
      await friend
        .post('/api/auth/register')
        .send({ token: tokenOf(invite), name: FRIEND.name, password: FRIEND.password })
        .expect(201)
    ).body as SessionUser;

    expect(me.email).toBe(FRIEND.email);
    expect(me.isAdmin).toBe(false);
    expect(me.spaces).toHaveLength(1);
    expect(me.spaces[0]).toMatchObject({ isPersonal: true, role: 'OWNER' });
    friendSpaceId = me.spaces[0]!.id;
  });

  it('не-адмін не може видати реєстраційний інвайт', async () => {
    await friend
      .post('/api/invites')
      .send({ email: 'someone@test.local', spaceId: null })
      .expect(403);
  });

  it('учасник без ролі OWNER не може кликати в чужий простір', async () => {
    await friend
      .post('/api/invites')
      .send({ email: 'x@test.local', spaceId: adminSpaceId })
      .expect(404);
  });

  it('дівчина реєструється за інвайтом у простір адміна і бачить обидва простори', async () => {
    const invite = (
      await admin
        .post('/api/invites')
        .send({ email: PARTNER.email, spaceId: adminSpaceId })
        .expect(201)
    ).body as CreatedInvite;
    partnerToken = tokenOf(invite);

    const me = (
      await partner
        .post('/api/auth/register')
        .send({ token: partnerToken, name: PARTNER.name, password: PARTNER.password })
        .expect(201)
    ).body as SessionUser;

    expect(me.spaces.map((space) => space.id)).toContain(adminSpaceId);
    expect(me.spaces).toHaveLength(2);
    expect(me.spaces.find((space) => space.id === adminSpaceId)?.role).toBe('MEMBER');
  });

  it('інвайт одноразовий', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ token: partnerToken, name: 'Хтось', password: 'another-password' })
      .expect(400);
  });

  it('учасники простору бачать одне одного', async () => {
    const members = (await partner.get(`/api/spaces/${adminSpaceId}/members`).expect(200))
      .body as SpaceMember[];
    expect(members.map((member) => member.email).sort()).toEqual([ADMIN.email, PARTNER.email]);
  });

  it('чужий простір віддає 404 і не розкриває даних', async () => {
    await friend.get(`/api/spaces/${adminSpaceId}/members`).expect(404);
    await partner.get(`/api/spaces/${friendSpaceId}/members`).expect(404);
    await friend.get(`/api/spaces/does-not-exist/members`).expect(404);
  });

  it('існуючий користувач приймає інвайт після входу, а не реєструється', async () => {
    const invite = (
      await friend
        .post('/api/invites')
        .send({ email: ADMIN.email, spaceId: friendSpaceId })
        .expect(201)
    ).body as CreatedInvite;

    const preview = (
      await request(app.getHttpServer())
        .get(`/api/invites/preview/${tokenOf(invite)}`)
        .expect(200)
    ).body as InvitePreview;
    expect(preview.accountExists).toBe(true);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ token: tokenOf(invite), name: 'Двійник', password: 'double-password' })
      .expect(409);

    // Чужий акаунт не може забрати запрошення, адресоване іншій пошті.
    await partner
      .post('/api/invites/accept')
      .send({ token: tokenOf(invite) })
      .expect(403);

    const accepted = (
      await admin
        .post('/api/invites/accept')
        .send({ token: tokenOf(invite) })
        .expect(201)
    ).body as AcceptInviteResult;
    expect(accepted.spaceId).toBe(friendSpaceId);

    const me = (await admin.get('/api/auth/me').expect(200)).body as SessionUser;
    expect(me.spaces).toHaveLength(2);
  });

  it('відкликаний інвайт більше не працює', async () => {
    const invite = (
      await admin.post('/api/invites').send({ email: 'late@test.local', spaceId: null }).expect(201)
    ).body as CreatedInvite;

    await admin.delete(`/api/invites/${invite.id}`).expect(200);
    await request(app.getHttpServer())
      .get(`/api/invites/preview/${tokenOf(invite)}`)
      .expect(400);
  });

  it('вихід гасить сесію на сервері', async () => {
    await partner.post('/api/auth/logout').expect(204);
    await partner.get('/api/auth/me').expect(401);
  });
});
