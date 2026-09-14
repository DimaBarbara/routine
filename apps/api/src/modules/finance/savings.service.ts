import { Injectable } from '@nestjs/common';
import type {
  CashEntryDto,
  CashEntryInput,
  CashStash,
  ContributionInput,
  Currency,
  DepositDto,
  DepositInput,
  DepositPoint,
  DepositUpdate,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { ClockService } from '../../common/clock.service.js';
import {
  addMonthsClamped,
  fromDbDate,
  maxDate,
  minDate,
  monthlyOccurrences,
  toDbDate,
} from '../../common/dates.js';
import { personSelect, toPersonOrNull } from '../../common/person.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { depositEndDate, simulateDeposit } from './deposit-math.js';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { assertPerson, listMembers } from './finance-people.js';
import { ScheduleService } from './schedule.service.js';

/** Безстроковий депозит показуємо на два роки вперед. */
const OPEN_ENDED_HORIZON_MONTHS = 24;

const depositInclude = {
  person: personSelect,
  contributions: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.DepositInclude;
type DepositRow = Prisma.DepositGetPayload<{ include: typeof depositInclude }>;

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: ExchangeRatesService,
    private readonly schedule: ScheduleService,
    private readonly clock: ClockService,
  ) {}

  // ── Готівка ───────────────────────────────────────────────────────────────

  async cash(spaceId: string): Promise<CashStash> {
    const [entries, grouped, members] = await Promise.all([
      this.prisma.cashEntry.findMany({
        where: { spaceId },
        include: { person: personSelect },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.cashEntry.groupBy({
        by: ['currency'],
        where: { spaceId },
        _sum: { amountMinor: true },
      }),
      listMembers(this.prisma, spaceId),
    ]);

    const balances = grouped
      .map((group) => ({
        currency: group.currency as Currency,
        amountMinor: group._sum.amountMinor ?? 0,
      }))
      .filter((balance) => balance.amountMinor !== 0)
      .sort((a, b) => a.currency.localeCompare(b.currency));

    const today = this.clock.today();
    const converted = await this.rates.toBase(
      balances.map((balance) => ({ ...balance, date: today })),
    );

    return {
      balances,
      totalBaseMinor: converted.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      entries: entries.map((entry): CashEntryDto => ({
        id: entry.id,
        amountMinor: entry.amountMinor,
        currency: entry.currency as Currency,
        date: fromDbDate(entry.date),
        note: entry.note,
        person: toPersonOrNull(entry.person),
      })),
      members,
    };
  }

  async addCash(
    spaceId: string,
    { direction, amountMinor, ...input }: CashEntryInput,
  ): Promise<CashStash> {
    await assertPerson(this.prisma, spaceId, input.personId);

    await this.prisma.$transaction(async (tx) => {
      if (direction === 'OUT') {
        const { _sum } = await tx.cashEntry.aggregate({
          where: { spaceId, currency: input.currency },
          _sum: { amountMinor: true },
        });
        if ((_sum.amountMinor ?? 0) < amountMinor)
          throw AppException.conflict('FINANCE_CASH_INSUFFICIENT');
      }
      await tx.cashEntry.create({
        data: {
          ...input,
          spaceId,
          date: toDbDate(input.date),
          amountMinor: direction === 'IN' ? amountMinor : -amountMinor,
        },
      });
    });

    return this.cash(spaceId);
  }

  async removeCash(spaceId: string, id: string): Promise<CashStash> {
    const { count } = await this.prisma.cashEntry.deleteMany({ where: { id, spaceId } });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
    return this.cash(spaceId);
  }

  // ── Депозити ──────────────────────────────────────────────────────────────

  async deposits(spaceId: string): Promise<DepositDto[]> {
    await this.schedule.materializeTopUps(spaceId);
    const rows = await this.prisma.deposit.findMany({
      where: { spaceId },
      include: depositInclude,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDepositDto(row));
  }

  async createDeposit(
    spaceId: string,
    { initialAmountMinor, ...input }: DepositInput,
  ): Promise<DepositDto> {
    await assertPerson(this.prisma, spaceId, input.personId);
    const deposit = await this.prisma.deposit.create({
      data: {
        ...input,
        spaceId,
        startDate: toDbDate(input.startDate),
        ...(initialAmountMinor > 0
          ? {
              contributions: {
                create: {
                  kind: 'INITIAL',
                  amountMinor: initialAmountMinor,
                  date: toDbDate(input.startDate),
                },
              },
            }
          : {}),
      },
    });
    return this.depositOrThrow(spaceId, deposit.id);
  }

  async updateDeposit(spaceId: string, id: string, input: DepositUpdate): Promise<DepositDto> {
    await this.findDepositOrThrow(spaceId, id);
    if (input.personId !== undefined) await assertPerson(this.prisma, spaceId, input.personId);

    await this.prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id },
        data: { ...input, ...(input.startDate ? { startDate: toDbDate(input.startDate) } : {}) },
      });
      // Початкова сума живе в дні відкриття — переносимо разом зі стартом.
      if (input.startDate) {
        await tx.depositContribution.updateMany({
          where: { depositId: id, kind: 'INITIAL' },
          data: { date: toDbDate(input.startDate) },
        });
      }
    });
    return this.depositOrThrow(spaceId, id);
  }

  async removeDeposit(spaceId: string, id: string): Promise<void> {
    const { count } = await this.prisma.deposit.deleteMany({ where: { id, spaceId } });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
  }

  async addContribution(
    spaceId: string,
    depositId: string,
    input: ContributionInput,
  ): Promise<DepositDto> {
    const deposit = await this.findDepositOrThrow(spaceId, depositId);
    this.assertAfterStart(fromDbDate(deposit.startDate), input.date);
    await this.prisma.depositContribution.create({
      data: { ...input, depositId, kind: 'EXTRA', date: toDbDate(input.date) },
    });
    return this.depositOrThrow(spaceId, depositId);
  }

  async updateContribution(
    spaceId: string,
    depositId: string,
    contributionId: string,
    input: ContributionInput,
  ): Promise<DepositDto> {
    const deposit = await this.findDepositOrThrow(spaceId, depositId);
    this.assertAfterStart(fromDbDate(deposit.startDate), input.date);
    const { count } = await this.prisma.depositContribution.updateMany({
      where: { id: contributionId, depositId },
      data: { amountMinor: input.amountMinor, note: input.note, date: toDbDate(input.date) },
    });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
    return this.depositOrThrow(spaceId, depositId);
  }

  async removeContribution(
    spaceId: string,
    depositId: string,
    contributionId: string,
  ): Promise<DepositDto> {
    await this.findDepositOrThrow(spaceId, depositId);
    // Видалене планове поповнення не відродиться: generatedThrough уже за ним.
    const { count } = await this.prisma.depositContribution.deleteMany({
      where: { id: contributionId, depositId },
    });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
    return this.depositOrThrow(spaceId, depositId);
  }

  // ── Допоміжне ─────────────────────────────────────────────────────────────

  private assertAfterStart(startDate: string, date: string) {
    if (date < startDate) {
      throw new AppException(400, 'VALIDATION_FAILED', [
        { path: 'date', message: 'validation.dateBeforeStart' },
      ]);
    }
  }

  private async findDepositOrThrow(spaceId: string, id: string) {
    const deposit = await this.prisma.deposit.findFirst({ where: { id, spaceId } });
    if (!deposit) throw AppException.notFound('FINANCE_NOT_FOUND');
    return deposit;
  }

  private async depositOrThrow(spaceId: string, id: string): Promise<DepositDto> {
    await this.schedule.materializeTopUps(spaceId);
    const row = await this.prisma.deposit.findFirst({
      where: { id, spaceId },
      include: depositInclude,
    });
    if (!row) throw AppException.notFound('FINANCE_NOT_FOUND');
    return this.toDepositDto(row);
  }

  private toDepositDto(row: DepositRow): DepositDto {
    const today = this.clock.today();
    const startDate = fromDbDate(row.startDate);
    const terms = {
      startDate,
      termMonths: row.termMonths,
      annualRateBp: row.annualRateBp,
      taxRateBp: row.taxRateBp,
      capitalization: row.capitalization,
    };
    const endDate = depositEndDate(terms);
    const horizon =
      endDate ?? addMonthsClamped(maxDate(today, startDate), OPEN_ENDED_HORIZON_MONTHS);

    const actual = row.contributions.map((c) => ({
      date: fromDbDate(c.date),
      amountMinor: c.amountMinor,
    }));
    // Майбутнє — за планом: поповнення, яких ще не створено.
    const plannedAfter = maxDate(
      today,
      row.generatedThrough ? fromDbDate(row.generatedThrough) : startDate,
    );
    const plannedUntil = endDate ? minDate(horizon, endDate) : horizon;
    const planned =
      row.monthlyTopUpMinor > 0
        ? monthlyOccurrences(row.topUpDay, plannedAfter, plannedUntil)
            .filter((date) => !endDate || date < endDate)
            .map((date) => ({ date, amountMinor: row.monthlyTopUpMinor }))
        : [];

    const anniversaries: string[] = [];
    for (let month = 0; ; month += 1) {
      const date = addMonthsClamped(startDate, month);
      if (date > horizon) break;
      anniversaries.push(date);
    }
    if (anniversaries.at(-1) !== horizon) anniversaries.push(horizon);

    // Минуле — лише фактичні внески; майбутнє — факт + план.
    const pastPoints = simulateDeposit(terms, actual, [
      today,
      ...anniversaries.filter((d) => d <= today),
    ]);
    const futurePoints = simulateDeposit(
      terms,
      [...actual, ...planned],
      anniversaries.filter((d) => d > today),
    );
    const zero = (date: string): DepositPoint => ({
      date,
      contributedMinor: 0,
      interestMinor: 0,
      balanceMinor: 0,
    });

    const nextTopUp =
      row.monthlyTopUpMinor > 0
        ? monthlyOccurrences(
            row.topUpDay,
            maxDate(today, startDate),
            addMonthsClamped(maxDate(today, startDate), 2),
          )[0]
        : undefined;

    return {
      id: row.id,
      name: row.name,
      bank: row.bank,
      currency: row.currency as Currency,
      annualRateBp: row.annualRateBp,
      taxRateBp: row.taxRateBp,
      capitalization: row.capitalization,
      deductFromIncome: row.deductFromIncome,
      startDate,
      termMonths: row.termMonths,
      endDate,
      monthlyTopUpMinor: row.monthlyTopUpMinor,
      topUpDay: row.topUpDay,
      person: toPersonOrNull(row.person),
      current: pastPoints.get(today) ?? zero(today),
      projection: anniversaries.map(
        (date) => (date <= today ? pastPoints.get(date) : futurePoints.get(date)) ?? zero(date),
      ),
      nextTopUpDate: nextTopUp && (!endDate || nextTopUp < endDate) ? nextTopUp : null,
      contributions: row.contributions.map((c) => ({
        id: c.id,
        kind: c.kind,
        amountMinor: c.amountMinor,
        date: fromDbDate(c.date),
        note: c.note,
      })),
    };
  }
}
