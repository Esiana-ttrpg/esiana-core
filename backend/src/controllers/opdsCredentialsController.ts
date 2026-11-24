import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { computeTokenExpiry } from '../lib/apiToken.js';
import { generateReaderSecret, hashReaderSecret, OPDS_SCOPE } from '../lib/opds/credentials.js';

export async function readerCredentials(userId?: string) {
  const rows = await prisma.userToken.findMany({ where: userId ? { userId } : {},
    select: { id: true, userId: true, name: true, scopes: true, createdAt: true, expiresAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' } });
  return rows.filter(row => Array.isArray(row.scopes) && row.scopes.length === 1 && row.scopes[0] === OPDS_SCOPE);
}

export async function listReaderCredentials(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  const userId = String(req.params.userId ?? req.user!.id);
  res.json({ credentials: await readerCredentials(userId) });
}

export async function createReaderCredential(req: AuthenticatedRequest, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL_CONFIG' } });
  if (!settings?.opdsEnabled || !settings.opdsPersonalEnabled) { res.status(403).json({ error: 'Personal OPDS catalogs are disabled' }); return; }
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80) { res.status(400).json({ error: 'A credential name of 1–80 characters is required' }); return; }
  const secret = generateReaderSecret();
  const credential = await prisma.userToken.create({ data: { userId: req.user!.id, name,
    tokenHash: hashReaderSecret(secret, env.jwtSecret), scopes: [OPDS_SCOPE], expiresAt: computeTokenExpiry(365) },
    select: { id: true, name: true, createdAt: true, expiresAt: true, lastUsedAt: true, scopes: true } });
  res.status(201).json({ credential, secret });
}

export async function revokeReaderCredentials(req: AuthenticatedRequest, res: Response) {
  return revokeCredentials(req, res, false);
}

export async function revokeAllInstanceReaderCredentials(req: AuthenticatedRequest, res: Response) {
  return revokeCredentials(req, res, true);
}

async function revokeCredentials(req: AuthenticatedRequest, res: Response, global: boolean) {
  const userId = global ? undefined : String(req.params.userId ?? req.user!.id);
  if (global && req.body?.confirmation !== 'REVOKE ALL OPDS CREDENTIALS') {
    res.status(400).json({ error: 'Explicit confirmation is required' }); return;
  }
  const rows = await readerCredentials(userId);
  const selected = req.params.credentialId ? rows.filter(row => row.id === req.params.credentialId) : rows;
  if (req.params.credentialId && !selected.length) { res.sendStatus(404); return; }
  const result = await prisma.$transaction(async tx => {
    const deleted = await tx.userToken.deleteMany({ where: { id: { in: selected.map(row => row.id) } } });
    await tx.opdsAuditLog.create({ data: { actorUserId: req.user!.id, targetUserId: userId ?? null,
      action: global ? 'REVOKE_ALL' : 'REVOKE', count: deleted.count } });
    return deleted.count;
  });
  res.json({ revoked: result });
}

export async function readerCredentialStats(_req: AuthenticatedRequest, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  const rows = (await readerCredentials()).filter(row => row.expiresAt > new Date());
  res.json({ authorizedUsers: new Set(rows.map(row => row.userId)).size, activeCredentials: rows.length });
}
