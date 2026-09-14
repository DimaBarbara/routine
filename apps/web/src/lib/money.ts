import type { Currency } from '@routine/contracts';

const SYMBOLS: Record<Currency, string> = { UAH: '₴', USD: '$', EUR: '€' };

/** "1 299,50" → 129950 (\s покриває й нерозривні пробіли). Порожньо → null, сміття → NaN. */
export function parseMoney(raw: FormDataEntryValue | null): number | null {
  const text = typeof raw === 'string' ? raw.replace(/\s/g, '').replace(',', '.') : '';
  if (text === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

/** "15,5" → 1550 базисних пунктів. */
export function parsePercentBp(raw: FormDataEntryValue | null): number | null {
  return parseMoney(raw);
}

export function moneyInputValue(minor: number | null): string {
  return minor === null ? '' : String(minor / 100);
}

function groupDigits(value: number, separator: string) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Свідомо без Intl: Node і браузер мають різні версії даних ICU —
 * для ru сервер давав «4 599 ₴», а Chrome «4 599 грн.», і гідратація падала.
 */
export function formatMoney(
  locale: string,
  minor: number,
  currency: Currency,
  { sign = false }: { sign?: boolean } = {},
): string {
  const isEnglish = locale === 'en';
  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const whole = groupDigits(Math.floor(absolute / 100), isEnglish ? ',' : ' ');
  const cents = absolute % 100;
  const amount = cents
    ? `${whole}${isEnglish ? '.' : ','}${String(cents).padStart(2, '0')}`
    : whole;
  const prefix = negative ? '−' : sign && minor > 0 ? '+' : '';
  return isEnglish
    ? `${prefix}${SYMBOLS[currency]}${amount}`
    : `${prefix}${amount} ${SYMBOLS[currency]}`;
}

/** Для осей графіків: 12 500 ₴ → «12,5» + суфікс тисяч із перекладів. */
export function compactNumber(
  locale: string,
  minor: number,
): { value: string; unit: 'thousand' | 'million' | null } {
  const units = Math.abs(minor / 100);
  const decimal = locale === 'en' ? '.' : ',';
  const trim = (value: number) => String(Math.round(value * 10) / 10).replace('.', decimal);
  if (units >= 1_000_000) return { value: trim(minor / 100 / 1_000_000), unit: 'million' };
  if (units >= 1_000) return { value: trim(minor / 100 / 1_000), unit: 'thousand' };
  return { value: groupDigits(Math.round(minor / 100), locale === 'en' ? ',' : ' '), unit: null };
}

export function formatPercentBp(locale: string, bp: number): string {
  const value = bp / 100;
  return String(Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, '')).replace(
    '.',
    locale === 'en' ? '.' : ',',
  );
}
