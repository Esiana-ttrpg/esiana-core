import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  buildCreativeDriftScan,
  parseDispositionPatch,
  saveCreativeDriftDisposition,
} from '../lib/creativeDriftService.js';
import type { CreativeDriftDisposition } from '../../../shared/creativeDrift.js';

export async function getCreativeDrift(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const role = req.campaign!.role;
  const result = await buildCreativeDriftScan(campaignId, role);
  if (!result) {
    res.status(403).json({
      error: 'Forbidden: gamemaster or writer role required',
    });
    return;
  }
  res.json(result);
}

export async function patchCreativeDriftDisposition(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const role = req.campaign!.role;
  const parsed = parseDispositionPatch(req.body);
  if (!parsed) {
    res.status(400).json({
      error:
        'Invalid payload. Expected { fingerprint, disposition, snoozeUntil?, note? }.',
    });
    return;
  }

  const scan = await buildCreativeDriftScan(campaignId, role);
  if (!scan) {
    res.status(403).json({
      error: 'Forbidden: gamemaster or writer role required',
    });
    return;
  }

  const disposition: CreativeDriftDisposition = {
    kind: parsed.kind,
    notedAt: new Date().toISOString(),
    snoozeUntil: parsed.snoozeUntil ?? null,
    note: parsed.note ?? null,
    byUserId: req.user?.id ?? null,
  };

  const dispositions = await saveCreativeDriftDisposition(
    campaignId,
    parsed.fingerprint,
    disposition,
  );

  res.json({ fingerprint: parsed.fingerprint, disposition, dispositions });
}
