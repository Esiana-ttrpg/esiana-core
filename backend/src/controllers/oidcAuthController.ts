import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  completeOidcCallback,
  listEnabledAuthProviders,
  startOidcFlow,
} from '../lib/auth/oidcFlow.js';
import { env } from '../config/env.js';
import { paramString } from '../lib/paramString.js';

export async function listAuthProviders(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const providers = await listEnabledAuthProviders();
  res.json({ providers });
}

export async function startOidcAuth(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const providerId = paramString(req.params.providerId);
  if (!providerId) {
    res.status(400).json({ error: 'Provider id is required' });
    return;
  }

  const mode =
    req.query.mode === 'link' ? ('link' as const) : ('login' as const);
  const returnTo =
    typeof req.query.returnTo === 'string' ? req.query.returnTo : undefined;

  if (mode === 'link' && !req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const url = await startOidcFlow({
      providerId,
      mode,
      sessionUserId: req.user?.id,
      returnTo,
    });
    res.redirect(url);
  } catch {
    const base = env.frontendOrigin.replace(/\/+$/, '');
    const target = new URL(mode === 'link' ? '/settings' : '/', base);
    target.searchParams.set('tab', 'account');
    target.searchParams.set('authError', 'provider_start_failed');
    res.redirect(target.toString());
  }
}

export async function oidcCallback(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const providerId = paramString(req.params.providerId);
  if (!providerId) {
    res.status(400).json({ error: 'Provider id is required' });
    return;
  }

  const callbackUrl = new URL(
    `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`,
  );

  await completeOidcCallback(providerId, callbackUrl, res);
}

export function getOidcCallbackUrlTemplate(providerId: string): string {
  const base = env.backendPublicOrigin.replace(/\/+$/, '');
  return `${base}/api/auth/oidc/${encodeURIComponent(providerId)}/callback`;
}
