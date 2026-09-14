import type { Currency } from '@routine/contracts';

const SYMBOLS: Record<Currency, string> = { UAH: '₴', USD: '$', EUR: '€' };

/** "1 299,50" → 129950 (\s покриває й нерозривні пробіли). Порожньо → null, сміття → NaN. */
export function parsePrice(raw: FormDataEntryValue | null): number | null {
  const text = typeof raw === 'string' ? raw.replace(/\s/g, '').replace(',', '.') : '';
  if (text === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

export function priceInputValue(priceMinor: number | null): string {
  return priceMinor === null ? '' : String(priceMinor / 100);
}

/**
 * Свідомо без Intl: Node і браузер мають різні версії даних ICU —
 * для ru сервер давав «4 599 ₴», а Chrome «4 599 грн.», і гідратація падала.
 */
export function formatPrice(locale: string, priceMinor: number, currency: Currency): string {
  const isEnglish = locale === 'en';
  const whole = String(Math.floor(priceMinor / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    isEnglish ? ',' : ' ',
  );
  const cents = priceMinor % 100;
  const amount = cents
    ? `${whole}${isEnglish ? '.' : ','}${String(cents).padStart(2, '0')}`
    : whole;
  return isEnglish ? `${SYMBOLS[currency]}${amount}` : `${amount} ${SYMBOLS[currency]}`;
}
