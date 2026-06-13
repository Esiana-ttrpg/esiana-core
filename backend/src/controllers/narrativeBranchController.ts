import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  evaluateBranchTransitions,
  getBranchState,
  saveBranchGraph,
  setActiveBranchNode,
  NarrativeBranchValidationError,
} from '../lib/narrativeBranchService.js';
import {
  assertValidBranchGraph,
  parseNarrativeBranchGraph,
} from '../../../shared/narrativeBranch.js';
import { executeConsequencesForBranchNode } from '../lib/narrativeConsequenceService.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { randomUUID } from 'node:crypto';

import { canManageNotebooksFromActor } from '../lib/acl.js';

export async function getNarrativeBranch(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const subjectId = String(req.params.subjectId);
  const state = await getBranchState(ctx.campaignId, subjectId);
  const transitions = await evaluateBranchTransitions(ctx.campaignId, subjectId);
  res.json({ ...state, allowedNext: transitions.allowed });
}

export async function patchNarrativeBranch(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const subjectId = String(req.params.subjectId);
  const body = req.body as { graph?: unknown; activeNodeId?: string };

  try {
    if (body.graph !== undefined) {
      const graph = parseNarrativeBranchGraph(body.graph);
      if (!graph) {
        res.status(400).json({ error: 'Invalid branch graph' });
        return;
      }
      assertValidBranchGraph(graph);
      await saveBranchGraph(ctx.campaignId, subjectId, graph);
    }
    if (typeof body.activeNodeId === 'string' && body.activeNodeId.trim()) {
      await setActiveBranchNode(ctx.campaignId, subjectId, body.activeNodeId.trim());
      const actorUserId = req.user?.id;
      if (actorUserId) {
        await executeConsequencesForBranchNode({
          campaignId: ctx.campaignId,
          subjectId,
          branchNodeId: body.activeNodeId.trim(),
          transitionId: randomUUID(),
          actorUserId,
          canManage: true,
        });
      }
    }
    const state = await getBranchState(ctx.campaignId, subjectId);
    res.json(state);
  } catch (err) {
    if (err instanceof NarrativeBranchValidationError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
}
