const API_BASE = '/api';

export class ApiError extends Error {
  public details?: string[];
  public retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    details?: string[],
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  declare status: number;
}

function formatRateLimitMessage(
  fallback: string,
  retryAfterSeconds?: number,
): string {
  if (retryAfterSeconds == null || !Number.isFinite(retryAfterSeconds)) {
    return fallback;
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `${fallback} Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string[];
      retryAfterSeconds?: number;
    };
    const baseMessage = body.error ?? `Request failed: ${res.status}`;
    const message =
      res.status === 429
        ? formatRateLimitMessage(baseMessage, body.retryAfterSeconds)
        : baseMessage;
    throw new ApiError(
      message,
      res.status,
      body.details,
      body.retryAfterSeconds,
    );
  }

  // Handle 204 No Content and other responses with empty body
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

export async function apiFetchOptional<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    ...init,
  });

  if (res.status === 401) return null;

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string[];
      retryAfterSeconds?: number;
    };
    const baseMessage = body.error ?? `Request failed: ${res.status}`;
    const message =
      res.status === 429
        ? formatRateLimitMessage(baseMessage, body.retryAfterSeconds)
        : baseMessage;
    throw new ApiError(
      message,
      res.status,
      body.details,
      body.retryAfterSeconds,
    );
  }

  // Handle 204 No Content and other responses with empty body
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json() as Promise<T>;
}
