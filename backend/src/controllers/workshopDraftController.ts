import type { Response } from 'express';
import type { AuthoringContextKind } from '../../../shared/authoringContext.js';
import { AUTHORING_CONTEXT_KINDS } from '../../../shared/authoringContext.js';
import {
  WORKSHOP_FORMALIZE_TARGETS,
  type WorkshopFormalizeTarget,
} from '../../../shared/workshopDocument.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  createWorkshopDraft,
  formalizeWorkshopDraft,
  getWorkshopDraft,
  listWorkshopDrafts,
  patchWorkshopDraft,
} from '../lib/workshopDraftService.js';

function parseAuthoringKind(value: unknown): AuthoringContextKind | undefined {
  if (typeof value !== 'string') return undefined;
  return (AUTHORING_CONTEXT_KINDS as readonly string[]).includes(value)
    ? (value as AuthoringContextKind)
    : undefined;
}

export async function listWorkshopDraftsHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const statusParam = req.query.status;
  const status =
    statusParam === 'formalized' || statusParam === 'discarded' ? statusParam : 'active';
  const anchorEntityId =
    typeof req.query.anchor === 'string' ? req.query.anchor.trim() : undefined;
  const limit = Number(req.query.limit) || 50;

  const drafts = await listWorkshopDrafts({
    campaignId: req.campaign!.campaignId,
    authorUserId: userId,
    status,
    anchorEntityId,
    limit,
  });

  res.json({ drafts });
}

export async function getWorkshopDraftHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const draft = await getWorkshopDraft({
    campaignId: req.campaign!.campaignId,
    draftId: String(req.params.draftId),
    authorUserId: userId,
  });

  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }

  res.json({ draft });
}

export async function createWorkshopDraftHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const anchorEntityIds = Array.isArray(body.anchorEntityIds)
    ? body.anchorEntityIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    : typeof body.anchorEntityIds === 'string'
      ? body.anchorEntityIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

  try {
    const draft = await createWorkshopDraft({
      campaignId: req.campaign!.campaignId,
      authorUserId: userId,
      title: typeof body.title === 'string' ? body.title : undefined,
      bodyMarkdown: typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown : undefined,
      anchorEntityIds,
      sourceKind: parseAuthoringKind(body.sourceKind),
    });
    res.status(201).json({ draft });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create draft',
    });
  }
}

export async function patchWorkshopDraftHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const draft = await patchWorkshopDraft({
    campaignId: req.campaign!.campaignId,
    draftId: String(req.params.draftId),
    authorUserId: userId,
    title: typeof body.title === 'string' ? body.title : undefined,
    bodyMarkdown: typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown : undefined,
  });

  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }

  res.json({ draft });
}

export async function formalizeWorkshopDraftHandler(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const target = body.target;
  if (
    typeof target !== 'string' ||
    !(WORKSHOP_FORMALIZE_TARGETS as readonly string[]).includes(target)
  ) {
    res.status(400).json({ error: 'Invalid formalize target.' });
    return;
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'title is required.' });
    return;
  }

  try {
    const result = await formalizeWorkshopDraft({
      campaignId: req.campaign!.campaignId,
      draftId: String(req.params.draftId),
      authorUserId: userId,
      target: target as WorkshopFormalizeTarget,
      title,
      summary: typeof body.summary === 'string' ? body.summary : null,
      loreParentId:
        body.loreParentId === null || typeof body.loreParentId === 'string'
          ? (body.loreParentId as string | null)
          : undefined,
      linkedQuestPageId:
        body.linkedQuestPageId === null || typeof body.linkedQuestPageId === 'string'
          ? (body.linkedQuestPageId as string | null)
          : undefined,
    });

    if (!result) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Failed to formalize draft',
    });
  }
}
