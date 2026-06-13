import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  type EntityGraphEntityType,
  type EntityRelationKind,
  type GraphDiagnosticCheck,
} from '../../../shared/entityGraph.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import { resolveCampaignChronologyNow } from '../lib/chronologyDefaults.js';
import { queryLocalGraph, runGraphDiagnostics } from '../lib/entityGraphService.js';
import { rebuildEntityRelationsForCampaign } from '../lib/entityRelationSyncService.js';
import {
  buildRelationsProjection,
  parseProjectionWindow,
} from '../lib/relationshipProjectionService.js';
import { isElevatedWikiRole } from '../lib/wikiLinkService.js';
import type { CampaignMemberRole } from '../types/domain.js';

const ENTITY_TYPES = new Set<string>(Object.values(EntityGraphEntityTypes));
const RELATION_KINDS = new Set<string>(Object.values(EntityRelationKinds));
const DIAGNOSTIC_CHECKS = new Set<GraphDiagnosticCheck>([
  'cycles',
  'orphans',
  'unreachable',
  'dangling',
]);

function parseEntityType(raw: unknown): EntityGraphEntityType | null {
  if (typeof raw !== 'string' || !ENTITY_TYPES.has(raw)) return null;
  return raw as EntityGraphEntityType;
}

function parseKinds(raw: unknown): EntityRelationKind[] | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const kinds = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => RELATION_KINDS.has(part)) as EntityRelationKind[];
  return kinds.length > 0 ? kinds : undefined;
}

function parseChecks(raw: unknown): GraphDiagnosticCheck[] {
  if (typeof raw !== 'string' || !raw.trim()) {
    return ['cycles', 'orphans', 'dangling'];
  }
  const checks = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is GraphDiagnosticCheck =>
      DIAGNOSTIC_CHECKS.has(part as GraphDiagnosticCheck),
    );
  return checks.length > 0 ? checks : ['cycles', 'orphans', 'dangling'];
}

export async function getEntityGraph(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const entityType = parseEntityType(req.query.entityType);
  const entityId =
    typeof req.query.entityId === 'string' ? req.query.entityId.trim() : '';
  if (!entityType || !entityId) {
    res.status(400).json({ error: 'entityType and entityId are required' });
    return;
  }

  const depthRaw =
    typeof req.query.depth === 'string' ? Number.parseInt(req.query.depth, 10) : 1;
  const depth = Number.isFinite(depthRaw) ? depthRaw : 1;
  const kinds = parseKinds(req.query.kinds);
  const includeSuppressed = req.query.includeSuppressed === 'true';
  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to resolve viewer context' });
    return;
  }
  const campaignNow = await resolveCampaignChronologyNow(ctx.campaignId);

  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

  const result = await queryLocalGraph({
    campaignId: ctx.campaignId,
    campaignHandle,
    seed: { entityType, entityId },
    depth,
    kinds,
    viewerCtx,
    campaignNow,
    includeSuppressed,
  });

  res.json(result);
}

export async function getEntityGraphDiagnostics(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const checks = parseChecks(req.query.checks);
  const includeSuppressed = req.query.includeSuppressed === 'true';
  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to resolve viewer context' });
    return;
  }
  const campaignNow = await resolveCampaignChronologyNow(ctx.campaignId);

  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

  const result = await runGraphDiagnostics({
    campaignId: ctx.campaignId,
    campaignHandle,
    checks,
    viewerCtx,
    campaignNow,
    includeSuppressed,
  });

  res.json(result);
}

export async function getEntityGraphProjection(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  if (!viewerCtx) {
    res.status(500).json({ error: 'Unable to resolve viewer context' });
    return;
  }
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const window = parseProjectionWindow({
    lens: typeof req.query.lens === 'string' ? req.query.lens : undefined,
    mode: typeof req.query.mode === 'string' ? req.query.mode : undefined,
    level: typeof req.query.level === 'string' ? req.query.level : undefined,
    focus: typeof req.query.focus === 'string' ? req.query.focus : undefined,
    at: typeof req.query.at === 'string' ? req.query.at : undefined,
    includeHistorical:
      typeof req.query.includeHistorical === 'string'
        ? req.query.includeHistorical
        : undefined,
  });
  const result = await buildRelationsProjection({
    campaignId: ctx.campaignId,
    campaignHandle,
    window,
    viewerCtx,
  });
  res.json(result);
}

export async function rebuildCampaignEntityGraph(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const role = ctx.role as CampaignMemberRole | null;
  if (!isElevatedWikiRole(role)) {
    res.status(403).json({ error: 'Elevated campaign role required' });
    return;
  }

  const result = await rebuildEntityRelationsForCampaign(ctx.campaignId);
  res.json({ ok: true, ...result });
}
