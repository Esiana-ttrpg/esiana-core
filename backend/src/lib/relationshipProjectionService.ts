import type { ChronologyDateParts } from '../../../shared/chronologyTypes.js';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  type EntityGraphEdge,
  type EntityGraphNodePreview,
  type EntityRelationKind,
} from '../../../shared/entityGraph.js';
import {
  parseCampaignReputationState,
  type FactionReputationScores,
} from '../../../shared/reputationMetadata.js';
import { augmentWithInferredRelationEdges } from '../../../shared/inferredRelationEdges.js';
import { resolveRelationsRenderCaps } from '../../../shared/relationsRenderCaps.js';
import {
  RELATIONS_PROJECTION_VERSION,
  projectRelationsLens,
  type ProjectionFocus,
  type ProjectionWindow,
  type RelationsLens,
  type RelationsProjectionLevel,
  type RelationsRenderModel,
  type WikiPageSnapshot,
} from '../../../shared/relationshipLensProjections.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { buildAnalysisSnapshot } from './entityGraphService.js';
import { getOrCreateSystemSettings } from './systemSettings.js';
import { prisma } from './prisma.js';
import { ensureCampaignReputation } from './reputationSimulationService.js';

const SOCIAL_KINDS = [
  EntityRelationKinds.ORG_DIPLOMATIC,
  EntityRelationKinds.CHARACTER_AFFILIATION,
  EntityRelationKinds.CHARACTER_SOCIAL,
  EntityRelationKinds.CHARACTER_LINEAGE,
  EntityRelationKinds.ORG_LEADER,
  EntityRelationKinds.ORG_PARENT,
] as const;

const STRUCTURE_KINDS = [
  EntityRelationKinds.ORG_PARENT,
  EntityRelationKinds.ORG_LEADER,
  EntityRelationKinds.CHARACTER_AFFILIATION,
  EntityRelationKinds.PAGE_PARENT,
] as const;

const KINSHIP_KINDS = [EntityRelationKinds.CHARACTER_LINEAGE] as const;

function lensDefaultKinds(lens: RelationsLens): readonly EntityRelationKind[] {
  if (lens === 'structure') return [...STRUCTURE_KINDS];
  if (lens === 'kinship') return [...KINSHIP_KINDS];
  return [...SOCIAL_KINDS];
}

export function parseProjectionFocus(raw: string | undefined): ProjectionFocus {
  const text = (raw ?? 'party').trim();
  if (text === 'party') return { kind: 'party' };
  if (text.startsWith('bloc:')) {
    return { kind: 'bloc', blocId: text.slice('bloc:'.length) };
  }
  if (text.startsWith('wiki_page:')) {
    const entityId = text.slice('wiki_page:'.length);
    return { kind: 'wiki_page', entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId };
  }
  return { kind: 'party' };
}

export function parseProjectionWindow(query: {
  lens?: string;
  mode?: string;
  level?: string;
  focus?: string;
  at?: string;
  includeHistorical?: string;
}): ProjectionWindow {
  const lens =
    query.lens === 'structure' || query.lens === 'kinship' ? query.lens : 'social';
  const level: RelationsProjectionLevel =
    query.level === 'cluster' || query.level === 'entity' ? query.level : 'summary';
  const at: ChronologyDateParts | 'current' =
    query.at && query.at !== 'current' ? parseAtDate(query.at) : 'current';
  return {
    lens,
    mode: query.mode?.trim() || (lens === 'social' ? 'blocs' : 'chain'),
    level,
    focus: parseProjectionFocus(query.focus),
    at,
    includeHistorical: query.includeHistorical === 'true',
  };
}

function parseAtDate(raw: string): ChronologyDateParts | 'current' {
  const parts = raw.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length >= 1 && Number.isFinite(parts[0])) {
    return {
      year: parts[0]!,
      month: Number.isFinite(parts[1]) ? parts[1]! : 1,
      day: Number.isFinite(parts[2]) ? parts[2]! : 1,
    };
  }
  return 'current';
}

async function loadReputationMap(
  campaignId: string,
): Promise<Record<string, FactionReputationScores>> {
  const reputation = await ensureCampaignReputation(campaignId);
  const state = parseCampaignReputationState(reputation.simulationState);
  return state.factions;
}

async function loadOrgPages(campaignId: string): Promise<WikiPageSnapshot[]> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, templateType: 'ORGANIZATION' },
    select: { id: true, title: true, templateType: true, metadata: true },
    orderBy: { title: 'asc' },
  });
  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata,
  }));
}

function previewsFromSnapshot(
  edges: EntityGraphEdge[],
  hydrated: Map<string, EntityGraphNodePreview>,
): Map<string, EntityGraphNodePreview> {
  return hydrated;
}

export async function buildRelationsProjection(input: {
  campaignId: string;
  campaignHandle: string;
  window: ProjectionWindow;
  viewerCtx: NarrativeViewerContext;
  campaignNow?: ChronologyDateParts;
}): Promise<RelationsRenderModel & { projectionVersion: string }> {
  const settings = await getOrCreateSystemSettings();
  const caps = resolveRelationsRenderCaps({
    relationsMaxVisibleNodes: settings.relationsMaxVisibleNodes,
    relationsMaxVisibleEdges: settings.relationsMaxVisibleEdges,
  });
  const campaignNow =
    input.campaignNow ?? (await resolveCampaignChronologyNow(input.campaignId));
  const atDate = input.window.at === 'current' ? campaignNow : input.window.at;

  const kinds = lensDefaultKinds(input.window.lens);
  const snapshot = await buildAnalysisSnapshot({
    campaignId: input.campaignId,
    kinds,
    viewerCtx: input.viewerCtx,
    campaignNow: atDate,
    includeSuppressed: false,
  });

  const nodeRefs = new Set<string>();
  for (const edge of snapshot.edges) {
    nodeRefs.add(`${edge.source.entityType}:${edge.source.entityId}`);
    nodeRefs.add(`${edge.target.entityType}:${edge.target.entityId}`);
  }
  const { hydrateNodePreviews } = await import('./entityGraphService.js');
  const refs = [...nodeRefs].map((key) => {
    const idx = key.indexOf(':');
    return {
      entityType: key.slice(0, idx) as EntityGraphEdge['source']['entityType'],
      entityId: key.slice(idx + 1),
    };
  });
  const previews = await hydrateNodePreviews(
    input.campaignId,
    input.campaignHandle,
    refs,
    { viewerCtx: input.viewerCtx },
  );

  const [orgPages, reputationByFaction] = await Promise.all([
    loadOrgPages(input.campaignId),
    loadReputationMap(input.campaignId),
  ]);

  const edges =
    input.window.lens === 'social'
      ? augmentWithInferredRelationEdges(snapshot.edges)
      : snapshot.edges;

  const model = projectRelationsLens({
    window: { ...input.window, at: input.window.at === 'current' ? 'current' : atDate },
    caps,
    edges,
    nodePreviews: previewsFromSnapshot(snapshot.edges, previews),
    orgPages,
    reputationByFaction,
  });

  return { ...model, projectionVersion: RELATIONS_PROJECTION_VERSION };
}
