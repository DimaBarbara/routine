import { Injectable } from '@nestjs/common';

import { ClockService } from '../../common/clock.service.js';
import { addDays, fromDbDate, minDate, monthlyOccurrences, toDbDate } from '../../common/dates.js';
import { PrismaService } from '../../database/prisma.service.js';
import { depositEndDate } from './deposit-math.js';

/**
 * Регулярні доходи й планові поповнення депозитів створюються ліниво — при читанні,
 * а не кроном: безкоштовний Render засинає, і крон на ньому ненадійний.
 * `generatedThrough` рухається лише вперед, тож видалений вручну запис не відродиться,
 * а унікальні індекси не дадуть задублювати при одночасних запитах.
 */
@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  async materializeIncomes(spaceId: string): Promise<void> {
    const today = this.clock.today();
    const rules = await this.prisma.recurringIncome.findMany({
      where: { spaceId, pausedAt: null },
    });

    for (const rule of rules) {
      const startDate = fromDbDate(rule.startDate);
      const after = rule.generatedThrough
        ? fromDbDate(rule.generatedThrough)
        : addDays(startDate, -1);
      const until = rule.endDate ? minDate(today, fromDbDate(rule.endDate)) : today;
      if (until <= after) continue;

      const dates = monthlyOccurrences(rule.dayOfMonth, after, until).filter(
        (date) => date >= startDate,
      );
      await this.prisma.$transaction([
        this.prisma.financeTransaction.createMany({
          data: dates.map((date) => ({
            spaceId,
            type: 'INCOME',
            incomeKind: 'FIXED',
            amountMinor: rule.amountMinor,
            currency: rule.currency,
            note: rule.title,
            personId: rule.personId,
            recurringIncomeId: rule.id,
            date: toDbDate(date),
          })),
          skipDuplicates: true,
        }),
        this.prisma.recurringIncome.update({
          where: { id: rule.id },
          data: { generatedThrough: toDbDate(until) },
        }),
      ]);
    }
  }

  async materializeTopUps(spaceId: string): Promise<void> {
    const today = this.clock.today();
    const deposits = await this.prisma.deposit.findMany({
      where: { spaceId, monthlyTopUpMinor: { gt: 0 } },
    });

    for (const deposit of deposits) {
      const startDate = fromDbDate(deposit.startDate);
      const endDate = depositEndDate({ startDate, termMonths: deposit.termMonths });
      // Поповнення — строго після відкриття і до кінця строку.
      const after = deposit.generatedThrough ? fromDbDate(deposit.generatedThrough) : startDate;
      const until = endDate ? minDate(today, addDays(endDate, -1)) : today;
      if (until <= after) continue;

      const dates = monthlyOccurrences(deposit.topUpDay, after, until);
      await this.prisma.$transaction([
        this.prisma.depositContribution.createMany({
          data: dates.map((date) => ({
            depositId: deposit.id,
            kind: 'SCHEDULED',
            amountMinor: deposit.monthlyTopUpMinor,
            date: toDbDate(date),
            scheduledFor: toDbDate(date),
          })),
          skipDuplicates: true,
        }),
        this.prisma.deposit.update({
          where: { id: deposit.id },
          data: { generatedThrough: toDbDate(until) },
        }),
      ]);
    }
  }
}
