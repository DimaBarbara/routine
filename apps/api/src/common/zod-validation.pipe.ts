import { HttpStatus, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { AppException } from './app-exception.js';

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new AppException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_FAILED',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
}
