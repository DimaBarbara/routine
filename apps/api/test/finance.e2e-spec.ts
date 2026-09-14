import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import type {
  ApiErrorBody,
  CashStash,
  DepositDto,
  FinanceAnalytics,
  FinanceMonth,
  RecurringIncomeDto,
  TransactionDto,
} from '@routine/contracts';
import type request from 'supertest';

import type { PrismaService } from '../src/database/prisma.service.js';
import { type Agent, createTestApp, loggedInAgent, seedUser, TestClock } from './helpers.js';

const OWNER = { email: 'owner@test.local', password: 'owner-password', name: 'Дмитро' };
const PARTNER = { email: 'partner@test.local', password: 'partner-password', name: 'Оля' };
const OUTSIDER = { email: 'outsider@test.local', password: 'outsider-password', name: 'Сусід' };

const codeOf = (res: request.Response) => (res.body as ApiErrorBody).code;
const issuesOf = (res: request.Response) =>
  ((res.body as ApiErrorBody).issues ?? []).map((issue) => `${issue.path}:${issue.message}`);

describe('Фінанси (e2e)', () => {
  const clock = new TestClock('2026-09-14');
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let owner: Agent;
  let outsider: Agent;
  let partnerId: string;
  let outsiderId: string;
  let base: string;
  let outsiderBase: string;

  const month = async (value: string, agent: Agent = owner, path = base) =>
    (await agent.get(`${path}/transactions?month=${value}`).expect(200)).body as FinanceMonth;
  const expense = (overrides: Record<string, unknown> = {}) => ({
    type: 'EXPENSE',
    category: 'CAFE',
    amountMinor: 25_000,
    currency: 'UAH',
    date: '2026-09-12',
    note: null,
    personId: null,
    ...overrides,
  });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp({ clock }));

    await seedUser(prisma, OWNER);
    partnerId = (await seedUser(prisma, PARTNER)).id;
    outsiderId = (await seedUser(prisma, OUTSIDER)).id;

    const ownerSession = await loggedInAgent(app, OWNER);
    owner = ownerSession.agent;
    const spaceId = ownerSession.me.spaces[0]!.id;
    base = `/api/spaces/${spaceId}/finance`;
    await prisma.membership.create({ data: { userId: partnerId, spaceId, role: 'MEMBER' } });

    const outsiderSession = await loggedInAgent(app, OUTSIDER);
    outsider = outsiderSession.agent;
    outsiderBase = `/api/spaces/${outsiderSession.me.spaces[0]!.id}/finance`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('операції', () => {
    let cafeId: string;

    it('додає витрати й доходи; валюта перераховується за курсом на дату', async () => {
      const cafe = (
        await owner
          .post(`${base}/transactions`)
          .send(expense({ personId: partnerId }))
          .expect(201)
      ).body as TransactionDto;
      expect(cafe).toMatchObject({
        category: 'CAFE',
        incomeKind: null,
        amountBaseMinor: 25_000,
        person: { name: PARTNER.name },
      });
      cafeId = cafe.id;

      const dollars = (
        await owner
          .post(`${base}/transactions`)
          .send(
            expense({
              category: 'ENTERTAINMENT',
              amountMinor: 1_000,
              currency: 'USD',
              date: '2026-09-10',
            }),
          )
          .expect(201)
      ).body as TransactionDto;
      expect(dollars.amountBaseMinor).toBe(41_000);

      const gift = (
        await owner
          .post(`${base}/transactions`)
          .send({
            type: 'INCOME',
            incomeKind: 'UNPLANNED',
            amountMinor: 500_000,
            currency: 'UAH',
            date: '2026-09-13',
            note: 'Від мами',
            personId: null,
          })
          .expect(201)
      ).body as TransactionDto;
      expect(gift).toMatchObject({ category: null, incomeKind: 'UNPLANNED' });

      const september = await month('2026-09');
      expect(september.transactions.map((t) => t.date)).toEqual([
        '2026-09-13',
        '2026-09-12',
        '2026-09-10',
      ]);
      expect(september.members.map((m) => m.name)).toEqual([OWNER.name, PARTNER.name]);
      expect((await month('2026-08')).transactions).toEqual([]);
    });

    it('валідація: категорія для витрати, тип для доходу, сума, дата, учасник', async () => {
      const res = await owner
        .post(`${base}/transactions`)
        .send({
          type: 'EXPENSE',
          amountMinor: 0,
          currency: 'UAH',
          date: '2026-02-30',
          personId: null,
        })
        .expect(400);
      expect(issuesOf(res)).toEqual(
        expect.arrayContaining([
          'category:validation.required',
          'amountMinor:validation.amountInvalid',
          'date:validation.dateInvalid',
        ]),
      );

      const income = await owner
        .post(`${base}/transactions`)
        .send({
          type: 'INCOME',
          category: 'CAFE',
          amountMinor: 1,
          currency: 'UAH',
          date: '2026-09-01',
          personId: null,
        })
        .expect(400);
      expect(issuesOf(income)).toContain('incomeKind:validation.required');

      const stranger = await owner
        .post(`${base}/transactions`)
        .send(expense({ personId: outsiderId }))
        .expect(400);
      expect(codeOf(stranger)).toBe('FINANCE_INVALID_PERSON');

      await owner.get(`${base}/transactions?month=2026-13`).expect(400);
    });

    it('редагування може змінити тип; видалення — 204, повторно — 404', async () => {
      const updated = (
        await owner
          .patch(`${base}/transactions/${cafeId}`)
          .send({
            type: 'INCOME',
            incomeKind: 'UNPLANNED',
            amountMinor: 30_000,
            currency: 'UAH',
            date: '2026-09-12',
            note: 'Повернули борг',
            personId: null,
          })
          .expect(200)
      ).body as TransactionDto;
      expect(updated).toMatchObject({ type: 'INCOME', category: null, incomeKind: 'UNPLANNED' });

      await owner.delete(`${base}/transactions/${cafeId}`).expect(204);
      expect(codeOf(await owner.delete(`${base}/transactions/${cafeId}`).expect(404))).toBe(
        'FINANCE_NOT_FOUND',
      );
    });

    it('чужий простір і чужий id у своєму просторі — 404', async () => {
      await outsider.get(`${base}/transactions?month=2026-09`).expect(404);
      const ownerTx = (await month('2026-09')).transactions[0]!;
      await outsider
        .patch(`${outsiderBase}/transactions/${ownerTx.id}`)
        .send(expense())
        .expect(404);
      await outsider.delete(`${outsiderBase}/transactions/${ownerTx.id}`).expect(404);
    });
  });

  describe('регулярний дохід', () => {
    let salary: RecurringIncomeDto;
    const fixedDates = async (value: string) =>
      (await month(value)).transactions
        .filter((t) => t.recurringIncomeId === salary.id)
        .map((t) => t.date);

    it('створює зарплату заднім числом і доганяє пропущені місяці рівно один раз', async () => {
      salary = (
        await owner
          .post(`${base}/recurring-incomes`)
          .send({
            title: 'Зарплата',
            amountMinor: 4_000_000,
            currency: 'UAH',
            dayOfMonth: 5,
            startDate: '2026-07-01',
            endDate: null,
            personId: null,
          })
          .expect(201)
      ).body as RecurringIncomeDto;
      expect(salary.nextDate).toBe('2026-10-05');

      expect(await fixedDates('2026-07')).toEqual(['2026-07-05']);
      expect(await fixedDates('2026-08')).toEqual(['2026-08-05']);
      expect(await fixedDates('2026-09')).toEqual(['2026-09-05']);

      await month('2026-09');
      expect(
        await prisma.financeTransaction.count({ where: { recurringIncomeId: salary.id } }),
      ).toBe(3);

      const generated = (await month('2026-09')).transactions.find(
        (t) => t.recurringIncomeId === salary.id,
      );
      expect(generated).toMatchObject({
        incomeKind: 'FIXED',
        note: 'Зарплата',
        amountMinor: 4_000_000,
      });
    });

    it('видалена вручну операція не відроджується', async () => {
      const [september] = (await month('2026-09')).transactions.filter(
        (t) => t.recurringIncomeId === salary.id,
      );
      await owner.delete(`${base}/transactions/${september!.id}`).expect(204);
      expect(await fixedDates('2026-09')).toEqual([]);
    });

    it('пауза не доганяє пропущені місяці після відновлення', async () => {
      await owner
        .patch(`${base}/recurring-incomes/${salary.id}`)
        .send({ paused: true })
        .expect(200);
      clock.current = '2026-11-20';
      expect(await fixedDates('2026-10')).toEqual([]);

      const resumed = (
        await owner
          .patch(`${base}/recurring-incomes/${salary.id}`)
          .send({ paused: false })
          .expect(200)
      ).body as RecurringIncomeDto;
      expect(resumed).toMatchObject({ paused: false, nextDate: '2026-12-05' });
      expect(await fixedDates('2026-11')).toEqual([]);

      clock.current = '2026-12-06';
      expect(await fixedDates('2026-12')).toEqual(['2026-12-05']);
    });

    it('видалення правила лишає історію операцій', async () => {
      await owner.delete(`${base}/recurring-incomes/${salary.id}`).expect(204);
      const kept = await prisma.financeTransaction.count({
        where: { note: 'Зарплата', recurringIncomeId: null },
      });
      expect(kept).toBe(3);
      clock.current = '2026-09-14';
    });
  });

  describe('готівка', () => {
    it('одна скарбничка на кілька валют з підсумком у гривні', async () => {
      await owner
        .post(`${base}/cash`)
        .send({
          direction: 'IN',
          amountMinor: 10_000,
          currency: 'UAH',
          date: '2026-09-01',
          note: null,
          personId: null,
        })
        .expect(201);
      const stash = (
        await owner
          .post(`${base}/cash`)
          .send({
            direction: 'IN',
            amountMinor: 5_000,
            currency: 'USD',
            date: '2026-09-02',
            note: null,
            personId: null,
          })
          .expect(201)
      ).body as CashStash;

      expect(stash.balances).toEqual([
        { currency: 'UAH', amountMinor: 10_000 },
        { currency: 'USD', amountMinor: 5_000 },
      ]);
      expect(stash.totalBaseMinor).toBe(10_000 + 5_000 * 41);
    });

    it('не можна взяти більше, ніж лежить у цій валюті', async () => {
      const tooMuch = await owner
        .post(`${base}/cash`)
        .send({
          direction: 'OUT',
          amountMinor: 6_000,
          currency: 'USD',
          date: '2026-09-03',
          note: null,
          personId: null,
        })
        .expect(409);
      expect(codeOf(tooMuch)).toBe('FINANCE_CASH_INSUFFICIENT');

      const stash = (
        await owner
          .post(`${base}/cash`)
          .send({
            direction: 'OUT',
            amountMinor: 2_000,
            currency: 'USD',
            date: '2026-09-03',
            note: null,
            personId: null,
          })
          .expect(201)
      ).body as CashStash;
      expect(stash.balances.find((b) => b.currency === 'USD')?.amountMinor).toBe(3_000);
      expect(stash.entries[0]!.amountMinor).toBe(-2_000);
    });
  });

  describe('депозити', () => {
    let deposit: DepositDto;

    it('поповнення за графіком створюються самі; прогноз росте', async () => {
      deposit = (
        await owner
          .post(`${base}/deposits`)
          .send({
            name: 'Скарбничка',
            bank: 'monobank',
            currency: 'UAH',
            annualRateBp: 1500,
            capitalization: true,
            startDate: '2026-01-10',
            termMonths: null,
            initialAmountMinor: 100_000,
            monthlyTopUpMinor: 100_000,
            topUpDay: 10,
            personId: null,
          })
          .expect(201)
      ).body as DepositDto;

      expect(deposit).toMatchObject({ taxRateBp: 2300, deductFromIncome: true });
      expect(deposit.contributions.map((c) => c.kind)).toEqual([
        'INITIAL',
        ...Array.from({ length: 8 }, () => 'SCHEDULED'),
      ]);
      expect(deposit.current.contributedMinor).toBe(900_000);
      expect(deposit.current.balanceMinor).toBeGreaterThan(deposit.current.contributedMinor);
      expect(deposit.nextTopUpDate).toBe('2026-10-10');

      const { projection } = deposit;
      expect(projection[0]!.date).toBe('2026-01-10');
      expect(projection.at(-1)!.date).toBe('2028-09-14');
      for (let i = 1; i < projection.length; i += 1) {
        expect(projection[i]!.balanceMinor).toBeGreaterThanOrEqual(projection[i - 1]!.balanceMinor);
      }
    });

    it('видалене планове поповнення не відроджується; внесок до старту — помилка', async () => {
      const scheduled = deposit.contributions.find((c) => c.date === '2026-05-10')!;
      await owner
        .delete(`${base}/deposits/${deposit.id}/contributions/${scheduled.id}`)
        .expect(200);
      const [reloaded] = (await owner.get(`${base}/deposits`).expect(200)).body as DepositDto[];
      expect(reloaded!.current.contributedMinor).toBe(800_000);

      const early = await owner
        .post(`${base}/deposits/${deposit.id}/contributions`)
        .send({ amountMinor: 1_000, date: '2025-12-31', note: null })
        .expect(400);
      expect(issuesOf(early)).toContain('date:validation.dateBeforeStart');
    });

    it('строковий депозит закінчується в кінці строку', async () => {
      const term = (
        await owner
          .post(`${base}/deposits`)
          .send({
            name: 'На 3 місяці',
            bank: null,
            currency: 'USD',
            annualRateBp: 400,
            taxRateBp: 1950,
            capitalization: false,
            startDate: '2026-09-01',
            termMonths: 3,
            initialAmountMinor: 100_000,
            monthlyTopUpMinor: 0,
            topUpDay: 1,
            personId: null,
          })
          .expect(201)
      ).body as DepositDto;
      expect(term.endDate).toBe('2026-12-01');
      expect(term.projection.at(-1)).toMatchObject({ date: '2026-12-01', balanceMinor: 100_000 });
      expect(term.projection.at(-1)!.interestMinor).toBeGreaterThan(0);
      expect(term.nextTopUpDate).toBeNull();
    });

    it('зміна дати старту переносить початковий внесок', async () => {
      const moved = (
        await owner
          .patch(`${base}/deposits/${deposit.id}`)
          .send({ startDate: '2026-01-15' })
          .expect(200)
      ).body as DepositDto;
      expect(moved.contributions.find((c) => c.kind === 'INITIAL')?.date).toBe('2026-01-15');
    });

    it('чужий депозит недоступний', async () => {
      await outsider
        .patch(`${outsiderBase}/deposits/${deposit.id}`)
        .send({ name: 'Моє' })
        .expect(404);
      await outsider
        .post(`${outsiderBase}/deposits/${deposit.id}/contributions`)
        .send({ amountMinor: 1, date: '2026-09-01', note: null })
        .expect(404);
    });
  });

  describe('аналітика', () => {
    it('щомісячні підсумки у гривні: фіксовані/позапланові доходи, витрати за категоріями, відкладене', async () => {
      const add = (body: Record<string, unknown>) =>
        outsider.post(`${outsiderBase}/transactions`).send(body).expect(201);
      await add(expense({ category: 'FOOD', amountMinor: 100_000, date: '2026-08-20' }));
      await add(expense({ category: 'FOOD', amountMinor: 150_000, date: '2026-09-02' }));
      await add(
        expense({ category: 'CAFE', amountMinor: 1_000, currency: 'USD', date: '2026-09-03' }),
      );
      await add({
        type: 'INCOME',
        incomeKind: 'FIXED',
        amountMinor: 3_000_000,
        currency: 'UAH',
        date: '2026-09-05',
        note: null,
        personId: null,
      });
      await add({
        type: 'INCOME',
        incomeKind: 'UNPLANNED',
        amountMinor: 500_000,
        currency: 'UAH',
        date: '2026-09-06',
        note: null,
        personId: null,
      });
      await outsider
        .post(`${outsiderBase}/cash`)
        .send({
          direction: 'IN',
          amountMinor: 5_000,
          currency: 'USD',
          date: '2026-09-07',
          note: null,
          personId: null,
        })
        .expect(201);

      // Лише депозит із позначкою «віднімати з доходів» потрапляє в depositedMinor.
      const depositBody = {
        bank: null,
        currency: 'UAH',
        annualRateBp: 1000,
        capitalization: true,
        startDate: '2026-09-08',
        termMonths: null,
        monthlyTopUpMinor: 0,
        topUpDay: 8,
        personId: null,
      };
      await outsider
        .post(`${outsiderBase}/deposits`)
        .send({ ...depositBody, name: 'Віднімається', initialAmountMinor: 200_000 })
        .expect(201);
      await outsider
        .post(`${outsiderBase}/deposits`)
        .send({
          ...depositBody,
          name: 'Окремо',
          deductFromIncome: false,
          initialAmountMinor: 900_000,
        })
        .expect(201);

      const analytics = (
        await outsider.get(`${outsiderBase}/analytics?to=2026-09&months=3`).expect(200)
      ).body as FinanceAnalytics;
      expect(analytics).toMatchObject({ baseCurrency: 'UAH', incomplete: false });
      expect(analytics.months.map((m) => m.month)).toEqual(['2026-07', '2026-08', '2026-09']);
      expect(analytics.months[0]).toMatchObject({ expenseMinor: 0, incomeFixedMinor: 0 });
      expect(analytics.months[1]).toMatchObject({
        expenseMinor: 100_000,
        expenseByCategory: { FOOD: 100_000 },
      });
      expect(analytics.months[2]).toEqual({
        month: '2026-09',
        incomeFixedMinor: 3_000_000,
        incomeUnplannedMinor: 500_000,
        expenseMinor: 150_000 + 41_000,
        savedMinor: 205_000,
        depositedMinor: 200_000,
        expenseByCategory: { FOOD: 150_000, CAFE: 41_000 },
      });

      await outsider.get(`${outsiderBase}/analytics?months=25`).expect(400);
    });
  });
});
