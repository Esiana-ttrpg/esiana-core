import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  normalizeDevelopmentAcceptTarget,
  parseWorldDevelopmentSettings,
} from '../../../shared/worldDevelopmentMetadata.js';
import {
  normalizeWorldEventNarrative,
  type WorldEventSuggestionTerminalStatus,
} from '../../../shared/worldEventSuggestionMetadata.js';
import {
  buildPendingDevelopmentsPresentation,
  listDevelopmentHistory,
} from '../lib/worldDevelopmentService.js';
import {
  getWorldDevelopmentSettingsPayload,
  saveWorldDevelopmentSettings,
} from '../lib/worldDevelopmentSettingsService.js';
import {
  resolveWorldDevelopmentSuggestion,
  requeueArchivedSuggestion,
  canResolveWorldDevelopment,
} from '../lib/worldDevelopmentResolveService.js';
import { generateOnDemandWorldDevelopments } from '../lib/worldDevelopmentEngine.js';
import {
  acceptReputationSuggestion,
  dismissReputationSuggestion,
} from '../lib/reputationSuggestionService.js';

function campaignHandleFromRequest(req: CampaignScopedRequest): string {
  const ctx = req.campaign!;
  return ctx.campaignHandle ?? ctx.campaignId;
}

function handleServiceError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Request failed';
  if (message === 'Forbidden') {
    res.status(403).json({ error: message });
    return;
  }
  if (message === 'Suggestion not found.') {
    res.status(404).json({ error: message });
    return;
  }
  if (message === 'Suggestion is no longer pending.') {
    res.status(409).json({ error: message });
    return;
  }
  res.status(400).json({ error: message });
}

export async function getWorldDevelopmentSettingsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  try {
    const payload = await getWorldDevelopmentSettingsPayload(req.campaign!.campaignId);
    res.json(payload);
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function putWorldDevelopmentSettingsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canResolveWorldDevelopment(req.campaign!.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const settingsInput = body.settings ?? body;
  const parsed = parseWorldDevelopmentSettings(settingsInput);

  try {
    const settings = await saveWorldDevelopmentSettings(
      req.campaign!.campaignId,
      req.user.id,
      parsed,
    );
    res.json({ settings });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function listPendingDevelopmentsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  try {
    const presentation = await buildPendingDevelopmentsPresentation(
      req.campaign!.campaignId,
      campaignHandleFromRequest(req),
      req.campaign!.role,
    );
    res.json(presentation);
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function listDevelopmentHistoryHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
  const statuses = statusParam
    ? (statusParam.split(',').map((s) => s.trim()) as WorldEventSuggestionTerminalStatus[])
    : undefined;

  try {
    const rows = await listDevelopmentHistory(
      req.campaign!.campaignId,
      campaignHandleFromRequest(req),
      {
        status: statuses,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      },
    );
    res.json({ history: rows });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function resolveDevelopmentSuggestionHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const action = body.action === 'dismiss' ? 'dismiss' : 'accept';
  const source = body.source === 'reputation' ? 'reputation' : 'world_event';

  try {
    if (source === 'reputation') {
      if (action === 'dismiss') {
        const suggestion = await dismissReputationSuggestion(
          req.campaign!.campaignId,
          campaignHandleFromRequest(req),
          req.campaign!.role,
          req.user.id,
          String(req.params.id),
        );
        res.json({ suggestion, source: 'reputation' });
        return;
      }
      const narrative =
        typeof body.narrative === 'string'
          ? normalizeWorldEventNarrative(body.narrative)
          : undefined;
      const result = await acceptReputationSuggestion({
        suggestionId: String(req.params.id),
        campaignId: req.campaign!.campaignId,
        campaignHandle: campaignHandleFromRequest(req),
        role: req.campaign!.role,
        userId: req.user.id,
        narrative,
      });
      res.json({ ...result, source: 'reputation' });
      return;
    }

    const result = await resolveWorldDevelopmentSuggestion({
      suggestionId: String(req.params.id),
      campaignId: req.campaign!.campaignId,
      campaignHandle: campaignHandleFromRequest(req),
      role: req.campaign!.role,
      userId: req.user.id,
      action,
      acceptTarget: normalizeDevelopmentAcceptTarget(body.acceptTarget),
      title: typeof body.title === 'string' ? body.title : undefined,
      narrative:
        typeof body.narrative === 'string'
          ? normalizeWorldEventNarrative(body.narrative)
          : undefined,
    });
    res.json({ ...result, source: 'world_event' });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function suggestOnDemandDevelopmentsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canResolveWorldDevelopment(req.campaign!.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const result = await generateOnDemandWorldDevelopments(
      req.campaign!.campaignId,
      campaignHandleFromRequest(req),
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function requeueArchivedDevelopmentHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    await requeueArchivedSuggestion(
      req.campaign!.campaignId,
      req.campaign!.role,
      req.user.id,
      String(req.params.id),
    );
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(res, err);
  }
}
