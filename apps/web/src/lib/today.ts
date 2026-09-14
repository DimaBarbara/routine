/** Сьогодні за Києвом — лише на сервері; клієнту передається готовим рядком. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function shiftMonth(month: string, delta: number): string {
  const [year = 0, m = 1] = month.split('-').map(Number);
  const total = year * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export const isMonth = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Та сама дата через N місяців, із притиском до кінця місяця (як на бекенді). */
export function addMonthsIso(date: string, months: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

/** Дата для Intl-форматування на сервері: полудень UTC, щоб часовий пояс не зсунув день. */
export const dateAt = (iso: string) =>
  new Date(`${iso.length === 7 ? `${iso}-01` : iso}T12:00:00Z`);
