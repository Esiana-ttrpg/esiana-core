import type { Request } from 'express';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from './auth.js';
import {
  clientIpKey,
  createMarkedLimiter,
} from '../lib/rateLimit/index.js';

export { clientIpKey };

function normalizeEmail(req: Request): string {
  const body = req.body as { email?: unknown } | undefined;
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return email || 'unknown-email';
}

/** Login: per IP + email composite (lenient for small self-hosted instances). */
export const authLoginLimiter = createMarkedLimiter('login', 'ip+email', {
  windowMs: env.rateLimit.loginWindowMs,
  max: env.rateLimit.loginMax,
  keyGenerator: (req) => `${clientIpKey(req)}:${normalizeEmail(req)}`,
});

/** Login: per-email cap across all IPs (distributed brute-force guard). */
export const authLoginEmailLimiter = createMarkedLimiter('login-email', 'email', {
  windowMs: env.rateLimit.loginEmailWindowMs,
  max: env.rateLimit.loginEmailMax,
  keyGenerator: (req) => `email:${normalizeEmail(req)}`,
});

export const authRegisterLimiter = createMarkedLimiter('register', 'ip', {
  windowMs: env.rateLimit.registerWindowMs,
  max: env.rateLimit.registerMax,
  keyGenerator: clientIpKey,
});

export const authPasswordChangeLimiter = createMarkedLimiter(
  'password-change',
  'account',
  {
    windowMs: env.rateLimit.passwordChangeWindowMs,
    max: env.rateLimit.passwordChangeMax,
    keyGenerator: (req) => {
      const user = (req as AuthenticatedRequest).user;
      return user?.id ? `user:${user.id}` : clientIpKey(req);
    },
  },
);

export const authPasswordResetLimiter = createMarkedLimiter(
  'password-reset',
  'email',
  {
    windowMs: env.rateLimit.passwordResetWindowMs,
    max: env.rateLimit.passwordResetMax,
    keyGenerator: (req) => `reset:${normalizeEmail(req)}`,
  },
);

export const authPasswordResetConsumeLimiter = createMarkedLimiter(
  'password-reset-consume',
  'ip',
  {
    windowMs: env.rateLimit.passwordResetWindowMs,
    max: env.rateLimit.passwordResetMax,
    keyGenerator: clientIpKey,
  },
);

function oidcProviderId(req: Request): string {
  return String(req.params.providerId ?? '').trim() || 'unknown-provider';
}

/** OIDC authorize redirect initiation (per IP + provider). */
export const oidcStartLimiter = createMarkedLimiter('oidc-start', 'ip+provider', {
  windowMs: env.rateLimit.oidcStartWindowMs,
  max: env.rateLimit.oidcStartMax,
  keyGenerator: (req) => `oidc-start:${clientIpKey(req)}:${oidcProviderId(req)}`,
});

/** OIDC callback (includes validation failures; per IP + provider). */
export const oidcCallbackLimiter = createMarkedLimiter(
  'oidc-callback',
  'ip+provider',
  {
    windowMs: env.rateLimit.oidcCallbackWindowMs,
    max: env.rateLimit.oidcCallbackMax,
    keyGenerator: (req) =>
      `oidc-callback:${clientIpKey(req)}:${oidcProviderId(req)}`,
  },
);

export const campaignInviteEmailLimiter = createMarkedLimiter(
  'invite-email',
  'account+campaign',
  {
    windowMs: env.rateLimit.inviteEmailPerCampaignWindowMs,
    max: env.rateLimit.inviteEmailPerCampaignMax,
    keyGenerator: (req) => {
      const campaignHandle = String(req.params.campaignHandle ?? '').trim();
      const user = (req as AuthenticatedRequest).user;
      return `invite-email:${campaignHandle}:${user?.id ?? clientIpKey(req)}`;
    },
  },
);

export const applyToCampaignLimiter = createMarkedLimiter(
  'apply',
  'account+campaign',
  {
    windowMs: env.rateLimit.applyPerCampaignWindowMs,
    max: env.rateLimit.applyPerCampaignMax,
    keyGenerator: (req) => {
      const user = (req as AuthenticatedRequest).user;
      const campaignId =
        String(req.params.campaignId ?? req.params.id ?? '').trim() ||
        String(req.params.campaignHandle ?? '').trim();
      return `apply:${user?.id ?? clientIpKey(req)}:${campaignId}`;
    },
  },
);

export const applyGlobalLimiter = createMarkedLimiter('apply-global', 'account', {
  windowMs: env.rateLimit.applyGlobalWindowMs,
  max: env.rateLimit.applyGlobalMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return `apply-global:${user?.id ?? clientIpKey(req)}`;
  },
});

export const apiTokenMintLimiter = createMarkedLimiter('token-mint', 'account', {
  windowMs: env.rateLimit.tokenMintWindowMs,
  max: env.rateLimit.tokenMintMax,
  keyGenerator: (req) => {
    const user = (req as AuthenticatedRequest).user;
    return `token-mint:${user?.id ?? clientIpKey(req)}`;
  },
});

/** Workshop draft API: per-user per-campaign (autosave-friendly). */
export const workshopDraftLimiter = createMarkedLimiter(
  'workshop-draft',
  'account+campaign',
  {
    windowMs: 60_000,
    max: 180,
    keyGenerator: (req) => {
      const user = (req as AuthenticatedRequest).user;
      const campaignHandle = String(req.params.campaignHandle ?? '').trim();
      return `workshop-draft:${user?.id ?? clientIpKey(req)}:${campaignHandle}`;
    },
  },
);

/** Campaign URL image import: per authenticated user. */
export const campaignUrlImportLimiter = createMarkedLimiter(
  'url-import',
  'account',
  {
    windowMs: 60_000,
    max: 10,
    keyGenerator: (req) => {
      const user = (req as AuthenticatedRequest).user;
      return `url-import:${user?.id ?? clientIpKey(req)}`;
    },
  },
);
