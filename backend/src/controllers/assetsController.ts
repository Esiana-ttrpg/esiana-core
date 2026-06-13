import type { Response } from 'express';
import { env } from '../config/env.js';
import {
  evaluateAssetAccess,
  findAssetById,
  findAssetByStoredFilename,
  loadCampaignRoleForUser,
  resolveAssetVariantPointer,
} from '../lib/assetAccess.js';
import {
  contentTypeForFilename,
  streamReadableWithCache,
} from '../lib/assetStreamHeaders.js';
import { resolveDriverForPointer } from '../lib/storage/storagePointer.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

async function deliverStorageObject(
  req: AuthenticatedRequest,
  res: Response,
  pointer: string,
  contentFilename: string,
): Promise<void> {
  const resolved = resolveDriverForPointer(pointer);
  if (!resolved) {
    throw new Error('Storage pointer is invalid');
  }

  const delivery = await resolved.driver.openRead({
    key: resolved.key,
    preferRedirectAboveBytes: env.storageRedirectThresholdBytes,
  });

  if (delivery.type === 'redirect') {
    res.redirect(302, delivery.url);
    return;
  }

  const contentType =
    delivery.mimeType ?? contentTypeForFilename(contentFilename);

  streamReadableWithCache(
    req,
    res,
    delivery.stream,
    contentType,
    delivery.sizeBytes,
  );
}

async function streamAssetRecord(
  req: AuthenticatedRequest,
  res: Response,
  asset: NonNullable<Awaited<ReturnType<typeof findAssetById>>>,
): Promise<void> {
  const role = await loadCampaignRoleForUser(req.user?.id, asset.campaignId);
  const access = evaluateAssetAccess(asset, role, req.query.variant, req.user?.id);
  if (!access.ok) {
    res.status(access.status).json({ error: access.message });
    return;
  }

  const pointer = resolveAssetVariantPointer(asset, access.variant);
  if (!pointer) {
    res.status(404).json({ error: 'Asset file reference is invalid' });
    return;
  }

  const parsedKey = pointer.startsWith('s3://')
    ? (pointer.slice('s3://'.length) || pointer)
    : (pointer.split('/').pop() ?? pointer);

  try {
    await deliverStorageObject(req, res, pointer, parsedKey);
  } catch {
    res.status(404).json({ error: 'Asset file is missing in storage' });
  }
}

/**
 * Resolve a stored Asset row to its upload and stream or redirect to the client.
 * Used by imported wiki markup (`<img src="/api/assets/:id" />`).
 */
export async function getAssetById(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  if (!assetId) {
    res.status(400).json({ error: 'Asset id is required' });
    return;
  }

  const asset = await findAssetById(assetId);
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  await streamAssetRecord(req, res, asset);
}

/**
 * ACL-backed legacy URL handler for `/uploads/:filename` (replaces express.static).
 */
export async function getUploadByFilename(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const raw = String(req.params.filename ?? '');
  const filename = raw.replace(/^.*[\\/]/, '');
  if (!filename || filename === '.' || filename.includes('..')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const asset = await findAssetByStoredFilename(filename);
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  await streamAssetRecord(req, res, asset);
}
