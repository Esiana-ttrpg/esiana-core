import type { Request, Response } from 'express';
import type { Options } from 'express-rate-limit';

export interface RateLimitHandlerMeta {
  policy: string;
  scope: string;
}

/**
 * Consistent 429 body used by named policies and legacy narrow limiters.
 * `RateLimit-*` / `Retry-After` headers come from express-rate-limit
 * `standardHeaders: 'draft-7'`.
 */
export function createRateLimitHandler(meta: RateLimitHandlerMeta) {
  return (
    req: Request,
    res: Response,
    _next: () => void,
    options: Options,
  ): void => {
    const windowMs =
      typeof options.windowMs === 'number' ? options.windowMs : 60_000;
    const resetTime = (
      req as Request & {
        rateLimit?: { resetTime?: Date };
      }
    ).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.max(1, Math.ceil(windowMs / 1000));

    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      policy: meta.policy,
      scope: meta.scope,
      retryAfterSeconds,
    });
  };
}
