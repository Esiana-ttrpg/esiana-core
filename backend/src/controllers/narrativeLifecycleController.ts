import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  NarrativeLifecycleSubjectKinds,
  normalizeNarrativeLifecycleState,
} from '../../../shared/narrativeLifecycle.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import {
  getLifecycleStates,
  rebuildNarrativeLifecycleForCampaign,
  transitionLifecycle,
  NarrativeLifecycleTransitionError,
} from '../lib/narrativeLifecycleService.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import type { CampaignMemberRole } from '../types/domain.js';

import { canManageNotebooksFromActor } from '../lib/acl.js';

export async function listNarrativeLifecycleStates(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const subjectKindRaw =
    typeof req.query.subjectKind === 'string'
      ? req.query.subjectKind.trim()
      : NarrativeLifecycleSubjectKinds.QUEST;

  if (
    subjectKindRaw !== NarrativeLifecycleSubjectKinds.QUEST &&
    subjectKindRaw !== NarrativeLifecycleSubjectKinds.OPEN_THREAD &&
    subjectKindRaw !== NarrativeLifecycleSubjectKinds.SCENE
  ) {
    res.status(400).json({ error: 'Invalid subjectKind' });
    return;
  }

  const subjectIdsRaw =
    typeof req.query.subjectIds === 'string' ? req.query.subjectIds : '';
  const subjectIds = subjectIdsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (subjectIds.length === 0) {
    res.status(400).json({ error: 'subjectIds is required' });
    return;
  }

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to resolve viewer context' });
    return;
  }

  const states = await getLifecycleStates(
    ctx.campaignId,
    subjectKindRaw,
    subjectIds,
  );

  const items = subjectIds.map((subjectId) => {
    const canonical = states.get(subjectId) ?? null;
    if (!canonical) {
      return { subjectId, lifecycleState: null, visible: null };
    }
    if (viewerCtx.perspective === 'elevated') {
      return { subjectId, lifecycleState: canonical, visible: canonical };
    }
    if (canonical === 'LOCKED') {
      return { subjectId, lifecycleState: null, visible: null };
    }
    return { subjectId, lifecycleState: canonical, visible: canonical };
  });

  res.json({
    subjectKind: subjectKindRaw,
    semanticsVersion: 'narrative-lifecycle-v1',
    items,
  });
}

export async function patchNarrativeLifecycleState(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const subjectKind =
    typeof req.params.subjectKind === 'string'
      ? req.params.subjectKind.trim()
      : '';
  const subjectId =
    typeof req.params.subjectId === 'string' ? req.params.subjectId.trim() : '';

  if (
    subjectKind !== NarrativeLifecycleSubjectKinds.QUEST &&
    subjectKind !== NarrativeLifecycleSubjectKinds.OPEN_THREAD &&
    subjectKind !== NarrativeLifecycleSubjectKinds.SCENE
  ) {
    res.status(400).json({ error: 'Invalid subjectKind' });
    return;
  }
  if (!subjectId) {
    res.status(400).json({ error: 'subjectId is required' });
    return;
  }

  const body = req.body as { lifecycleState?: unknown; entityName?: unknown };
  const toState = normalizeNarrativeLifecycleState(body.lifecycleState);
  if (!toState) {
    res.status(400).json({ error: 'lifecycleState is required' });
    return;
  }

  const canManage = canManageNotebooksFromActor(ctx.actor);
  if (!canManage) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await transitionLifecycle({
      campaignId: ctx.campaignId,
      subjectKind,
      subjectId,
      toState,
      actorUserId: userId,
      canManage,
      entityName:
        typeof body.entityName === 'string' ? body.entityName : undefined,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof NarrativeLifecycleTransitionError) {
      res.status(409).json({
        error: err.message,
        code: err.code,
        fromState: err.fromState,
        toState: err.toState,
        allowedTargets: err.allowedTargets,
      });
      return;
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    throw err;
  }
}

export async function rebuildNarrativeLifecycle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await rebuildNarrativeLifecycleForCampaign(ctx.campaignId);
  res.json(result);
}
