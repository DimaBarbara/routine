import { Injectable } from '@nestjs/common';
import type {
  Currency,
  FinanceMonth,
  RecurringIncomeDto,
  RecurringIncomeInput,
  RecurringIncomeUpdate,
  TransactionDto,
  TransactionInput,
} from '@routine/contracts';

import { AppException } from '../../common/app-exception.js';
import { ClockService } from '../../common/clock.service.js';
import {
  addDays,
  addMonthsClamped,
  fromDbDate,
  maxDate,
  monthBounds,
  monthlyOccurrences,
  toDbDate,
} from '../../common/dates.js';
import { personSelect, toPersonOrNull } from '../../common/person.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { assertPerson, listMembers } from './finance-people.js';
import { ScheduleService } from './schedule.service.js';

const transactionInclude = { person: personSelect } satisfies Prisma.FinanceTransactionInclude;
type TransactionRow = Prisma.FinanceTransactionGetPayload<{ include: typeof transactionInclude }>;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: ExchangeRatesService,
    private readonly schedule: ScheduleService,
    private readonly clock: ClockService,
  ) {}

  async month(spaceId: string, month: string): Promise<FinanceMonth> {
    await this.schedule.materializeIncomes(spaceId);
    const { start, end } = monthBounds(month);

    const [rows, rules, members] = await Promise.all([
      this.prisma.financeTransaction.findMany({
        where: { spaceId, date: { gte: toDbDate(start), lte: toDbDate(end) } },
        include: transactionInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.recurringIncome.findMany({
        where: { spaceId },
        include: { person: personSelect },
        orderBy: { createdAt: 'asc' },
      }),
      listMembers(this.prisma, spaceId),
    ]);

    return {
      month,
      transactions: await this.toDtos(rows),
      recurringIncomes: rules.map((rule) => this.toRecurringDto(rule)),
      members,
    };
  }

  async create(spaceId: string, userId: string, input: TransactionInput): Promise<TransactionDto> {
    await assertPerson(this.prisma, spaceId, input.personId);
    const row = await this.prisma.financeTransaction.create({
      data: { ...this.toData(input), spaceId, createdById: userId },
      include: transactionInclude,
    });
    return (await this.toDtos([row]))[0]!;
  }

  async update(spaceId: string, id: string, input: TransactionInput): Promise<TransactionDto> {
    await this.findOrThrow(spaceId, id);
    await assertPerson(this.prisma, spaceId, input.personId);
    const row = await this.prisma.financeTransaction.update({
      where: { id },
      data: this.toData(input),
      include: transactionInclude,
    });
    return (await this.toDtos([row]))[0]!;
  }

  async remove(spaceId: string, id: string): Promise<void> {
    const { count } = await this.prisma.financeTransaction.deleteMany({ where: { id, spaceId } });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
  }

  // ── Регулярні доходи ──────────────────────────────────────────────────────

  async createRecurring(spaceId: string, input: RecurringIncomeInput): Promise<RecurringIncomeDto> {
    await assertPerson(this.prisma, spaceId, input.personId);
    const rule = await this.prisma.recurringIncome.create({
      data: {
        ...input,
        spaceId,
        startDate: toDbDate(input.startDate),
        endDate: input.endDate ? toDbDate(input.endDate) : null,
      },
      include: { person: personSelect },
    });
    return this.toRecurringDto(rule);
  }

  async updateRecurring(
    spaceId: string,
    id: string,
    { paused, startDate, endDate, ...rest }: RecurringIncomeUpdate,
  ): Promise<RecurringIncomeDto> {
    const current = await this.prisma.recurringIncome.findFirst({ where: { id, spaceId } });
    if (!current) throw AppException.notFound('FINANCE_NOT_FOUND');
    if (rest.personId !== undefined) await assertPerson(this.prisma, spaceId, rest.personId);

    const effectiveStart = startDate ?? fromDbDate(current.startDate);
    const effectiveEnd =
      endDate !== undefined ? endDate : current.endDate && fromDbDate(current.endDate);
    if (effectiveEnd && effectiveEnd < effectiveStart) {
      throw new AppException(400, 'VALIDATION_FAILED', [
        { path: 'endDate', message: 'validation.endBeforeStart' },
      ]);
    }

    const yesterday = addDays(this.clock.today(), -1);
    const resuming = paused === false && current.pausedAt !== null;

    const rule = await this.prisma.recurringIncome.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: toDbDate(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? toDbDate(endDate) : null } : {}),
        ...(paused === true && !current.pausedAt ? { pausedAt: new Date() } : {}),
        ...(resuming
          ? {
              pausedAt: null,
              // Місяці паузи не доганяємо: генерація продовжується з сьогодні.
              generatedThrough: toDbDate(
                current.generatedThrough
                  ? maxDate(fromDbDate(current.generatedThrough), yesterday)
                  : yesterday,
              ),
            }
          : {}),
      },
      include: { person: personSelect },
    });
    return this.toRecurringDto(rule);
  }

  async removeRecurring(spaceId: string, id: string): Promise<void> {
    // Уже створені операції лишаються в історії (recurringIncomeId → null).
    const { count } = await this.prisma.recurringIncome.deleteMany({ where: { id, spaceId } });
    if (count === 0) throw AppException.notFound('FINANCE_NOT_FOUND');
  }

  // ── Допоміжне ─────────────────────────────────────────────────────────────

  private async findOrThrow(spaceId: string, id: string) {
    const row = await this.prisma.financeTransaction.findFirst({ where: { id, spaceId } });
    if (!row) throw AppException.notFound('FINANCE_NOT_FOUND');
    return row;
  }

  private toData(input: TransactionInput) {
    return {
      type: input.type,
      amountMinor: input.amountMinor,
      currency: input.currency,
      date: toDbDate(input.date),
      note: input.note,
      personId: input.personId,
      category: input.type === 'EXPENSE' ? input.category : null,
      incomeKind: input.type === 'INCOME' ? input.incomeKind : null,
    };
  }

  private async toDtos(rows: TransactionRow[]): Promise<TransactionDto[]> {
    const converted = await this.rates.toBase(
      rows.map((row) => ({
        amountMinor: row.amountMinor,
        currency: row.currency,
        date: fromDbDate(row.date),
      })),
    );
    return rows.map((row, index) => ({
      id: row.id,
      type: row.type,
      amountMinor: row.amountMinor,
      currency: row.currency as Currency,
      category: row.category,
      incomeKind: row.incomeKind,
      note: row.note,
      date: fromDbDate(row.date),
      person: toPersonOrNull(row.person),
      recurringIncomeId: row.recurringIncomeId,
      amountBaseMinor: converted[index] ?? null,
    }));
  }

  private toRecurringDto(
    rule: Prisma.RecurringIncomeGetPayload<{ include: { person: typeof personSelect } }>,
  ): RecurringIncomeDto {
    const today = this.clock.today();
    const startDate = fromDbDate(rule.startDate);
    const endDate = rule.endDate ? fromDbDate(rule.endDate) : null;
    const after = maxDate(
      rule.generatedThrough ? fromDbDate(rule.generatedThrough) : addDays(startDate, -1),
      addDays(today, -1),
    );
    const next = rule.pausedAt
      ? undefined
      : monthlyOccurrences(rule.dayOfMonth, after, addMonthsClamped(after, 2))[0];

    return {
      id: rule.id,
      title: rule.title,
      amountMinor: rule.amountMinor,
      currency: rule.currency as Currency,
      dayOfMonth: rule.dayOfMonth,
      startDate,
      endDate,
      person: toPersonOrNull(rule.person),
      paused: rule.pausedAt !== null,
      nextDate: next && (!endDate || next <= endDate) ? next : null,
    };
  }
}
