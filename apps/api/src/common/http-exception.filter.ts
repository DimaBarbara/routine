import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from '@routine/contracts';
import type { Response } from 'express';

import { AppException } from './app-exception.js';

const FALLBACK_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_REQUIRED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  // Єдине джерело 413 — завантаження фото понад ліміт multer.
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PROFILE_AVATAR_INVALID',
};

/** Приводить будь-яку помилку до ApiErrorBody — фронт завжди отримує `code`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ApiErrorBody = {
        statusCode: status,
        code: FALLBACK_CODES[status] ?? 'INTERNAL',
        message: exception.message,
      };
      response.status(status).json(body);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    const body: ApiErrorBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Internal server error',
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
