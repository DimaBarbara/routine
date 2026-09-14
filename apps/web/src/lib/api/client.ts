import { ApiError } from './error';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Для клієнтських компонентів: same-origin /api/*, cookie додає браузер. */
export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 0);
  }

  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
