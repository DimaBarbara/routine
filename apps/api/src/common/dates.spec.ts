import { addMonthsClamped, monthBounds, monthlyOccurrences, shiftMonth } from './dates.js';

describe('dates', () => {
  it('додає місяці з притиском до кінця місяця', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    // День береться з вихідної дати, а не з попереднього результату.
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('місяці та межі місяця', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthBounds('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('щомісячні дати: строго після і включно до', () => {
    expect(monthlyOccurrences(5, '2026-01-05', '2026-04-04')).toEqual(['2026-02-05', '2026-03-05']);
    expect(monthlyOccurrences(31, '2026-01-01', '2026-03-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
    expect(monthlyOccurrences(10, '2026-05-01', '2026-04-01')).toEqual([]);
  });
});
