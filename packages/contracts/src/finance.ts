import { z } from 'zod';

import { CURRENCIES, type Currency, MAX_AMOUNT_MINOR } from './money.js';
import {
  isoDateSchema,
  optionalIsoDateSchema,
  optionalText,
  requiredText,
} from './schema-helpers.js';

export const EXPENSE_CATEGORIES = [
  'FOOD',
  'CAFE',
  'ENTERTAINMENT',
  'TRANSPORT',
  'HOME',
  'UTILITIES',
  'HEALTH',
  'BEAUTY',
  'CLOTHES',
  'SUBSCRIPTIONS',
  'EDUCATION',
  'TRAVEL',
  'GIFTS',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_KINDS = ['FIXED', 'UNPLANNED'] as const;
export type IncomeKind = (typeof INCOME_KINDS)[number];

export type TransactionType = 'EXPENSE' | 'INCOME';

/** Податок на депозитні відсотки за замовчуванням: 18% ПДФО + 5% військовий збір. */
export const DEFAULT_DEPOSIT_TAX_BP = 2300;

/** Обмеження в zod накопичуються, тож «≥ 0» і «≥ 1» — окремі схеми, а не .min() поверх іншої. */
const amountFrom = (min: number) =>
  z
    .number({ error: 'validation.amountInvalid' })
    .int({ error: 'validation.amountInvalid' })
    .min(min, { error: 'validation.amountInvalid' })
    .max(MAX_AMOUNT_MINOR, { error: 'validation.amountTooHigh' });

const amountSchema = amountFrom(1);
const nonNegativeAmountSchema = amountFrom(0);

const currencySchema = z.enum(CURRENCIES, { error: 'validation.invalid' });
const personIdSchema = z.string().min(1).nullable();
const dayOfMonthSchema = z
  .number({ error: 'validation.dayInvalid' })
  .int({ error: 'validation.dayInvalid' })
  .min(1, { error: 'validation.dayInvalid' })
  .max(31, { error: 'validation.dayInvalid' });
/** Базисні пункти: 1500 = 15%. */
const percentBpSchema = z
  .number({ error: 'validation.rateInvalid' })
  .int({ error: 'validation.rateInvalid' })
  .min(0, { error: 'validation.rateInvalid' })
  .max(10_000, { error: 'validation.rateInvalid' });

// ── Операції ──────────────────────────────────────────────────────────────────

const transactionBase = {
  amountMinor: amountSchema,
  currency: currencySchema,
  date: isoDateSchema,
  note: optionalText(200),
  /** Хто витратив / заробив. */
  personId: personIdSchema,
};

export const transactionInputSchema = z.discriminatedUnion(
  'type',
  [
    z.object({
      type: z.literal('EXPENSE'),
      category: z.enum(EXPENSE_CATEGORIES, { error: 'validation.required' }),
      ...transactionBase,
    }),
    z.object({
      type: z.literal('INCOME'),
      incomeKind: z.enum(INCOME_KINDS, { error: 'validation.required' }),
      ...transactionBase,
    }),
  ],
  { error: 'validation.invalid' },
);
export type TransactionInput = z.output<typeof transactionInputSchema>;

export const monthQuerySchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

// ── Регулярний дохід ─────────────────────────────────────────────────────────

const recurringIncomeFields = z.object({
  title: requiredText(80),
  amountMinor: amountSchema,
  currency: currencySchema,
  dayOfMonth: dayOfMonthSchema,
  startDate: isoDateSchema,
  endDate: optionalIsoDateSchema,
  personId: personIdSchema,
});

const endNotBeforeStart = (data: { startDate?: string; endDate?: string | null }) =>
  !data.startDate || !data.endDate || data.endDate >= data.startDate;
const endBeforeStartIssue = { path: ['endDate'], error: 'validation.endBeforeStart' };

export const recurringIncomeInputSchema = recurringIncomeFields.refine(
  endNotBeforeStart,
  endBeforeStartIssue,
);
export type RecurringIncomeInput = z.output<typeof recurringIncomeInputSchema>;

export const recurringIncomeUpdateSchema = recurringIncomeFields
  .extend({ paused: z.boolean() })
  .partial()
  .refine(endNotBeforeStart, endBeforeStartIssue);
export type RecurringIncomeUpdate = z.output<typeof recurringIncomeUpdateSchema>;

// ── Готівка ───────────────────────────────────────────────────────────────────

export const cashEntryInputSchema = z.object({
  /** IN — відклав у скарбничку, OUT — взяв звідти. */
  direction: z.enum(['IN', 'OUT'], { error: 'validation.required' }),
  amountMinor: amountSchema,
  currency: currencySchema,
  date: isoDateSchema,
  note: optionalText(200),
  personId: personIdSchema,
});
export type CashEntryInput = z.output<typeof cashEntryInputSchema>;

// ── Депозити ──────────────────────────────────────────────────────────────────

const depositFields = z.object({
  name: requiredText(80),
  bank: optionalText(80),
  currency: currencySchema,
  annualRateBp: percentBpSchema,
  taxRateBp: percentBpSchema,
  capitalization: z.boolean({ error: 'validation.invalid' }),
  startDate: isoDateSchema,
  termMonths: z
    .number({ error: 'validation.termInvalid' })
    .int({ error: 'validation.termInvalid' })
    .min(1, { error: 'validation.termInvalid' })
    .max(600, { error: 'validation.termInvalid' })
    .nullable(),
  monthlyTopUpMinor: nonNegativeAmountSchema,
  topUpDay: dayOfMonthSchema,
  personId: personIdSchema,
});

export const depositInputSchema = depositFields.extend({
  taxRateBp: depositFields.shape.taxRateBp.default(DEFAULT_DEPOSIT_TAX_BP),
  initialAmountMinor: nonNegativeAmountSchema,
});
export type DepositInput = z.output<typeof depositInputSchema>;

/** Початкова сума редагується як звичайний внесок, тому її тут немає. */
export const depositUpdateSchema = depositFields.partial();
export type DepositUpdate = z.output<typeof depositUpdateSchema>;

export const contributionInputSchema = z.object({
  amountMinor: amountSchema,
  date: isoDateSchema,
  note: optionalText(200),
});
export type ContributionInput = z.output<typeof contributionInputSchema>;

export const analyticsQuerySchema = z.object({
  to: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

// ── DTO ───────────────────────────────────────────────────────────────────────

export interface FinancePerson {
  id: string;
  name: string;
}

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: Currency;
  category: ExpenseCategory | null;
  incomeKind: IncomeKind | null;
  note: string | null;
  date: string;
  person: FinancePerson | null;
  recurringIncomeId: string | null;
  /** Сума в гривні за курсом НБУ на дату; null — курс невідомий. */
  amountBaseMinor: number | null;
}

export interface RecurringIncomeDto {
  id: string;
  title: string;
  amountMinor: number;
  currency: Currency;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  person: FinancePerson | null;
  paused: boolean;
  nextDate: string | null;
}

export interface FinanceMonth {
  month: string;
  transactions: TransactionDto[];
  recurringIncomes: RecurringIncomeDto[];
  members: FinancePerson[];
}

export interface CashEntryDto {
  id: string;
  /** Зі знаком: + відклав, − взяв. */
  amountMinor: number;
  currency: Currency;
  date: string;
  note: string | null;
  person: FinancePerson | null;
}

export interface CashStash {
  balances: { currency: Currency; amountMinor: number }[];
  totalBaseMinor: number;
  entries: CashEntryDto[];
  members: FinancePerson[];
}

export interface DepositPoint {
  date: string;
  contributedMinor: number;
  interestMinor: number;
  balanceMinor: number;
}

export interface ContributionDto {
  id: string;
  kind: 'INITIAL' | 'SCHEDULED' | 'EXTRA';
  amountMinor: number;
  date: string;
  note: string | null;
}

export interface DepositDto {
  id: string;
  name: string;
  bank: string | null;
  currency: Currency;
  annualRateBp: number;
  taxRateBp: number;
  capitalization: boolean;
  startDate: string;
  termMonths: number | null;
  /** Кінець строку; null — безстроковий. */
  endDate: string | null;
  monthlyTopUpMinor: number;
  topUpDay: number;
  person: FinancePerson | null;
  /** Стан на сьогодні — за реальними внесками. */
  current: DepositPoint;
  /** Щомісячні точки від старту до горизонту: минуле — факт, майбутнє — план. */
  projection: DepositPoint[];
  nextTopUpDate: string | null;
  contributions: ContributionDto[];
}

export interface FinanceMonthSummary {
  month: string;
  incomeFixedMinor: number;
  incomeUnplannedMinor: number;
  expenseMinor: number;
  /** Відкладено в готівку мінус взято, у гривні. */
  savedMinor: number;
  expenseByCategory: Partial<Record<ExpenseCategory, number>>;
}

export interface FinanceAnalytics {
  baseCurrency: Currency;
  months: FinanceMonthSummary[];
  /** Для частини сум курсу не знайшлося — вони не увійшли в підсумки. */
  incomplete: boolean;
}
