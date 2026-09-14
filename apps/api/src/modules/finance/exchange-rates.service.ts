import { Inject, Injectable, Logger } from '@nestjs/common';
import { BASE_CURRENCY, type Currency } from '@routine/contracts';

import { ClockService } from '../../common/clock.service.js';
import { fromDbDate, type IsoDate, toDbDate } from '../../common/dates.js';
import { PrismaService } from '../../database/prisma.service.js';

/** Гривень за одиницю валюти × 10 000. */
export interface ScaledRate {
  currency: Currency;
  rateScaled: number;
}

export interface RatesProvider {
  ratesFor(date: IsoDate): Promise<ScaledRate[]>;
}

export const RATES_PROVIDER = Symbol('RATES_PROVIDER');
const RATE_SCALE = 10_000;

/** Офіційні курси НБУ: один запит повертає всі валюти на дату, включно з вихідними. */
export class NbuRatesProvider implements RatesProvider {
  private readonly logger = new Logger(NbuRatesProvider.name);

  async ratesFor(date: IsoDate): Promise<ScaledRate[]> {
    const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${date.replaceAll('-', '')}&json`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return [];
      const rows = (await response.json()) as { cc: string; rate: number }[];
      return rows
        .filter((row) => row.cc === 'USD' || row.cc === 'EUR')
        .map((row) => ({
          currency: row.cc as Currency,
          rateScaled: Math.round(row.rate * RATE_SCALE),
        }));
    } catch (error) {
      this.logger.warn(`НБУ недоступний для ${date}: ${String(error)}`);
      return [];
    }
  }
}

/** Сталі курси без мережі — для тестів і роботи офлайн. */
export class FixedRatesProvider implements RatesProvider {
  ratesFor(): Promise<ScaledRate[]> {
    return Promise.resolve([
      { currency: 'USD', rateScaled: 41 * RATE_SCALE },
      { currency: 'EUR', rateScaled: 45 * RATE_SCALE },
    ]);
  }
}

export interface Convertible {
  amountMinor: number;
  currency: string;
  date: IsoDate;
}

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RATES_PROVIDER) private readonly provider: RatesProvider,
    private readonly clock: ClockService,
  ) {}

  /**
   * Перерахунок у гривню за курсом на дату кожної суми.
   * Один запит до БД на всю пачку; до НБУ — лише за датами, яких ще немає в кеші.
   * Курсу немає ніде → null (підсумки позначаються як неповні).
   */
  async toBase(items: Convertible[]): Promise<(number | null)[]> {
    const foreign = items.filter((item) => item.currency !== BASE_CURRENCY);
    if (foreign.length === 0) return items.map((item) => item.amountMinor);

    const key = (currency: string, date: IsoDate) => `${currency}|${date}`;
    const rates = new Map<string, number>();
    const dates = [...new Set(foreign.map((item) => item.date))];

    const cached = await this.prisma.exchangeRate.findMany({
      where: { date: { in: dates.map(toDbDate) } },
    });
    for (const row of cached) rates.set(key(row.currency, fromDbDate(row.date)), row.rateScaled);

    const today = this.clock.today();
    const missingDates = [
      ...new Set(
        foreign
          .filter((item) => !rates.has(key(item.currency, item.date)))
          .map((item) => item.date),
      ),
    ];
    for (const date of missingDates) {
      // Майбутніх курсів не існує — беремо сьогоднішній.
      const fetched = await this.fetchAndStore(date > today ? today : date);
      for (const rate of fetched) rates.set(key(rate.currency, date), rate.rateScaled);
    }

    for (const item of foreign) {
      if (rates.has(key(item.currency, item.date))) continue;
      const fallback = await this.prisma.exchangeRate.findFirst({
        where: { currency: item.currency, date: { lte: toDbDate(item.date) } },
        orderBy: { date: 'desc' },
      });
      if (fallback) rates.set(key(item.currency, item.date), fallback.rateScaled);
    }

    return items.map((item) => {
      if (item.currency === BASE_CURRENCY) return item.amountMinor;
      const rate = rates.get(key(item.currency, item.date));
      return rate === undefined ? null : Math.round((item.amountMinor * rate) / RATE_SCALE);
    });
  }

  private async fetchAndStore(date: IsoDate): Promise<ScaledRate[]> {
    const fetched = await this.provider.ratesFor(date);
    if (fetched.length > 0) {
      await this.prisma.exchangeRate.createMany({
        data: fetched.map((rate) => ({ ...rate, date: toDbDate(date) })),
        skipDuplicates: true,
      });
    }
    return fetched;
  }
}
