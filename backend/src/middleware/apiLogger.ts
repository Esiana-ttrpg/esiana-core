import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashApiToken } from '../lib/apiToken.js';
import type { AuthTokenPayload, AuthenticatedRequest } from './auth.js';

/** Plugin catalog routes and external sync paths counted toward usage analytics. */
export function isApiUsageTrackedPath(path: string): boolean {
  const normalized = path.split('?')[0] ?? path;
  if (normalized.startsWith('/api/plugins')) return true;
  if (normalized.includes('/plugins')) return true;
  if (/\/sync\b/i.test(normalized)) return true;
  return false;
}

function requestPath(req: Request): string {
  return req.originalUrl.split('?')[0] ?? req.path;
}

async function resolveUserId(req: Request): Promise<string | null> {
  const authed = req as AuthenticatedRequest;
  if (authed.user?.id) return authed.user.id;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.slice('Bearer '.length).trim();
    if (rawToken) {
      try {
        const record = await prisma.userToken.findFirst({
          where: { tokenHash: hashApiToken(rawToken), expiresAt: { gt: new Date() } },
          select: { userId: true },
        });
        if (record) return record.userId;
      } catch {
        /* ignore */
      }
    }
  }

  const token = req.cookies?.[env.cookieName] as string | undefined;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * On response finish, records plugin/sync API usage for authenticated users.
 * Fire-and-forget — logging failures never block the request.
 */
export function apiUsageLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const path = requestPath(req);
  if (!isApiUsageTrackedPath(path)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 500) return;

    void (async () => {
      const userId = await resolveUserId(req);
      if (!userId) return;

      await prisma.apiLog.create({
        data: {
          userId,
          path,
          method: req.method,
        },
      });
    })().catch((err) => {
      console.warn('[apiLogger] Failed to write ApiLog:', err);
    });
  });

  next();
}
