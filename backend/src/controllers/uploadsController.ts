import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  deleteAssetRecordFiles,
  deleteUploadedFileSafe,
} from '../lib/assetFiles.js';
import { resolvePinsAfterTargetAssetDelete } from '../lib/mapPinMaintenance.js';
import { AssetTypes, type AssetType } from '../types/domain.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { env } from '../config/env.js';
import {
  logUploadAttempt,
  UploadValidationError,
} from '../lib/uploadValidation.js';
import { importFromUpload, importFromUrl, mapImportError, UrlImportError } from '../lib/assetImport.js';
import { isActiveStorageUnavailableError, storageUnavailableStatusPayload } from '../lib/storageUploadErrors.js';
import { canModifyCampaign } from '../lib/acl.js';
import { IMPORT_STAGING_ASSET_TYPES } from '../lib/importStagingRetention.js';

export async function uploadCampaignImage(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const type = (req.body?.type as string) ?? AssetTypes.GENERIC;
  const uploadedByUserId = req.user?.id ?? null;

  if (!Object.values(AssetTypes).includes(type as AssetType)) {
    if (req.file?.filename) {
      await deleteUploadedFileSafe(req.file.filename);
    }
    res.status(400).json({ error: 'Invalid asset type' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }

  const tempFilename = req.file.filename;

  try {
    const result = await importFromUpload({
      campaignId,
      file: req.file,
      type: type as AssetType,
      uploadedByUserId,
    });

    logUploadAttempt({
      endpoint: 'campaign-upload',
      campaignId,
      originalName: req.file.originalname,
      bytes: req.file.size,
      outcome: 'ok',
    });

    res.status(201).json({
      asset: result.asset,
      referenceUrl: result.referenceUrl,
    });
  } catch (err) {
    if (isActiveStorageUnavailableError(err)) {
      const payload = storageUnavailableStatusPayload(err);
      res.status(payload.status).json(payload.body);
      return;
    }
    if (err instanceof UploadValidationError) {
      logUploadAttempt({
        endpoint: 'campaign-upload',
        campaignId,
        originalName: req.file?.originalname,
        bytes: req.file?.size,
        outcome: 'rejected',
        reason: err.message,
      });
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[uploads] Campaign image upload failed', err);
    res.status(500).json({
      error: mapImportError(err),
    });
  } finally {
    if (tempFilename) {
      await deleteUploadedFileSafe(tempFilename);
    }
  }
}

export async function importCampaignImageFromUrl(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const typeRaw = typeof req.body?.type === 'string' ? req.body.type : AssetTypes.GENERIC;
  const uploadedByUserId = req.user?.id ?? null;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  if (!Object.values(AssetTypes).includes(typeRaw as AssetType)) {
    res.status(400).json({ error: 'Invalid asset type' });
    return;
  }

  try {
    const result = await importFromUrl({
      campaignId,
      url,
      type: typeRaw as AssetType,
      uploadedByUserId,
    });

    res.status(201).json({
      asset: result.asset,
      referenceUrl: result.referenceUrl,
    });
  } catch (err) {
    if (isActiveStorageUnavailableError(err)) {
      const payload = storageUnavailableStatusPayload(err);
      res.status(payload.status).json(payload.body);
      return;
    }
    if (err instanceof UploadValidationError || err instanceof UrlImportError) {
      res.status(400).json({ error: mapImportError(err) });
      return;
    }
    console.error('[uploads] URL import failed', err);
    res.status(500).json({ error: mapImportError(err) });
  }
}

export async function listCampaignAssets(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
  const canViewStaging = Boolean(
    req.campaign?.actor && canModifyCampaign(req.campaign.actor),
  );

  const assets = await prisma.asset.findMany({
    where: {
      campaignId: req.campaign!.campaignId,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(!canViewStaging
        ? { NOT: { type: { in: [...IMPORT_STAGING_ASSET_TYPES] } } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ assets });
}

export async function deleteCampaignAsset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId);
  const campaignId = req.campaign!.campaignId;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, campaignId },
  });

  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  await resolvePinsAfterTargetAssetDelete(assetId);
  await prisma.wikiPage.updateMany({
    where: { mapAssetId: assetId, campaignId },
    data: { mapAssetId: null },
  });

  deleteAssetRecordFiles(asset);
  await prisma.asset.delete({ where: { id: assetId } });

  res.json({ ok: true });
}
