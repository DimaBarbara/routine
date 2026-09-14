import { type ApiErrorBody, ERROR_CODES, type ErrorCode } from '@routine/contracts';

/** `network` — API недоступний або відповів не JSON (наприклад, помилка проксі). */
export type ClientErrorCode = ErrorCode | 'network';

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    readonly status: number,
    readonly issues: NonNullable<ApiErrorBody['issues']> = [],
  ) {
    super(code);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      const code = (ERROR_CODES as readonly string[]).includes(body.code ?? '')
        ? (body.code as ErrorCode)
        : 'INTERNAL';
      return new ApiError(code, response.status, Array.isArray(body.issues) ? body.issues : []);
    } catch {
      return new ApiError(response.status >= 500 ? 'network' : 'INTERNAL', response.status);
    }
  }
}
