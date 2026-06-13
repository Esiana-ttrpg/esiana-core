import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from './auth.js';

function normalizeEndpoint(req: Request): string {
  return (req.originalUrl.split('?')[0] ?? req.path ?? '').trim() || '/';
}

function shouldTrack(req: Request): boolean {
  const path = normalizeEndpoint(req);
  if (!path.startsWith('/api/')) return false;
  if (path.startsWith('/api/health')) return false;
  return true;
}

/**
 * Records request telemetry for API usage + quota dashboards.
 *
 * - Fire-and-forget: never blocks the response.
 * - Captures only coarse request metadata (no request bodies).
 */
export function apiRequestTelemetry(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authed = req as AuthenticatedRequest;
  if (!authed.isApiTokenRequest) {
    next();
    return;
  }

  if (!shouldTrack(req)) {
    next();
    return;
  }

  const endpoint = normalizeEndpoint(req);
  const method = req.method;

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const campaignId = (req as any)?.currentCampaign?.id ?? null;

    void prisma.apiRequestLog
      .create({
        data: {
          endpoint,
          method,
          statusCode,
          campaignId: typeof campaignId === 'string' ? campaignId : null,
          userId: authed.user?.id ?? null,
          apiTokenId: authed.apiTokenId ?? null,
        },
      })
      .catch((err) => {
        console.warn('[apiRequestTelemetry] Failed to write ApiRequestLog', err);
      });
  });

  next();
}

