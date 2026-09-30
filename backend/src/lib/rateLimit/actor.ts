import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import type { AuthenticatedRequest } from '../../middleware/auth.js';

export type RateLimitActorKind = 'user' | 'ip';

export interface RateLimitActor {
  kind: RateLimitActorKind;
  /** Account-wide key: `user:<id>` or `ip:<normalized>` for anonymous. */
  accountKey: string;
  /** Present only for bearer API-token requests. */
  apiTokenId?: string;
  /** Normalized client IP (IPv6-safe). */
  ip: string;
}

/** Normalized IP key for rate limits (IPv6-safe per express-rate-limit). */
export function clientIpKey(req: Request): string {
  const raw = req.ip ?? req.socket.remoteAddress;
  if (!raw) return 'unknown';
  return ipKeyGenerator(raw);
}

/**
 * Resolve the rate-limit actor from existing auth identity.
 * Does not perform authentication — reads `req.user` / `req.apiTokenId`
 * populated by `authenticateApiOrSession` / `requireAuth` / `optionalAuth`.
 */
export function resolveRateLimitActor(req: Request): RateLimitActor {
  const authReq = req as AuthenticatedRequest;
  const ip = clientIpKey(req);
  const userId = authReq.user?.id;

  if (userId) {
    return {
      kind: 'user',
      accountKey: `user:${userId}`,
      apiTokenId:
        authReq.authMethod === 'apiToken' && authReq.apiTokenId
          ? authReq.apiTokenId
          : undefined,
      ip,
    };
  }

  return {
    kind: 'ip',
    accountKey: `ip:${ip}`,
    ip,
  };
}
