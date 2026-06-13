import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildEnsembleBundle } from '../lib/buildEnsembleBundle.js';
import {
  normalizeEnsembleConfig,
  parseEnsembleConfigPayload,
} from '../lib/ensembleConfig.js';
import {
  respondAssetReferenceValidationError,
  validateEnsembleBannerImageSave,
} from '../lib/assetReferenceValidation.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';

export async function getEnsembleBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const bundle = await buildEnsembleBundle(campaignId, req.campaign!.role);

  if (!bundle) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  res.json(bundle);
}

export async function updateEnsembleConfig(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const parsed = parseEnsembleConfigPayload(req.body);
  if (!parsed) {
    res.status(400).json({ error: 'Invalid ensemble configuration payload' });
    return;
  }

  try {
    validateEnsembleBannerImageSave(req.body);
  } catch (err) {
    if (respondAssetReferenceValidationError(res, err)) return;
    throw err;
  }

  const campaignId = req.campaign!.campaignId;
  const normalized = normalizeEnsembleConfig(parsed);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { ensembleConfig: normalized as never },
  });

  res.json({ config: normalized });
}
