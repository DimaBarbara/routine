/**
 * Перевірка на етапі typecheck: кожна мова містить усі ключі української,
 * а кожен код помилки API має переклад. Пропущений рядок = помилка tsc.
 */
import type { ErrorCode } from '@routine/contracts';

import type en from '../../messages/en.json';
import type ru from '../../messages/ru.json';
import type uk from '../../messages/uk.json';

type DeepKeys<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${DeepKeys<T[K]>}` }[keyof T &
      string];

type MissingIn<Target> = Exclude<DeepKeys<typeof uk>, DeepKeys<Target>>;

type AssertNever<T extends never> = T;

export type RuIsComplete = AssertNever<MissingIn<typeof ru>>;
export type EnIsComplete = AssertNever<MissingIn<typeof en>>;
export type ErrorsAreTranslated = AssertNever<Exclude<ErrorCode, keyof (typeof uk)['errors']>>;
