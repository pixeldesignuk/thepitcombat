export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(path, {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null) as { message?: unknown; code?: unknown } | null;
    if (!response.ok) {
      const fallback = response.status === 401
        ? 'Your session has ended. Sign in again.'
        : response.status === 403
          ? 'You do not have permission to do that.'
          : response.status >= 500
            ? 'The console service is unavailable. Try again.'
            : 'The request could not be completed.';
      throw new ApiError(
        typeof payload?.message === 'string' ? payload.message : fallback,
        response.status,
        typeof payload?.code === 'string' ? payload.code : undefined,
      );
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('The request took too long. Try again.', 0);
    throw new ApiError('Could not connect to the console service. Check your connection and try again.', 0);
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
