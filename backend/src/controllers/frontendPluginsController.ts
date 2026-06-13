import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  canAccessPluginAssets,
  listFrontendRuntimePlugins,
  resolvePluginAssetPath,
} from '../lib/frontendPlugins.js';
import { prisma } from '../lib/prisma.js';
import { paramString } from '../lib/paramString.js';

async function resolveCampaignId(param: string): Promise<string | null> {
  const byId = await prisma.campaign.findUnique({
    where: { id: param },
    select: { id: true },
  });
  if (byId) return byId.id;

  const bySlug = await prisma.campaign.findUnique({
    where: { handle: param },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}

const MIME_BY_EXT: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export async function listCampaignFrontendRuntime(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = await resolveCampaignId(paramString(req.params.campaignId));
  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const plugins = await listFrontendRuntimePlugins(campaignId);
  res.json({ plugins });
}

export async function listGlobalFrontendRuntime(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const plugins = await listFrontendRuntimePlugins();
  res.json({ plugins });
}

function normalizeAssetPathParam(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw.map((segment) => String(segment).trim()).filter(Boolean).join('/');
  }
  return String(raw ?? '').trim();
}

export async function servePluginAsset(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const pluginId = String(req.params.pluginId ?? '').trim();
  const assetPath = normalizeAssetPathParam(req.params.assetPath);

  if (!pluginId || !assetPath) {
    res.status(400).json({ error: 'Plugin id and asset path are required' });
    return;
  }

  const campaignParam =
    typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined;
  const campaignId = campaignParam
    ? await resolveCampaignId(campaignParam)
    : undefined;

  const allowed = await canAccessPluginAssets(
    pluginId,
    campaignId ?? undefined,
    req.user?.id,
  );
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const resolved = await resolvePluginAssetPath(pluginId, assetPath);
  if (!resolved || !fs.existsSync(resolved.absolutePath)) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  const stat = fs.statSync(resolved.absolutePath);
  if (!stat.isFile()) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  res.setHeader('Content-Type', contentTypeFor(resolved.absolutePath));
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.sendFile(resolved.absolutePath);
}
