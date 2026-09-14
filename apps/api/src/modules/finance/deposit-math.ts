import type { DepositPoint } from '@routine/contracts';

import { addDays, addMonthsClamped, type IsoDate } from '../../common/dates.js';

export interface DepositTerms {
  startDate: IsoDate;
  termMonths: number | null;
  annualRateBp: number;
  taxRateBp: number;
  capitalization: boolean;
}

export interface DatedAmount {
  date: IsoDate;
  amountMinor: number;
}

export function depositEndDate(
  terms: Pick<DepositTerms, 'startDate' | 'termMonths'>,
): IsoDate | null {
  return terms.termMonths ? addMonthsClamped(terms.startDate, terms.termMonths) : null;
}

/**
 * Модель депозиту для прогнозу:
 * - відсотки нараховуються щодня на внесене + вже капіталізоване, за мінусом податку;
 * - щомісяця в день відкриття нараховане капіталізується (або виплачується окремо);
 * - після кінця строку відсотки не нараховуються.
 * Нараховане рахується в дробових копійках і округлюється лише у відповіді —
 * це прогноз для людини, а не бухгалтерія банку.
 */
export function simulateDeposit(
  terms: DepositTerms,
  contributions: DatedAmount[],
  sampleDates: IsoDate[],
): Map<IsoDate, DepositPoint> {
  const samples = [...new Set(sampleDates)].sort();
  const result = new Map<IsoDate, DepositPoint>();
  if (samples.length === 0) return result;

  const byDate = new Map<IsoDate, number>();
  for (const { date, amountMinor } of contributions) {
    const effective = date < terms.startDate ? terms.startDate : date;
    byDate.set(effective, (byDate.get(effective) ?? 0) + amountMinor);
  }

  const endDate = depositEndDate(terms);
  const dailyRate = ((terms.annualRateBp / 10_000) * (1 - terms.taxRateBp / 10_000)) / 365;

  let contributed = 0;
  let capitalized = 0;
  let paidOut = 0;
  let accrued = 0;
  let period = 1;
  let boundary = addMonthsClamped(terms.startDate, period);

  const point = (date: IsoDate): DepositPoint => {
    const interest = capitalized + paidOut + accrued;
    return {
      date,
      contributedMinor: Math.round(contributed),
      interestMinor: Math.round(interest),
      balanceMinor: Math.round(contributed + (terms.capitalization ? capitalized + accrued : 0)),
    };
  };

  let index = 0;
  while (index < samples.length && samples[index]! < terms.startDate) {
    result.set(samples[index]!, {
      date: samples[index]!,
      contributedMinor: 0,
      interestMinor: 0,
      balanceMinor: 0,
    });
    index += 1;
  }

  const last = samples.at(-1)!;
  for (let day = terms.startDate; day <= last && index < samples.length; day = addDays(day, 1)) {
    if (day === boundary) {
      if (terms.capitalization) capitalized += accrued;
      else paidOut += accrued;
      accrued = 0;
      period += 1;
      boundary = addMonthsClamped(terms.startDate, period);
    }

    contributed += byDate.get(day) ?? 0;

    if (endDate === null || day < endDate) {
      accrued += (contributed + capitalized) * dailyRate;
    }

    while (index < samples.length && samples[index] === day) {
      result.set(day, point(day));
      index += 1;
    }
  }

  return result;
}
