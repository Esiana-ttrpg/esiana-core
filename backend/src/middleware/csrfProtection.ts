import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function configuredOrigins(): Set<string> {
  const origins = [env.corsOrigin, env.frontendOrigin, env.backendPublicOrigin]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try { return new URL(value).origin; }
      catch { return ''; }
    })
    .filter(Boolean);
  return new Set(origins);
}

export function isAllowedCsrfOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try { return configuredOrigins().has(new URL(origin).origin); }
  catch { return false; }
}

/**
 * Protect ambient cookie credentials from cross-site state-changing requests.
 * Bearer authentication is explicit rather than ambient and is not subject to
 * browser CSRF, so API clients using Authorization remain origin-independent.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }
  const hasSessionCookie = typeof req.cookies?.[env.cookieName] === 'string';
  const origin = req.headers.origin;

  if (!hasSessionCookie && req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // Requests without ambient credentials remain available to non-browser API
  // clients. Browsers supply Origin for cross-origin unsafe requests, including
  // login CSRF attempts, so a present Origin must always be trusted.
  if (!hasSessionCookie && !origin) {
    next();
    return;
  }
  if (!isAllowedCsrfOrigin(origin)) {
    res.status(403).json({ error: 'Forbidden: invalid request origin' });
    return;
  }
  next();
}
