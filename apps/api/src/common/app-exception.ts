import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from '@routine/contracts';

/** Єдиний тип помилок застосунку: стабільний код замість тексту для людей. */
export class AppException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, issues?: ApiErrorBody['issues']) {
    const body: ApiErrorBody = { statusCode: status, code, message: code, issues };
    super(body, status);
  }

  static badRequest(code: ErrorCode) {
    return new AppException(HttpStatus.BAD_REQUEST, code);
  }

  static unauthorized(code: ErrorCode = 'AUTH_REQUIRED') {
    return new AppException(HttpStatus.UNAUTHORIZED, code);
  }

  static forbidden(code: ErrorCode) {
    return new AppException(HttpStatus.FORBIDDEN, code);
  }

  static notFound(code: ErrorCode) {
    return new AppException(HttpStatus.NOT_FOUND, code);
  }

  static conflict(code: ErrorCode) {
    return new AppException(HttpStatus.CONFLICT, code);
  }
}
