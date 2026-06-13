import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  API_TOKEN_DURATION_DAYS,
  API_TOKEN_SCOPES,
  computeTokenExpiry,
  generateApiTokenSecret,
  hashApiToken,
  isApiTokenDurationDays,
  parseApiTokenScopes,
} from '../lib/apiToken.js';

const TOKEN_NAME_MAX_LENGTH = 80;

function sanitizeTokenName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (!name || name.length > TOKEN_NAME_MAX_LENGTH) return null;
  return name;
}

function serializeTokenListItem(row: {
  id: string;
  name: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date | null;
  scopes: unknown;
}) {
  const scopes = Array.isArray(row.scopes)
    ? row.scopes.filter((entry): entry is string => typeof entry === 'string')
    : [];
  return {
    id: row.id,
    name: row.name,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    scopes,
    isLegacy: scopes.length === 0,
    expired: row.expiresAt.getTime() <= Date.now(),
  };
}

export async function listUserTokens(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tokens = await prisma.userToken.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
      scopes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ tokens: tokens.map(serializeTokenListItem) });
}

export async function createUserToken(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { name, durationDays, scopes } = req.body as {
    name?: unknown;
    durationDays?: unknown;
    scopes?: unknown;
  };

  const sanitizedName = sanitizeTokenName(name);
  if (!sanitizedName) {
    res.status(400).json({
      error: `Token name is required (max ${TOKEN_NAME_MAX_LENGTH} characters)`,
    });
    return;
  }

  if (!isApiTokenDurationDays(durationDays)) {
    res.status(400).json({
      error: `durationDays must be one of: ${API_TOKEN_DURATION_DAYS.join(', ')}`,
    });
    return;
  }

  const parsedScopes = parseApiTokenScopes(scopes);
  if (parsedScopes === null) {
    res.status(400).json({
      error: `scopes must be an array of known values: ${Object.values(API_TOKEN_SCOPES).join(', ')}`,
    });
    return;
  }

  const rawToken = generateApiTokenSecret();
  const tokenHash = hashApiToken(rawToken);
  const expiresAt = computeTokenExpiry(durationDays);

  const created = await prisma.userToken.create({
    data: {
      userId: req.user!.id,
      name: sanitizedName,
      tokenHash,
      expiresAt,
      scopes: parsedScopes,
    },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
      scopes: true,
    },
  });

  res.status(201).json({
    token: serializeTokenListItem(created),
    /** Cleartext secret — returned once at creation. */
    secret: rawToken,
  });
}

export async function revokeUserToken(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tokenId = String(req.params.tokenId);

  const existing = await prisma.userToken.findFirst({
    where: { id: tokenId, userId: req.user!.id },
    select: { id: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'API token not found' });
    return;
  }

  await prisma.userToken.delete({ where: { id: tokenId } });

  res.json({ ok: true });
}
