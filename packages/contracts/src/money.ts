export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Базова валюта підсумків: усе інше перераховується за курсом НБУ на дату. */
export const BASE_CURRENCY: Currency = 'UAH';

/** 20 млн у копійках — межа Postgres INTEGER із запасом. */
export const MAX_AMOUNT_MINOR = 2_000_000_000;
