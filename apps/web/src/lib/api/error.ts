import type { ApiErrorBody } from '@routine/contracts';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: NonNullable<ApiErrorBody['issues']> = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: Partial<Record<keyof ApiErrorBody, unknown>> = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // не JSON — наприклад, API лежить і відповів проксі
    }

    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : typeof body.message === 'string'
        ? body.message
        : response.status >= 500
          ? 'Сервер недоступний, спробуйте пізніше'
          : `Помилка ${response.status}`;

    return new ApiError(
      message,
      response.status,
      Array.isArray(body.issues) ? (body.issues as ApiErrorBody['issues']) : [],
    );
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Щось пішло не так, спробуйте ще раз';
}

/** Перша помилка на кожне поле — з відповіді API або з локальної zod-перевірки. */
export function fieldErrors(issues: { path: PropertyKey[] | string; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = Array.isArray(issue.path) ? issue.path.map(String).join('.') : String(issue.path);
    errors[key] ??= issue.message;
  }
  return errors;
}
