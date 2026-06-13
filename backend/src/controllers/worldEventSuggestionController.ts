import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { normalizeWorldEventNarrative } from '../../../shared/worldEventSuggestionMetadata.js';
import {
  acceptWorldEventSuggestion,
  canManageWorldEventSuggestions,
  dismissWorldEventSuggestion,
  listPendingWorldEventSuggestions,
} from '../lib/worldEventSuggestionService.js';

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

export async function listWorldEventSuggestionsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  try {
    const suggestions = await listPendingWorldEventSuggestions(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
    );
    res.json({ suggestions });
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function acceptWorldEventSuggestionHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!canManageWorldEventSuggestions(ctx.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title : undefined;
  const narrative =
    typeof body.narrative === 'string' ? normalizeWorldEventNarrative(body.narrative) : undefined;

  try {
    const result = await acceptWorldEventSuggestion({
      suggestionId: String(req.params.id),
      campaignId: ctx.campaignId,
      campaignHandle: campaignHandleFromRequest(req),
      role: ctx.role,
      userId: req.user.id,
      title,
      narrative,
    });
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
}

export async function dismissWorldEventSuggestionHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const suggestion = await dismissWorldEventSuggestion(
      ctx.campaignId,
      campaignHandleFromRequest(req),
      ctx.role,
      req.user.id,
      String(req.params.id),
    );
    res.json({ suggestion });
  } catch (err) {
    handleServiceError(res, err);
  }
}
