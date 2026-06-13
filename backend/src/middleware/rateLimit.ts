import rateLimit, {
  ipKeyGenerator,
  type Options,
  type RateLimitRequestHandler,
} from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from './auth.js';

function handler(
  _req: Request,
  res: Response,
  _next: () => void,
  options: Options,
): void {
  const windowMs =
    typeof options.windowMs === 'number' ? options.windowMs : 60_000;
  const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  res.status(429).json({
    error: 'Too many requests. Please try again later.',
    retryAfterSeconds,
  });
}

function createLimiter(options: Partial<Options>): RateLimitRequestHandler {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...options,
  });
}

/** Normalized IP key for rate limits (IPv6-safe per express-rate-limit). */
function clientIpKey(req: Request): string {
  const raw = req.ip ?? req.socket.remoteAddress;
  if (!raw) return 'unknown';
  return ipKeyGenerator(raw);
}

function normalizeEmail(req: Request): string {
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return email || 'unknown-email';
}

/** Login: per IP + email composite (lenient for small self-hosted instances). */
export const authLoginLimiter = createLimiter({
  windowMs: env.rateLimit.loginWindowMs,
  max: env.rateLimit.loginMax,
  keyGenerator: (req) => `${clientIpKey(req)}:${normalizeEmail(req)}`,
});

/** Login: per-email cap across all IPs (distributed brute-force guard). */
export const authLoginEmailLimiter = createLimiter({
  windowMs: env.rateLimit.loginEmailWindowMs,
  max: env.rateLimit.loginEmailMax,
  keyGenerator: (req) => `email:${normalizeEmail(req)}`,
});

export const authRegisterLimiter = createLimiter({
  windowMs: env.rateLimit.registerWindowMs,
  max: env.rateLimit.registerMax,
  keyGenerator: clientIpKey,
});

export const authPasswordChangeLimiter = createLimiter({
  windowMs: env.rateLimit.passwordChangeWindowMs,
  max: env.rateLimit.passwordChangeMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return user?.id ? `user:${user.id}` : clientIpKey(req);
  },
});

/** Reserved for future forgot/reset password routes. */
export const authPasswordResetLimiter = createLimiter({
  windowMs: env.rateLimit.passwordResetWindowMs,
  max: env.rateLimit.passwordResetMax,
  keyGenerator: (req) => `reset:${normalizeEmail(req)}`,
});

export const authPasswordResetConsumeLimiter = createLimiter({
  windowMs: env.rateLimit.passwordResetWindowMs,
  max: env.rateLimit.passwordResetMax,
  keyGenerator: clientIpKey,
});

export const campaignInviteEmailLimiter = createLimiter({
  windowMs: env.rateLimit.inviteEmailPerCampaignWindowMs,
  max: env.rateLimit.inviteEmailPerCampaignMax,
  keyGenerator: (req) => {
    const campaignHandle = String(req.params.campaignHandle ?? '').trim();
    const user = (req as AuthenticatedRequest).user;
    return `invite-email:${campaignHandle}:${user?.id ?? clientIpKey(req)}`;
  },
});

export const applyToCampaignLimiter = createLimiter({
  windowMs: env.rateLimit.applyPerCampaignWindowMs,
  max: env.rateLimit.applyPerCampaignMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    const campaignId =
      String(req.params.campaignId ?? req.params.id ?? '').trim() ||
      String(req.params.campaignHandle ?? '').trim();
    return `apply:${user?.id ?? clientIpKey(req)}:${campaignId}`;
  },
});

export const applyGlobalLimiter = createLimiter({
  windowMs: env.rateLimit.applyGlobalWindowMs,
  max: env.rateLimit.applyGlobalMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return `apply-global:${user?.id ?? clientIpKey(req)}`;
  },
});

export const apiTokenMintLimiter = createLimiter({
  windowMs: env.rateLimit.tokenMintWindowMs,
  max: env.rateLimit.tokenMintMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return `token-mint:${user?.id ?? clientIpKey(req)}`;
  },
});

/** Campaign URL image import: per authenticated user. */
export const campaignUrlImportLimiter = createLimiter({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return `url-import:${user?.id ?? clientIpKey(req)}`;
  },
});
