import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageChronology } from '../lib/acl.js';
import { parseDowntimeGapOverlay } from '../../../shared/downtimeAnnotations.js';
import { upsertDowntimeGapOverlay } from '../lib/downtimeGapOverlays.js';

export async function putDowntimeGapOverlay(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (
    !canManageChronology(ctx.role, ctx.allowPlayerChronologyManagement)
  ) {
    res.status(403).json({ error: 'Chronology management required' });
    return;
  }

  const gapId = decodeURIComponent(String(req.params.gapId ?? '')).trim();
  if (!gapId) {
    res.status(400).json({ error: 'gapId required' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const overlay = parseDowntimeGapOverlay({ ...body, gapId });
  if (!overlay) {
    res.status(400).json({ error: 'Invalid downtime gap overlay payload' });
    return;
  }

  const saved = await upsertDowntimeGapOverlay(ctx.campaignId, overlay);
  res.json({ overlay: saved });
}
