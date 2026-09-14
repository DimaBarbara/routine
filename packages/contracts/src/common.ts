/** Тіло будь-якої помилки API. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  issues?: { path: string; message: string }[];
}
