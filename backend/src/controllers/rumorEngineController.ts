import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  executeRetraction,
  executeSpreadAction,
  listCirculationHistory,
  projectFactionGossip,
  projectRegionRumors,
} from '../lib/rumorEngineService.js';
import {
  normalizeAwarenessScope,
  normalizeCirculationVisibility,
  normalizeRumorStance,
} from '../../../shared/rumorEngine.js';

function paramId(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

export async function getLocationRumors(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const pageId = paramId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: 'pageId is required' });
    return;
  }
  const asOfEpoch =
    typeof req.query.asOfEpoch === 'string' ? req.query.asOfEpoch : null;
  const result = await projectRegionRumors({
    campaignId,
    anchorLocationPageId: pageId,
    role: req.campaign!.role,
    asOfEpoch,
  });
  if (!result) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }
  res.json({
    feed: result.feed,
    scope: result.scope,
    circulations: result.circulations,
  });
}

export async function getFactionGossip(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const pageId = paramId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: 'pageId is required' });
    return;
  }
  const asOfEpoch =
    typeof req.query.asOfEpoch === 'string' ? req.query.asOfEpoch : null;
  const result = await projectFactionGossip({
    campaignId,
    orgPageId: pageId,
    role: req.campaign!.role,
    asOfEpoch,
  });
  if (!result) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  res.json({
    feed: result.feed,
    scope: result.scope,
    circulations: result.circulations,
  });
}

export async function postRumorSpread(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const targets = Array.isArray(body.targets) ? body.targets : [];
  if (!targets.length) {
    res.status(400).json({ error: 'targets is required' });
    return;
  }

  try {
    const result = await executeSpreadAction({
      campaignId,
      actorUserId: req.user!.id,
      sourceClaimId:
        typeof body.sourceClaimId === 'string' ? body.sourceClaimId : undefined,
      draft:
        body.draft && typeof body.draft === 'object'
          ? (body.draft as { statement: string; subjectPageId: string; stableKey?: string })
          : undefined,
      targets: targets as Array<{
        kind: 'region' | 'faction';
        locationPageId?: string;
        orgPageId?: string;
      }>,
      stance:
        typeof body.stance === 'string'
          ? normalizeRumorStance(body.stance)
          : undefined,
      awarenessScope:
        typeof body.awarenessScope === 'string'
          ? normalizeAwarenessScope(body.awarenessScope)
          : undefined,
      visibility:
        typeof body.visibility === 'string'
          ? normalizeCirculationVisibility(body.visibility)
          : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spread failed';
    if (message === 'CLAIM_NOT_FOUND' || message === 'SUBJECT_PAGE_NOT_FOUND') {
      res.status(404).json({ error: message });
      return;
    }
    if (message === 'DRAFT_REQUIRED' || message === 'TARGETS_REQUIRED' || message === 'INVALID_TARGET') {
      res.status(400).json({ error: message });
      return;
    }
    if (message === 'NO_MASTER_CALENDAR') {
      res.status(409).json({ error: message });
      return;
    }
    throw err;
  }
}

export async function postRumorRetract(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const circulationId =
    typeof body.circulationId === 'string' ? body.circulationId.trim() : '';
  if (!circulationId) {
    res.status(400).json({ error: 'circulationId is required' });
    return;
  }

  try {
    const result = await executeRetraction({
      campaignId,
      actorUserId: req.user!.id,
      circulationId,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Retraction failed';
    if (message === 'CIRCULATION_NOT_FOUND') {
      res.status(404).json({ error: message });
      return;
    }
    throw err;
  }
}

export async function getClaimCirculations(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const claimId = paramId(req.params.claimId);
  if (!claimId) {
    res.status(400).json({ error: 'claimId is required' });
    return;
  }
  const circulations = await listCirculationHistory(campaignId, claimId);
  res.json({ circulations });
}
