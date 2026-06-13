import type { Prisma } from '@prisma/client';
import type { ChronologyDateParts } from '../../../shared/chronologyTypes.js';
import {
  EDGE_TAXONOMY_VERSION,
  EntityGraphEntityTypes,
  EntityRelationKinds,
  GRAPH_SEMANTICS_VERSION,
  parseEntityRelationPayload,
  type EntityGraphEdge,
  type EntityGraphNodePreview,
  type EntityGraphNodeRef,
  type EntityRelationKind,
  type GraphAnalysisSnapshot,
  type GraphDiagnosticCheck,
  type GraphDiagnosticsResult,
  type LocalGraphQueryResult,
  nodeRefKey,
} from '../../../shared/entityGraph.js';
import {
  attachAdjacency,
  findCycles,
  uniqueNodeRefsFromEdges,
} from '../../../shared/entityGraphQuery.js';
import { isEntityGraphStructurallyIsolated } from '../../../shared/narrativeOrphanAnalysis.js';
import {
  isEntityRelationVisible,
  projectEntityRelation,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import { dateSortKey } from './entityRelationTypes.js';
import { prisma } from './prisma.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import { buildPageNarrativeStatusProjectionMap } from './pageNarrativeStatusService.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { diagnoseEntityRelationIntegrity } from './entityRelationSyncService.js';

type EntityRelationRow = {
  id: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationKind: string;
  direction: string;
  startDate: unknown;
  endDate: unknown;
  visibility: string | null;
  payload: unknown;
  sourceDomain: string;
  sourceRecordKey: string;
  sourcePageId: string | null;
};

export function rowToEdge(row: EntityRelationRow): EntityGraphEdge {
  return {
    id: row.id,
    source: {
      entityType: row.sourceEntityType as EntityGraphEdge['source']['entityType'],
      entityId: row.sourceEntityId,
    },
    target: {
      entityType: row.targetEntityType as EntityGraphEdge['target']['entityType'],
      entityId: row.targetEntityId,
    },
    relationKind: row.relationKind as EntityRelationKind,
    direction: row.direction as EntityGraphEdge['direction'],
    startDate: (row.startDate as ChronologyDateParts | null) ?? null,
    endDate: (row.endDate as ChronologyDateParts | null) ?? null,
    visibility: row.visibility,
    payload: parseEntityRelationPayload(row.payload),
    sourceDomain: row.sourceDomain as EntityGraphEdge['sourceDomain'],
    sourceRecordKey: row.sourceRecordKey,
    sourcePageId: row.sourcePageId,
  };
}

function edgeActiveAtDate(edge: EntityGraphEdge, date: ChronologyDateParts): boolean {
  const key = dateSortKey(date);
  if (edge.startDate && dateSortKey(edge.startDate) > key) return false;
  if (edge.endDate && dateSortKey(edge.endDate) < key) return false;
  return true;
}

function projectEdge(
  edge: EntityGraphEdge,
  ctx: NarrativeViewerContext,
  campaignNow: ChronologyDateParts,
): EntityGraphEdge {
  const visible =
    isEntityRelationVisible(projectEntityRelation(edge.visibility, ctx)) &&
    edgeActiveAtDate(edge, campaignNow);
  return { ...edge, visible };
}

export async function hydrateNodePreviews(
  campaignId: string,
  campaignHandle: string,
  refs: readonly EntityGraphNodeRef[],
  options?: { viewerCtx?: NarrativeViewerContext },
): Promise<Map<string, EntityGraphNodePreview>> {
  const byType = new Map<string, Set<string>>();
  for (const ref of refs) {
    const set = byType.get(ref.entityType) ?? new Set<string>();
    set.add(ref.entityId);
    byType.set(ref.entityType, set);
  }

  const previews = new Map<string, EntityGraphNodePreview>();

  const wikiIds = [...(byType.get(EntityGraphEntityTypes.WIKI_PAGE) ?? [])];
  let narrativeStatusMap = new Map<
    string,
    import('../../../shared/pageNarrativeStatus.js').PageNarrativeStatusProjection
  >();
  if (wikiIds.length > 0) {
    const pages = await prisma.wikiPage.findMany({
      where: { campaignId, id: { in: wikiIds }, deletedAt: null },
      select: {
        id: true,
        title: true,
        parentId: true,
        templateType: true,
        workspace: true,
        pathKey: true,
        metadata: true,
      },
    });
    if (options?.viewerCtx) {
      narrativeStatusMap = await buildPageNarrativeStatusProjectionMap({
        campaignId,
        pageIds: wikiIds,
        ctx: options.viewerCtx,
        pages,
      });
    }
    for (const page of pages) {
      previews.set(nodeRefKey({ entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: page.id }), {
        entityType: EntityGraphEntityTypes.WIKI_PAGE,
        entityId: page.id,
        title: page.title,
        codexType: resolveWikiCodexType(page),
        href: buildWikiPageHref(campaignHandle, page),
        narrativeStatus: narrativeStatusMap.get(page.id),
      });
    }
  }

  const eventIds = [...(byType.get(EntityGraphEntityTypes.CALENDAR_EVENT) ?? [])];
  if (eventIds.length > 0) {
    const events = await prisma.calendarEvent.findMany({
      where: { id: { in: eventIds }, calendar: { campaignId } },
      select: { id: true, title: true },
    });
    for (const event of events) {
      previews.set(
        nodeRefKey({ entityType: EntityGraphEntityTypes.CALENDAR_EVENT, entityId: event.id }),
        {
          entityType: EntityGraphEntityTypes.CALENDAR_EVENT,
          entityId: event.id,
          title: event.title,
          codexType: 'CALENDAR_EVENT',
          href: null,
        },
      );
    }
  }

  const pinIds = [...(byType.get(EntityGraphEntityTypes.MAP_PIN) ?? [])];
  if (pinIds.length > 0) {
    const pins = await prisma.mapPin.findMany({
      where: { id: { in: pinIds }, asset: { campaignId } },
      select: { id: true, label: true, pinType: true },
    });
    for (const pin of pins) {
      previews.set(nodeRefKey({ entityType: EntityGraphEntityTypes.MAP_PIN, entityId: pin.id }), {
        entityType: EntityGraphEntityTypes.MAP_PIN,
        entityId: pin.id,
        title: pin.label?.trim() || pin.pinType || 'Map pin',
        codexType: 'MAP_PIN',
        href: null,
      });
    }
  }

  for (const ref of refs) {
    const key = nodeRefKey(ref);
    if (!previews.has(key)) {
      previews.set(key, {
        entityType: ref.entityType,
        entityId: ref.entityId,
        title: ref.entityId,
        codexType: null,
        href: null,
      });
    }
  }

  return previews;
}

async function loadEdgesForNode(
  campaignId: string,
  node: EntityGraphNodeRef,
  kinds?: readonly EntityRelationKind[],
): Promise<EntityRelationRow[]> {
  const kindFilter =
    kinds && kinds.length > 0 ? { relationKind: { in: [...kinds] } } : {};
  const [outbound, inbound] = await Promise.all([
    prisma.entityRelation.findMany({
      where: {
        campaignId,
        sourceEntityType: node.entityType,
        sourceEntityId: node.entityId,
        ...kindFilter,
      },
    }),
    prisma.entityRelation.findMany({
      where: {
        campaignId,
        targetEntityType: node.entityType,
        targetEntityId: node.entityId,
        ...kindFilter,
      },
    }),
  ]);
  const byId = new Map<string, EntityRelationRow>();
  for (const row of [...outbound, ...inbound]) byId.set(row.id, row);
  return [...byId.values()];
}

export type LocalGraphQueryInput = {
  campaignId: string;
  campaignHandle: string;
  seed: EntityGraphNodeRef;
  depth?: number;
  kinds?: readonly EntityRelationKind[];
  viewerCtx: NarrativeViewerContext;
  campaignNow: ChronologyDateParts;
  includeSuppressed?: boolean;
};

export async function queryLocalGraph(input: LocalGraphQueryInput): Promise<LocalGraphQueryResult> {
  const depth = Math.min(Math.max(input.depth ?? 1, 1), 2);
  const seenEdgeIds = new Set<string>();
  const edgeRows: EntityRelationRow[] = [];
  const frontier: Array<{ node: EntityGraphNodeRef; depth: number }> = [
    { node: input.seed, depth: 0 },
  ];
  const visited = new Set<string>([nodeRefKey(input.seed)]);

  while (frontier.length > 0) {
    const current = frontier.shift()!;
    const rows = await loadEdgesForNode(input.campaignId, current.node, input.kinds);
    for (const row of rows) {
      if (seenEdgeIds.has(row.id)) continue;
      seenEdgeIds.add(row.id);
      edgeRows.push(row);
      if (current.depth >= depth) continue;

      const edge = rowToEdge(row);
      const other =
        nodeRefKey(edge.source) === nodeRefKey(current.node) ? edge.target : edge.source;
      const otherKey = nodeRefKey(other);
      if (!visited.has(otherKey)) {
        visited.add(otherKey);
        frontier.push({ node: other, depth: current.depth + 1 });
      }
    }
  }

  let edges = edgeRows.map(rowToEdge).map((edge) =>
    projectEdge(edge, input.viewerCtx, input.campaignNow),
  );
  if (!input.includeSuppressed) {
    edges = edges.filter((edge) => edge.visible !== false);
  }

  const nodeRefs = uniqueNodeRefsFromEdges(edges);
  const previewMap = await hydrateNodePreviews(
    input.campaignId,
    input.campaignHandle,
    nodeRefs,
    { viewerCtx: input.viewerCtx },
  );

  return {
    edgeTaxonomyVersion: EDGE_TAXONOMY_VERSION,
    graphSemanticsVersion: GRAPH_SEMANTICS_VERSION,
    seed: input.seed,
    depth,
    edges,
    nodes: [...previewMap.values()],
  };
}

export async function buildAnalysisSnapshot(input: {
  campaignId: string;
  kinds?: readonly EntityRelationKind[];
  viewerCtx: NarrativeViewerContext;
  campaignNow: ChronologyDateParts;
  includeSuppressed?: boolean;
}): Promise<GraphAnalysisSnapshot> {
  const rows = await prisma.entityRelation.findMany({
    where: {
      campaignId: input.campaignId,
      ...(input.kinds?.length ? { relationKind: { in: [...input.kinds] } } : {}),
    },
  });

  let edges = rows.map(rowToEdge).map((edge) =>
    projectEdge(edge, input.viewerCtx, input.campaignNow),
  );
  if (!input.includeSuppressed) {
    edges = edges.filter((edge) => edge.visible !== false);
  }

  return attachAdjacency({
    edgeTaxonomyVersion: EDGE_TAXONOMY_VERSION,
    graphSemanticsVersion: GRAPH_SEMANTICS_VERSION,
    campaignId: input.campaignId,
    edges,
  });
}

export async function runGraphDiagnostics(input: {
  campaignId: string;
  campaignHandle: string;
  checks: GraphDiagnosticCheck[];
  viewerCtx: NarrativeViewerContext;
  campaignNow: ChronologyDateParts;
  includeSuppressed?: boolean;
}): Promise<GraphDiagnosticsResult> {
  const snapshot = await buildAnalysisSnapshot(input);
  const cycles =
    input.checks.includes('cycles')
      ? findCycles(snapshot.edges, [EntityRelationKinds.CALENDAR_PREREQUISITE])
      : [];

  let orphans: GraphDiagnosticsResult['orphans'] = [];
  if (input.checks.includes('orphans')) {
    const narrativePages = await prisma.wikiPage.findMany({
      where: { campaignId: input.campaignId, deletedAt: null },
      select: {
        id: true,
        title: true,
        templateType: true,
        metadata: true,
        parentId: true,
        stats: { select: { inboundLinkCount: true } },
        _count: { select: { children: true } },
      },
    });
    const pageIdsInThreadRelated = new Set<string>();
    const pageIdsInQuestParticipation = new Set<string>();
    for (const page of narrativePages) {
      pageIdsInQuestParticipation.add(page.id);
    }
    for (const page of narrativePages) {
      const codex = resolveWikiCodexType(page);
      if (
        !['CHARACTER', 'QUEST', 'LOCATION', 'ORGANIZATION', 'OBJECT', 'BESTIARY'].includes(
          codex,
        )
      ) {
        continue;
      }
      const isRoot = page._count.children > 0;
      if (
        isEntityGraphStructurallyIsolated(page.id, {
          edges: snapshot.edges,
          pageIdsInThreadRelated,
          pageIdsInQuestParticipation,
          inboundLinkCount: page.stats?.inboundLinkCount ?? 0,
          isContinuityRoot: isRoot,
        })
      ) {
        orphans.push({
          node: {
            entityType: EntityGraphEntityTypes.WIKI_PAGE,
            entityId: page.id,
          },
        });
      }
    }
  }

  const dangling =
    input.checks.includes('dangling')
      ? (await diagnoseEntityRelationIntegrity(input.campaignId)).map((issue) => ({
          edgeId: issue.edgeId,
          sourceRecordKey: issue.sourceRecordKey,
          missingSide:
            issue.type === 'dangling_target'
              ? ('target' as const)
              : ('source' as const),
          node: {
            entityType: EntityGraphEntityTypes.WIKI_PAGE,
            entityId: issue.edgeId,
          },
        }))
      : [];

  if (orphans.length > 0) {
    const previewMap = await hydrateNodePreviews(
      input.campaignId,
      input.campaignHandle,
      orphans.map((o) => o.node),
      { viewerCtx: input.viewerCtx },
    );
    orphans = orphans.map((o) => ({
      ...o,
      preview: previewMap.get(nodeRefKey(o.node)),
    }));
  }

  return {
    edgeTaxonomyVersion: EDGE_TAXONOMY_VERSION,
    graphSemanticsVersion: GRAPH_SEMANTICS_VERSION,
    campaignId: input.campaignId,
    checks: input.checks,
    cycles,
    orphans,
    dangling,
  };
}
