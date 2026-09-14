import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import type {
  ApiErrorBody,
  SharedWishBoard,
  WishBoard,
  WishItemDto,
  WishShareLinkDto,
  WishStatus,
} from '@routine/contracts';
import request from 'supertest';

import type { PrismaService } from '../src/database/prisma.service.js';
import { type Agent, createTestApp, loggedInAgent, seedUser } from './helpers.js';

const OWNER = { email: 'owner@test.local', password: 'owner-password', name: 'Дмитро' };
const PARTNER = { email: 'partner@test.local', password: 'partner-password', name: 'Оля' };
const OUTSIDER = { email: 'outsider@test.local', password: 'outsider-password', name: 'Сусід' };

const tokenOf = (link: WishShareLinkDto) => link.shareUrl?.split('/w/')[1] ?? '';
const codeOf = (res: request.Response) => (res.body as ApiErrorBody).code;

describe('Вішліст-дошка (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;

  let owner: Agent;
  let partner: Agent;
  let outsider: Agent;
  let guestA: Agent;
  let guestB: Agent;

  let ownerId: string;
  let partnerId: string;
  let spaceId: string;
  let outsiderSpaceId: string;
  let base: string;
  let token: string;

  const ids: Record<string, string> = {};

  const board = async (agent: Agent = owner) =>
    (await agent.get(base).expect(200)).body as WishBoard;
  const column = (b: WishBoard, status: WishStatus) =>
    b.items.filter((item) => item.status === status).map((item) => item.title);
  const find = (items: WishItemDto[], id: string | undefined) =>
    items.find((item) => item.id === id);
  const create = async (body: Record<string, unknown>, agent: Agent = owner) =>
    (await agent.post(`${base}/items`).send(body).expect(201)).body as WishItemDto;
  const move = async (id: string, body: Record<string, unknown>) =>
    (await owner.post(`${base}/items/${id}/move`).send(body).expect(200)).body as WishItemDto;

  beforeAll(async () => {
    ({ app, prisma, http } = await createTestApp());

    ownerId = (await seedUser(prisma, OWNER)).id;
    partnerId = (await seedUser(prisma, PARTNER)).id;
    await seedUser(prisma, OUTSIDER);

    const ownerSession = await loggedInAgent(app, OWNER);
    owner = ownerSession.agent;
    spaceId = ownerSession.me.spaces[0]!.id;
    base = `/api/spaces/${spaceId}/wishlist`;

    await prisma.membership.create({ data: { userId: partnerId, spaceId, role: 'MEMBER' } });
    partner = (await loggedInAgent(app, PARTNER)).agent;

    const outsiderSession = await loggedInAgent(app, OUTSIDER);
    outsider = outsiderSession.agent;
    outsiderSpaceId = outsiderSession.me.spaces[0]!.id;

    guestA = request.agent(app.getHttpServer());
    guestB = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('дошка', () => {
    it('порожня дошка знає учасників простору', async () => {
      const b = await board();
      expect(b.items).toEqual([]);
      expect(b.members.map((member) => member.name)).toEqual([OWNER.name, PARTNER.name]);
      expect(b.shareUrl).toBeNull();
    });

    it('створює бажання: за замовчуванням «Бажання», для себе, нагору колонки', async () => {
      const dumbbells = await create({ title: 'Гантелі', category: 'SPORT', priceMinor: 250000 });
      expect(dumbbells).toMatchObject({
        status: 'WANT',
        category: 'SPORT',
        owner: { id: ownerId, name: OWNER.name },
        doneKind: null,
        reservation: null,
      });
      ids.dumbbells = dumbbells.id;

      ids.cream = (await create({ title: 'Крем', category: 'BEAUTY', ownerId: partnerId })).id;
      ids.vacuum = (
        await create({ title: 'Пилосос', category: 'HOME', status: 'NEED', ownerId: null })
      ).id;
      ids.maybe = (await create({ title: 'Електросамокат', status: 'THINKING' })).id;

      const b = await board();
      expect(column(b, 'WANT')).toEqual(['Крем', 'Гантелі']);
      expect(find(b.items, ids.vacuum)?.owner).toBeNull();
    });

    it('відхиляє небезпечні дані й чужих «власників»', async () => {
      const bad = await owner
        .post(`${base}/items`)
        .send({ title: '', url: 'javascript:alert(1)', category: 'CARS' })
        .expect(400);
      expect((bad.body as ApiErrorBody).issues).toEqual(
        expect.arrayContaining([
          { path: 'title', message: 'validation.required' },
          { path: 'url', message: 'validation.urlInvalid' },
          { path: 'category', message: 'validation.invalid' },
        ]),
      );

      const outsiderRecord = await prisma.user.findUniqueOrThrow({
        where: { email: OUTSIDER.email },
      });
      const foreignOwner = await owner
        .post(`${base}/items`)
        .send({ title: 'x', ownerId: outsiderRecord.id })
        .expect(400);
      expect(codeOf(foreignOwner)).toBe('WISHLIST_INVALID_OWNER');
    });

    it('часткове оновлення не чіпає інших полів; нова колонка — нагору', async () => {
      await owner.patch(`${base}/items/${ids.dumbbells}`).send({ priority: 'HIGH' }).expect(200);
      const moved = (
        await owner.patch(`${base}/items/${ids.dumbbells}`).send({ status: 'NEED' }).expect(200)
      ).body as WishItemDto;
      expect(moved).toMatchObject({ priority: 'HIGH', category: 'SPORT', priceMinor: 250000 });
      expect(column(await board(), 'NEED')).toEqual(['Гантелі', 'Пилосос']);
    });
  });

  describe('перетягування', () => {
    it('ставить картку після вказаної або на самий верх', async () => {
      await move(ids.dumbbells!, { status: 'NEED', afterId: ids.vacuum });
      expect(column(await board(), 'NEED')).toEqual(['Пилосос', 'Гантелі']);

      await move(ids.dumbbells!, { status: 'NEED', afterId: null });
      expect(column(await board(), 'NEED')).toEqual(['Гантелі', 'Пилосос']);
    });

    it('«Виконано» запамʼятовує, як саме, а повернення назад це скидає', async () => {
      const done = await move(ids.cream!, { status: 'DONE', afterId: null, doneKind: 'GIFTED' });
      expect(done).toMatchObject({ status: 'DONE', doneKind: 'GIFTED' });
      expect(done.doneAt).not.toBeNull();

      const back = await move(ids.cream!, { status: 'WANT', afterId: null });
      expect(back).toMatchObject({ doneKind: null, doneAt: null });
    });

    it('не губить порядок, коли між сусідами закінчується точність', async () => {
      const top = await create({ title: 'Верх', status: 'THINKING' });
      await move(top.id, { status: 'THINKING', afterId: null });
      const expected = ['Верх'];

      // Кожна нова картка стає одразу після «Верх» — проміжок щоразу ділиться навпіл.
      for (let i = 1; i <= 35; i += 1) {
        const card = await create({ title: `К${i}`, status: 'THINKING' });
        await move(card.id, { status: 'THINKING', afterId: top.id });
        expected.splice(1, 0, `К${i}`);
      }
      expected.push('Електросамокат');

      expect(column(await board(), 'THINKING')).toEqual(expected);
      await prisma.wishItem.deleteMany({
        where: { spaceId, title: { in: expected.filter((t) => t !== 'Електросамокат') } },
      });
    });

    it('afterId з іншої колонки чи простору — 404', async () => {
      const res = await owner
        .post(`${base}/items/${ids.dumbbells}/move`)
        .send({ status: 'NEED', afterId: ids.cream })
        .expect(404);
      expect(codeOf(res)).toBe('WISHLIST_ITEM_NOT_FOUND');
    });
  });

  describe('резервації в просторі', () => {
    it('Оля резервує бажання Дмитра; Дмитро цього не бачить', async () => {
      const item = (await partner.post(`${base}/items/${ids.dumbbells}/reservation`).expect(201))
        .body as WishItemDto;
      expect(item.reservation).toEqual({ status: 'RESERVED_BY_YOU' });
      expect(find((await board(owner)).items, ids.dumbbells)?.reservation).toBeNull();
    });

    it('своє бажання не зарезервуєш; чуже — навзаєм приховане від його власниці', async () => {
      expect(
        codeOf(await owner.post(`${base}/items/${ids.dumbbells}/reservation`).expect(403)),
      ).toBe('WISHLIST_OWNER_CANNOT_RESERVE');
      expect(codeOf(await partner.post(`${base}/items/${ids.cream}/reservation`).expect(403))).toBe(
        'WISHLIST_OWNER_CANNOT_RESERVE',
      );

      await owner.post(`${base}/items/${ids.cream}/reservation`).expect(201);
      expect(find((await board(partner)).items, ids.cream)?.reservation).toBeNull();
      expect(find((await board(owner)).items, ids.cream)?.reservation).toEqual({
        status: 'RESERVED_BY_YOU',
      });
    });

    it('спільне бажання видно зарезервованим обом', async () => {
      await owner.post(`${base}/items/${ids.vacuum}/reservation`).expect(201);
      expect(find((await board(partner)).items, ids.vacuum)?.reservation).toEqual({
        status: 'RESERVED',
        by: OWNER.name,
      });
    });

    it('«Роздуми» не резервуються, двічі — теж ні', async () => {
      expect(codeOf(await partner.post(`${base}/items/${ids.maybe}/reservation`).expect(409))).toBe(
        'WISHLIST_ITEM_NOT_RESERVABLE',
      );
      expect(codeOf(await owner.post(`${base}/items/${ids.vacuum}/reservation`).expect(409))).toBe(
        'WISHLIST_ALREADY_RESERVED',
      );
    });
  });

  describe('ізоляція просторів', () => {
    it('чужий простір — 404', async () => {
      await outsider.get(base).expect(404);
      await outsider.post(`${base}/items`).send({ title: 'x' }).expect(404);
    });

    it('чужий itemId у своєму просторі — теж 404, дані не змінюються', async () => {
      const own = `/api/spaces/${outsiderSpaceId}/wishlist/items/${ids.dumbbells}`;
      await outsider.patch(own).send({ title: 'Зламано' }).expect(404);
      await outsider.post(`${own}/move`).send({ status: 'DONE', afterId: null }).expect(404);
      await outsider.post(`${own}/reservation`).expect(404);
      await outsider.delete(own).expect(404);

      const item = await prisma.wishItem.findUniqueOrThrow({ where: { id: ids.dumbbells } });
      expect(item).toMatchObject({ title: 'Гантелі', status: 'NEED' });
    });
  });

  describe('особисте посилання', () => {
    it('показує лише бажання цієї людини з «Бажань» і «Потреб»', async () => {
      token = tokenOf((await owner.post(`${base}/share`).expect(201)).body as WishShareLinkDto);
      ids.watch = (await create({ title: 'Годинник', category: 'CLOTHES' })).id;
      await create({ title: 'Вже купив', status: 'DONE' });

      const shared = (await guestA.get(`/api/shared/wishlist/${token}`).expect(200))
        .body as SharedWishBoard;
      expect(shared).toMatchObject({ ownerName: OWNER.name, viewer: 'GUEST' });
      expect(shared.items.map((item) => item.title).sort()).toEqual(['Гантелі', 'Годинник']);
      expect(find(shared.items, ids.dumbbells)?.reservation).toEqual({
        status: 'RESERVED',
        by: null,
      });

      expect((await board(partner)).shareUrl).toBeNull();
    });

    it('гість резервує з імʼям і cookie, інший гість не може скасувати', async () => {
      const path = `/api/shared/wishlist/${token}/items/${ids.watch}/reservation`;
      expect(codeOf(await guestA.post(path).send({}).expect(400))).toBe(
        'WISHLIST_GUEST_NAME_REQUIRED',
      );

      const res = await guestA.post(path).send({ guestName: 'Тітка Галя' }).expect(201);
      expect(String(res.headers['set-cookie'])).toMatch(/routine_guest=.+HttpOnly/);
      expect((res.body as WishItemDto).reservation).toEqual({ status: 'RESERVED_BY_YOU' });

      await guestB.post(path).send({ guestName: 'Дядько Петро' }).expect(409);
      await guestB.delete(path).expect(404);

      expect(find((await board(partner)).items, ids.watch)?.reservation).toEqual({
        status: 'RESERVED',
        by: 'Тітка Галя',
      });
    });

    it('власник за своїм посиланням не бачить резервацій і не резервує', async () => {
      const shared = (await owner.get(`/api/shared/wishlist/${token}`)).body as SharedWishBoard;
      expect(shared.viewer).toBe('OWNER');
      expect(shared.items.every((item) => item.reservation === null)).toBe(true);
      await owner
        .post(`/api/shared/wishlist/${token}/items/${ids.watch}/reservation`)
        .send({})
        .expect(403);
    });

    it('через посилання не дістатися чужих, спільних і нерезервованих бажань', async () => {
      for (const id of [ids.cream, ids.vacuum, ids.maybe]) {
        await guestA
          .post(`/api/shared/wishlist/${token}/items/${id}/reservation`)
          .send({ guestName: 'Хитрун' })
          .expect(404);
      }
    });

    it('перенесене у «Виконано» зникає зі сторінки; гість скасовує своє', async () => {
      await guestA
        .delete(`/api/shared/wishlist/${token}/items/${ids.watch}/reservation`)
        .expect(200);
      await move(ids.watch!, { status: 'DONE', afterId: null, doneKind: 'BOUGHT' });
      const shared = (await guestA.get(`/api/shared/wishlist/${token}`)).body as SharedWishBoard;
      expect(find(shared.items, ids.watch)).toBeUndefined();
    });

    it('перевипуск вбиває старе посилання, вимкнення — поточне', async () => {
      const renewed = tokenOf(
        (await owner.post(`${base}/share`).expect(201)).body as WishShareLinkDto,
      );
      await http().get(`/api/shared/wishlist/${token}`).expect(404);
      await http().get(`/api/shared/wishlist/${renewed}`).expect(200);

      await owner.delete(`${base}/share`).expect(200);
      await http().get(`/api/shared/wishlist/${renewed}`).expect(404);
    });
  });

  it('видалення бажання прибирає і резервацію', async () => {
    await owner.delete(`${base}/items/${ids.cream}`).expect(204);
    await owner.delete(`${base}/items/${ids.cream}`).expect(404);
    expect(await prisma.wishReservation.count({ where: { itemId: ids.cream } })).toBe(0);
  });
});
