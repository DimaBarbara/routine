import { cookies } from 'next/headers';

import { ApiError } from './error';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Для серверних компонентів: іде напряму в Nest і пробрасує cookie користувача. */
export async function serverApi<T>(path: string): Promise<T> {
  const cookieStore = await cookies();

  const response = await fetch(`${API_URL}/api${path}`, {
    cache: 'no-store',
    headers: { accept: 'application/json', cookie: cookieStore.toString() },
  });

  if (!response.ok) throw await ApiError.fromResponse(response);
  return (await response.json()) as T;
}
