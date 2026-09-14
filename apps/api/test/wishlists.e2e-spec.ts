import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import type {
  ApiErrorBody,
  SharedWishlist,
  WishlistDetail,
  WishlistItemDto,
  WishlistShareLink,
  WishlistSummary,
} from '@routine/contracts';
import request from 'supertest';

import type { PrismaService } from '../src/database/prisma.service.js';
import { type Agent, createTestApp, loggedInAgent, seedUser } from './helpers.js';

const OWNER = { email: 'owner@test.local', password: 'owner-password', name: 'Дмитро' };
const PARTNER = { email: 'partner@test.local', password: 'partner-password', name: 'Оля' };
const OUTSIDER = { email: 'outsider@test.local', password: 'outsider-password', name: 'Сусід' };

const shareTokenOf = (link: WishlistShareLink) => link.shareUrl?.split('/w/')[1] ?? '';

describe('Вішлісти (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;

  let owner: Agent;
  let partner: Agent;
  let outsider: Agent;
  let guestA: Agent;
  let guestB: Agent;

  let spaceId: string;
  let outsiderSpaceId: string;
  let wishlistId: string;
  let base: string;
  let coffeeId: string;
  let bookId: string;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma, http } = await createTestApp());

    await seedUser(prisma, OWNER);
    const partnerUser = await seedUser(prisma, PARTNER);
    await seedUser(prisma, OUTSIDER);

    const ownerSession = await loggedInAgent(app, OWNER);
    owner = ownerSession.agent;
    spaceId = ownerSession.me.spaces[0]!.id;

    // Оля — учасниця простору Дмитра (як після прийнятого інвайту).
    await prisma.membership.create({ data: { userId: partnerUser.id, spaceId, role: 'MEMBER' } });
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

  describe('списки та бажання', () => {
    it('власник створює список і додає бажання', async () => {
      const created = (
        await owner
          .post(`/api/spaces/${spaceId}/wishlists`)
          .send({ title: 'День народження', description: '' })
          .expect(201)
      ).body as WishlistSummary;
      expect(created).toMatchObject({
        description: null,
        itemCount: 0,
        owner: { name: OWNER.name },
      });
      wishlistId = created.id;
      base = `/api/spaces/${spaceId}/wishlists/${wishlistId}`;

      const coffee = (
        await owner
          .post(`${base}/items`)
          .send({ title: 'Кавоварка', url: 'https://example.com/coffee', priceMinor: 459900 })
          .expect(201)
      ).body as WishlistItemDto;
      expect(coffee).toMatchObject({ currency: 'UAH', priority: 'MEDIUM', reservation: null });
      coffeeId = coffee.id;

      const book = (
        await owner.post(`${base}/items`).send({ title: 'Книга', priority: 'HIGH' }).expect(201)
      ).body as WishlistItemDto;
      bookId = book.id;
    });

    it('відхиляє небезпечні й некоректні дані', async () => {
      const res = await owner
        .post(`${base}/items`)
        .send({ title: '', url: 'javascript:alert(1)', priceMinor: 12.5 })
        .expect(400);
      const body = res.body as ApiErrorBody;
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.issues).toEqual(
        expect.arrayContaining([
          { path: 'title', message: 'validation.required' },
          { path: 'url', message: 'validation.urlInvalid' },
          { path: 'priceMinor', message: 'validation.priceInvalid' },
        ]),
      );
    });

    it('часткове оновлення не скидає незмінені поля', async () => {
      await owner.patch(`${base}/items/${coffeeId}`).send({ currency: 'EUR' }).expect(200);
      const updated = (
        await owner.patch(`${base}/items/${coffeeId}`).send({ priority: 'LOW' }).expect(200)
      ).body as WishlistItemDto;
      expect(updated).toMatchObject({ currency: 'EUR', priority: 'LOW', priceMinor: 459900 });
    });

    it('учасник простору бачить список; бажання відсортовані за пріоритетом', async () => {
      const lists = (await partner.get(`/api/spaces/${spaceId}/wishlists`).expect(200))
        .body as WishlistSummary[];
      expect(lists).toHaveLength(1);
      expect(lists[0]).toMatchObject({ itemCount: 2 });

      const detail = (await partner.get(base).expect(200)).body as WishlistDetail;
      expect(detail.items.map((item) => item.title)).toEqual(['Книга', 'Кавоварка']);
      expect(detail.items[0]!.reservation).toEqual({ status: 'FREE' });
    });
  });

  describe('резервації в просторі', () => {
    it('учасниця резервує подарунок і бачить, що він її', async () => {
      const item = (await partner.post(`${base}/items/${bookId}/reservation`).expect(201))
        .body as WishlistItemDto;
      expect(item.reservation).toEqual({ status: 'RESERVED_BY_YOU' });
    });

    it('власник не бачить резервацій ні в списку, ні в окремому бажанні', async () => {
      const detail = (await owner.get(base).expect(200)).body as WishlistDetail;
      expect(detail.items.every((item) => item.reservation === null)).toBe(true);

      const edited = (
        await owner.patch(`${base}/items/${bookId}`).send({ note: 'Тверда обкладинка' })
      ).body as WishlistItemDto;
      expect(edited.reservation).toBeNull();
    });

    it('власник не може резервувати зі свого списку', async () => {
      const res = await owner.post(`${base}/items/${coffeeId}/reservation`).expect(403);
      expect((res.body as ApiErrorBody).code).toBe('WISHLIST_OWNER_CANNOT_RESERVE');
    });

    it('двічі зарезервувати одне бажання не можна', async () => {
      const res = await partner.post(`${base}/items/${bookId}/reservation`).expect(409);
      expect((res.body as ApiErrorBody).code).toBe('WISHLIST_ALREADY_RESERVED');
    });
  });

  describe('ізоляція просторів', () => {
    it('чужий простір — 404 без жодних даних', async () => {
      await outsider.get(`/api/spaces/${spaceId}/wishlists`).expect(404);
      await outsider.get(base).expect(404);
    });

    it('чужий wishlistId або itemId у своєму просторі — теж 404', async () => {
      const foreign = `/api/spaces/${outsiderSpaceId}/wishlists/${wishlistId}`;
      await outsider.get(foreign).expect(404);
      await outsider.patch(foreign).send({ title: 'Зламано' }).expect(404);
      await outsider.delete(foreign).expect(404);
      await outsider.post(`${foreign}/items`).send({ title: 'x' }).expect(404);
      await outsider.post(`${foreign}/share`).expect(404);

      const ownList = (
        await outsider.post(`/api/spaces/${outsiderSpaceId}/wishlists`).send({ title: 'Своє' })
      ).body as WishlistSummary;
      const ownBase = `/api/spaces/${outsiderSpaceId}/wishlists/${ownList.id}`;
      await outsider.patch(`${ownBase}/items/${coffeeId}`).send({ title: 'x' }).expect(404);
      await outsider.delete(`${ownBase}/items/${coffeeId}`).expect(404);
      await outsider.post(`${ownBase}/items/${coffeeId}/reservation`).expect(404);

      const coffee = await prisma.wishlistItem.findUniqueOrThrow({ where: { id: coffeeId } });
      expect(coffee.title).toBe('Кавоварка');
    });
  });

  describe('публічне посилання', () => {
    it('власник вмикає посилання', async () => {
      const link = (await owner.post(`${base}/share`).expect(201)).body as WishlistShareLink;
      expect(link.shareUrl).toMatch(/^http:\/\/localhost:3000\/w\/.+/);
      token = shareTokenOf(link);

      const detail = (await partner.get(base)).body as WishlistDetail;
      expect(detail.shareUrl).toBe(link.shareUrl);
    });

    it('гість бачить «зайнято», але не бачить, хто зарезервував', async () => {
      const shared = (await guestA.get(`/api/shared/wishlists/${token}`).expect(200))
        .body as SharedWishlist;
      expect(shared).toMatchObject({ ownerName: OWNER.name, viewer: 'GUEST' });
      const book = shared.items.find((item) => item.id === bookId);
      expect(book?.reservation).toEqual({ status: 'RESERVED', by: null });
    });

    it('гість без імені не резервує, з іменем — отримує cookie і свою резервацію', async () => {
      const noName = await guestA
        .post(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
        .send({})
        .expect(400);
      expect((noName.body as ApiErrorBody).code).toBe('WISHLIST_GUEST_NAME_REQUIRED');

      const res = await guestA
        .post(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
        .send({ guestName: 'Тітка Галя' })
        .expect(201);
      expect(String(res.headers['set-cookie'])).toMatch(/routine_guest=.+HttpOnly/);
      expect((res.body as WishlistItemDto).reservation).toEqual({ status: 'RESERVED_BY_YOU' });
    });

    it('інший гість бачить «зайнято» і не може скасувати чужу резервацію', async () => {
      const shared = (await guestB.get(`/api/shared/wishlists/${token}`)).body as SharedWishlist;
      expect(shared.items.find((item) => item.id === coffeeId)?.reservation).toEqual({
        status: 'RESERVED',
        by: null,
      });

      await guestB
        .post(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
        .send({ guestName: 'Дядько Петро' })
        .expect(409);
      await guestB
        .delete(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
        .expect(404);
    });

    it('учасниця простору бачить імʼя гостя, власник — нічого', async () => {
      const seenByPartner = (await partner.get(base)).body as WishlistDetail;
      expect(seenByPartner.items.find((item) => item.id === coffeeId)?.reservation).toEqual({
        status: 'RESERVED',
        by: 'Тітка Галя',
      });

      const sharedAsOwner = (await owner.get(`/api/shared/wishlists/${token}`))
        .body as SharedWishlist;
      expect(sharedAsOwner.viewer).toBe('OWNER');
      expect(sharedAsOwner.items.every((item) => item.reservation === null)).toBe(true);
      await owner
        .post(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
        .send({ guestName: 'Хитрун' })
        .expect(403);
    });

    it('гість скасовує свою резервацію', async () => {
      const item = (
        await guestA
          .delete(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
          .expect(200)
      ).body as WishlistItemDto;
      expect(item.reservation).toEqual({ status: 'FREE' });
    });

    it('залогінений не-учасник резервує від свого імені', async () => {
      const item = (
        await outsider
          .post(`/api/shared/wishlists/${token}/items/${coffeeId}/reservation`)
          .send({})
          .expect(201)
      ).body as WishlistItemDto;
      expect(item.reservation).toEqual({ status: 'RESERVED_BY_YOU' });

      const seenByPartner = (await partner.get(base)).body as WishlistDetail;
      expect(seenByPartner.items.find((i) => i.id === coffeeId)?.reservation).toEqual({
        status: 'RESERVED',
        by: OUTSIDER.name,
      });
    });

    it('перевипуск посилання вбиває старе, вимкнення — поточне', async () => {
      const renewed = shareTokenOf(
        (await owner.post(`${base}/share`).expect(201)).body as WishlistShareLink,
      );
      expect(renewed).not.toBe(token);
      await http().get(`/api/shared/wishlists/${token}`).expect(404);
      await http().get(`/api/shared/wishlists/${renewed}`).expect(200);

      const disabled = (await owner.delete(`${base}/share`).expect(200)).body as WishlistShareLink;
      expect(disabled.shareUrl).toBeNull();
      await http().get(`/api/shared/wishlists/${renewed}`).expect(404);
    });
  });

  describe('видалення', () => {
    it('видалення списку прибирає бажання й резервації', async () => {
      await owner.delete(base).expect(204);
      await owner.get(base).expect(404);
      expect(await prisma.wishlistItem.count({ where: { wishlistId } })).toBe(0);
      expect(
        await prisma.wishReservation.count({ where: { itemId: { in: [coffeeId, bookId] } } }),
      ).toBe(0);
    });
  });
});
