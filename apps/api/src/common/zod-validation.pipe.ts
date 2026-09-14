import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ApiErrorBody } from '@routine/contracts';
import type { z } from 'zod';

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const body: ApiErrorBody = {
      statusCode: 400,
      message: result.error.issues[0]?.message ?? 'Некоректні дані',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
    throw new BadRequestException(body);
  }
}
