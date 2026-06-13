import { createHash, randomBytes } from 'node:crypto';

export const API_TOKEN_DURATION_DAYS = [30, 90, 365] as const;
export type ApiTokenDurationDays = (typeof API_TOKEN_DURATION_DAYS)[number];

export function hashApiToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateApiTokenSecret(): string {
  return randomBytes(32).toString('hex');
}

export function isApiTokenDurationDays(value: unknown): value is ApiTokenDurationDays {
  return (
    typeof value === 'number' &&
    (API_TOKEN_DURATION_DAYS as readonly number[]).includes(value)
  );
}

export function computeTokenExpiry(durationDays: ApiTokenDurationDays): Date {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
  return expiresAt;
}

/** Known API token scopes (extensible; empty token scopes = legacy full access). */
export const API_TOKEN_SCOPES = {
  CAMPAIGN_READ: 'campaign:read',
  CAMPAIGN_WRITE: 'campaign:write',
  CAMPAIGN_SEED: 'campaign:seed',
  PLUGINS_READ: 'plugins:read',
  PLUGINS_MANAGE: 'plugins:manage',
} as const;

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[keyof typeof API_TOKEN_SCOPES];

const KNOWN_SCOPES = new Set<string>(Object.values(API_TOKEN_SCOPES));

export function parseApiTokenScopes(raw: unknown): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const scopes: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') return null;
    const scope = entry.trim();
    if (!scope) return null;
    if (!KNOWN_SCOPES.has(scope)) return null;
    if (!scopes.includes(scope)) scopes.push(scope);
  }
  return scopes;
}

export function tokenGrantsScope(tokenScopes: string[], required: string): boolean {
  if (tokenScopes.length === 0) return true;
  return tokenScopes.includes(required);
}

export function tokenGrantsAllScopes(tokenScopes: string[], required: string[]): boolean {
  if (tokenScopes.length === 0) return true;
  return required.every((scope) => tokenScopes.includes(scope));
}

export const API_TOKEN_LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

/** Empty scopes = legacy full-access token (sunset planned v1.2). */
export function isLegacyApiToken(scopes: string[]): boolean {
  return scopes.length === 0;
}
