/**
 * Календарні дати як рядки `YYYY-MM-DD`: без часових поясів і сюрпризів із переходом на літній час.
 * У Postgres це колонки @db.Date, у JS — Date опівночі UTC лише на межі з Prisma.
 */
export type IsoDate = string;

const pad = (value: number) => String(value).padStart(2, '0');

function parts(date: IsoDate) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Той самий день через N місяців; 31 січня + 1 місяць = 28/29 лютого. */
export function addMonthsClamped(date: IsoDate, months: number, dayOfMonth?: number): IsoDate {
  const { year, month, day } = parts(date);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const nextDay = Math.min(dayOfMonth ?? day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`;
}

export function monthOf(date: IsoDate): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, months: number): string {
  return addMonthsClamped(`${month}-01`, months, 1).slice(0, 7);
}

export function monthBounds(month: string): { start: IsoDate; end: IsoDate } {
  const { year, month: m } = parts(`${month}-01`);
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(year, m))}` };
}

export const minDate = (a: IsoDate, b: IsoDate) => (a < b ? a : b);
export const maxDate = (a: IsoDate, b: IsoDate) => (a > b ? a : b);

/**
 * Щомісячні дати «N-го числа» (у коротких місяцях — останній день),
 * строго після `after` і не пізніше `until`.
 */
export function monthlyOccurrences(dayOfMonth: number, after: IsoDate, until: IsoDate): IsoDate[] {
  const result: IsoDate[] = [];
  if (until <= after) return result;
  for (let month = monthOf(after); month <= monthOf(until); month = shiftMonth(month, 1)) {
    const date = addMonthsClamped(`${month}-01`, 0, dayOfMonth);
    if (date > after && date <= until) result.push(date);
  }
  return result;
}

export const toDbDate = (date: IsoDate) => new Date(`${date}T00:00:00.000Z`);
export const fromDbDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);
