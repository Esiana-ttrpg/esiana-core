import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import {
  API_TOKEN_LAST_USED_THROTTLE_MS,
  hashApiToken,
  isLegacyApiToken,
  tokenGrantsAllScopes,
} from '../lib/apiToken.js';
import { serializeUserIdentity } from '../lib/userDisplay.js';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export type AuthMethod = 'session' | 'apiToken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    username: string;
    role: string;
    passwordAuthEnabled: boolean;
  };
  authMethod?: AuthMethod;
  /** Present only when authenticated via `Authorization: Bearer <api-token>`. */
  apiTokenId?: string;
  /** True when authenticated via `Authorization: Bearer <api-token>`. */
  isApiTokenRequest?: boolean;
  /** Scopes granted to the active API token (empty = legacy full access). */
  apiTokenScopes?: string[];
  /** Set for host-orchestrated ephemeral seed tokens. */
  apiTokenName?: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.cookieName, { path: '/' });
}

function parseTokenScopes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}

async function attachUserFromCookie(
  req: AuthenticatedRequest,
): Promise<boolean> {
  const token = req.cookies?.[env.cookieName] as string | undefined;
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        passwordHash: true,
      },
    });
    if (!user) return false;
    req.user = serializeUserIdentity(user);
    return true;
  } catch {
    return false;
  }
}

async function touchApiTokenLastUsed(tokenId: string, lastUsedAt: Date | null): Promise<void> {
  const now = Date.now();
  if (lastUsedAt && now - lastUsedAt.getTime() < API_TOKEN_LAST_USED_THROTTLE_MS) {
    return;
  }
  await prisma.userToken.update({
    where: { id: tokenId },
    data: { lastUsedAt: new Date() },
  });
}

/** Verifies identity via HTTP-only JWT cookie; rejects unauthenticated requests. */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ok = await attachUserFromCookie(req);
  if (!ok) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/** Requires session cookie or valid bearer token (after authenticateApiOrSession). */
export function requireAuthenticatedApiOrSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/** Restrict bearer tokens to specific scopes; session auth bypasses scope checks. */
export function requireTokenScopes(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.authMethod !== 'apiToken') {
      next();
      return;
    }
    const tokenScopes = req.apiTokenScopes ?? [];
    if (!tokenGrantsAllScopes(tokenScopes, requiredScopes)) {
      res.status(403).json({
        error: `API token missing required scope(s): ${requiredScopes.join(', ')}`,
      });
      return;
    }
    next();
  };
}

/** Attaches user when a valid cookie is present; does not reject guests. */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await attachUserFromCookie(req);
  if (req.user) req.authMethod = 'session';
  next();
}

/**
 * Accepts `Authorization: Bearer <api-token>` or a valid session cookie.
 * Invalid bearer tokens are rejected; missing credentials continue as guest.
 */
export async function authenticateApiOrSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.slice('Bearer '.length).trim();
    if (!rawToken) {
      res.status(401).json({ error: 'Bearer token is empty' });
      return;
    }

    try {
      const tokenHash = hashApiToken(rawToken);
      const record = await prisma.userToken.findFirst({
        where: {
          tokenHash,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          name: true,
          scopes: true,
          lastUsedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      if (!record) {
        res.status(401).json({ error: 'Invalid or expired API token' });
        return;
      }

      req.user = serializeUserIdentity(record.user);
      req.authMethod = 'apiToken';
      req.apiTokenId = record.id;
      req.isApiTokenRequest = true;
      req.apiTokenScopes = parseTokenScopes(record.scopes);
      req.apiTokenName = record.name;
      if (isLegacyApiToken(req.apiTokenScopes)) {
        console.warn(
          `[auth] Legacy unscoped API token used by user ${record.user.id} (token ${record.id})`,
        );
      }
      void touchApiTokenLastUsed(record.id, record.lastUsedAt);
      next();
      return;
    } catch (err) {
      console.error('API token authentication failed:', err);
      res.status(500).json({ error: 'Unable to validate API token' });
      return;
    }
  }

  const sessionOk = await attachUserFromCookie(req);
  if (sessionOk) req.authMethod = 'session';
  next();
}
