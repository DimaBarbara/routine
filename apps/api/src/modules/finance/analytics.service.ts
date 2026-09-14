import { Injectable } from '@nestjs/common';
import { BASE_CURRENCY, type FinanceAnalytics, type FinanceMonthSummary } from '@routine/contracts';

import { ClockService } from '../../common/clock.service.js';
import { fromDbDate, monthBounds, monthOf, shiftMonth, toDbDate } from '../../common/dates.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ExchangeRatesService } from './exchange-rates.service.js';
import { ScheduleService } from './schedule.service.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: ExchangeRatesService,
    private readonly schedule: ScheduleService,
    private readonly clock: ClockService,
  ) {}

  /** Щомісячні підсумки у гривні — для огляду місяця й порівнянь між місяцями. */
  async summary(
    spaceId: string,
    to: string | undefined,
    months: number,
  ): Promise<FinanceAnalytics> {
    await Promise.all([
      this.schedule.materializeIncomes(spaceId),
      this.schedule.materializeTopUps(spaceId),
    ]);

    const lastMonth = to ?? monthOf(this.clock.today());
    const firstMonth = shiftMonth(lastMonth, -(months - 1));
    const range = {
      gte: toDbDate(monthBounds(firstMonth).start),
      lte: toDbDate(monthBounds(lastMonth).end),
    };

    const [transactions, cash, contributions] = await Promise.all([
      this.prisma.financeTransaction.findMany({
        where: { spaceId, date: range },
        select: {
          type: true,
          amountMinor: true,
          currency: true,
          category: true,
          incomeKind: true,
          date: true,
        },
      }),
      this.prisma.cashEntry.findMany({
        where: { spaceId, date: range },
        select: { amountMinor: true, currency: true, date: true },
      }),
      this.prisma.depositContribution.findMany({
        where: { date: range, deposit: { spaceId, deductFromIncome: true } },
        select: { amountMinor: true, date: true, deposit: { select: { currency: true } } },
      }),
    ]);

    const [transactionsBase, cashBase, contributionsBase] = await Promise.all([
      this.rates.toBase(transactions.map((t) => ({ ...t, date: fromDbDate(t.date) }))),
      this.rates.toBase(cash.map((c) => ({ ...c, date: fromDbDate(c.date) }))),
      this.rates.toBase(
        contributions.map((c) => ({
          amountMinor: c.amountMinor,
          currency: c.deposit.currency,
          date: fromDbDate(c.date),
        })),
      ),
    ]);

    const summaries = new Map<string, FinanceMonthSummary>();
    for (let month = firstMonth; month <= lastMonth; month = shiftMonth(month, 1)) {
      summaries.set(month, {
        month,
        incomeFixedMinor: 0,
        incomeUnplannedMinor: 0,
        expenseMinor: 0,
        savedMinor: 0,
        depositedMinor: 0,
        expenseByCategory: {},
      });
    }

    let incomplete = false;

    transactions.forEach((transaction, index) => {
      const amount = transactionsBase[index];
      if (amount === null || amount === undefined) {
        incomplete = true;
        return;
      }
      const summary = summaries.get(monthOf(fromDbDate(transaction.date)))!;
      if (transaction.type === 'INCOME') {
        if (transaction.incomeKind === 'FIXED') summary.incomeFixedMinor += amount;
        else summary.incomeUnplannedMinor += amount;
      } else {
        summary.expenseMinor += amount;
        const category = transaction.category ?? 'OTHER';
        summary.expenseByCategory[category] = (summary.expenseByCategory[category] ?? 0) + amount;
      }
    });

    cash.forEach((entry, index) => {
      const amount = cashBase[index];
      if (amount === null || amount === undefined) {
        incomplete = true;
        return;
      }
      summaries.get(monthOf(fromDbDate(entry.date)))!.savedMinor += amount;
    });

    contributions.forEach((contribution, index) => {
      const amount = contributionsBase[index];
      if (amount === null || amount === undefined) {
        incomplete = true;
        return;
      }
      summaries.get(monthOf(fromDbDate(contribution.date)))!.depositedMinor += amount;
    });

    return { baseCurrency: BASE_CURRENCY, months: [...summaries.values()], incomplete };
  }
}
