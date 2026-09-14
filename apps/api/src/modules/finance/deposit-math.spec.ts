import { addMonthsClamped, monthlyOccurrences } from '../../common/dates.js';
import { type DepositTerms, simulateDeposit } from './deposit-math.js';

const terms = (overrides: Partial<DepositTerms> = {}): DepositTerms => ({
  startDate: '2026-01-10',
  termMonths: null,
  annualRateBp: 1200,
  taxRateBp: 0,
  capitalization: true,
  ...overrides,
});

const at = (
  t: DepositTerms,
  contributions: { date: string; amountMinor: number }[],
  date: string,
) => simulateDeposit(t, contributions, [date]).get(date)!;

describe('simulateDeposit', () => {
  const initial = [{ date: '2026-01-10', amountMinor: 100_000 }];

  it('щомісячна капіталізація 12% дає ≈12.68% річних', () => {
    const year = at(terms(), initial, '2027-01-10');
    // (1 + 0.12/12)^12 − 1 ≈ 12.68%; денне нарахування дає розбіжність у межах копійок на 1000 ₴.
    expect(year.balanceMinor).toBeGreaterThan(112_600);
    expect(year.balanceMinor).toBeLessThan(112_760);
    expect(year.contributedMinor).toBe(100_000);
    expect(year.balanceMinor).toBe(year.contributedMinor + year.interestMinor);
  });

  it('без капіталізації відсотки виплачуються, а сума на депозиті не росте', () => {
    const year = at(terms({ capitalization: false }), initial, '2027-01-10');
    expect(year.balanceMinor).toBe(100_000);
    expect(year.interestMinor).toBeGreaterThan(11_900);
    expect(year.interestMinor).toBeLessThan(12_100);
  });

  it('податок зменшує відсотки рівно пропорційно', () => {
    const gross = at(terms({ capitalization: false }), initial, '2027-01-10').interestMinor;
    const net = at(
      terms({ capitalization: false, taxRateBp: 2300 }),
      initial,
      '2027-01-10',
    ).interestMinor;
    expect(Math.abs(net - gross * 0.77)).toBeLessThanOrEqual(1);
  });

  it('після кінця строку відсотки більше не нараховуються', () => {
    const t = terms({ termMonths: 6 });
    const atEnd = at(t, initial, addMonthsClamped('2026-01-10', 6));
    const later = at(t, initial, '2027-06-01');
    expect(later.interestMinor).toBe(atEnd.interestMinor);
  });

  it('до старту — нулі; внески враховуються з їхньої дати', () => {
    const points = simulateDeposit(
      terms(),
      [...initial, { date: '2026-03-01', amountMinor: 50_000 }],
      ['2026-01-01', '2026-02-28', '2026-03-01'],
    );
    expect(points.get('2026-01-01')).toMatchObject({ balanceMinor: 0 });
    expect(points.get('2026-02-28')!.contributedMinor).toBe(100_000);
    expect(points.get('2026-03-01')!.contributedMinor).toBe(150_000);
  });

  it('приклад: 1000 ₴ + 1000 ₴ щомісяця під 15%, податок 23% — ≈13 780 ₴ за рік', () => {
    const t = terms({ annualRateBp: 1500, taxRateBp: 2300 });
    const topUps = monthlyOccurrences(10, '2026-01-10', '2027-01-10').map((date) => ({
      date,
      amountMinor: 100_000,
    }));
    const year = at(t, [...initial, ...topUps], '2027-01-10');
    expect(year.contributedMinor).toBe(1_300_000);
    expect(year.balanceMinor).toBeGreaterThan(1_370_000);
    expect(year.balanceMinor).toBeLessThan(1_385_000);
  });
});
