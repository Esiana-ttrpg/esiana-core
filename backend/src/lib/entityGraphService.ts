import type { Prisma } from './prismaClient.js';
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
import { redactAdventureReferenceText } from './adventurePageProjection.js';
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

const INHERITED_RELATION_DOMAINS = new Set(['wiki_link', 'wiki_metadata', 'calendar', 'map', 'downtime']);

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
  authorizedPageIds?: ReadonlySet<string>;
  authorizedEntityKeys?: ReadonlySet<string>;
  generatedWikiPairs?: ReadonlySet<string>;
};

export function authorizedGraphRow(row: EntityRelationRow, input: {
  authorizedPageIds?: ReadonlySet<string>;
  authorizedEntityKeys?: ReadonlySet<string>;
  generatedWikiPairs?: ReadonlySet<string>;
}): boolean {
  if (!input.authorizedEntityKeys) {
    if (!input.authorizedPageIds) return true;
    return input.authorizedPageIds.has(row.sourceEntityId) &&
      input.authorizedPageIds.has(row.targetEntityId) &&
      (!row.sourcePageId || input.authorizedPageIds.has(row.sourcePageId)) &&
      !!row.visibility && ['PUBLIC', 'PARTY', 'CAMPAIGN'].includes(row.visibility.toUpperCase());
  }
  const keys = input.authorizedEntityKeys;
  if (row.visibility && !['PUBLIC', 'PARTY', 'CAMPAIGN'].includes(row.visibility.trim().toUpperCase())) return false;
  if (['wiki_link', 'wiki_metadata'].includes(row.sourceDomain) &&
    !input.generatedWikiPairs?.has(`${row.sourceEntityId}:${row.targetEntityId}`)) return false;
  return keys.has(`${row.sourceEntityType}:${row.sourceEntityId}`) &&
    keys.has(`${row.targetEntityType}:${row.targetEntityId}`) &&
    (!row.sourcePageId || !!input.authorizedPageIds?.has(row.sourcePageId));
}

// Generated edges inherit their already-authorized endpoints when no separate
// relationship visibility was authored. Explicit relationship visibility stays intact.
export function rowForAudience(row: EntityRelationRow, authorizedEntityKeys?: ReadonlySet<string>,
  authorizedPageIds?: ReadonlySet<string>): EntityRelationRow {
  if (!authorizedEntityKeys && !authorizedPageIds) return row;
  const scrub = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
      if (/PageId$|^pageId$/.test(key)) return authorizedPageIds?.has(value) ? value : null;
      return redactAdventureReferenceText(value, id => !!authorizedPageIds?.has(id));
    }
    if (Array.isArray(value)) return value.map(item => scrub(item, key)).filter(item => item != null);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (Object.entries(record).some(([name, item]) => {
      if (typeof item !== 'string') return false;
      if (/PageId$|^pageId$/.test(name)) return !authorizedPageIds?.has(item);
      if (/EntityId$|^entityId$/.test(name)) {
        const type = record[name.replace(/Id$/, 'Type')];
        return typeof type === 'string'
          ? !authorizedEntityKeys?.has(`${type}:${item}`) : !authorizedPageIds?.has(item);
      }
      return false;
    })) return null;
    return Object.fromEntries(Object.entries(record).map(([name, item]) => [name, scrub(item, name)]));
  };
  const inherited = row.visibility == null && INHERITED_RELATION_DOMAINS.has(row.sourceDomain);
  return { ...row, sourceRecordKey: row.id, visibility: inherited ? 'PUBLIC' : row.visibility,
    payload: scrub(inherited && ['wiki_link', 'wiki_metadata'].includes(row.sourceDomain)
      ? { kind: row.relationKind } : row.payload) };
}

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
      if (!authorizedGraphRow(row, input)) continue;
      const projectedRow = rowForAudience(row, input.authorizedEntityKeys, input.authorizedPageIds);
      if (input.authorizedEntityKeys && !projectEdge(rowToEdge(projectedRow), input.viewerCtx, input.campaignNow).visible) continue;
      if (seenEdgeIds.has(row.id)) continue;
      seenEdgeIds.add(row.id);
      edgeRows.push(projectedRow);
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
  authorizedPageIds?: ReadonlySet<string>;
  authorizedEntityKeys?: ReadonlySet<string>;
  generatedWikiPairs?: ReadonlySet<string>;
}): Promise<GraphAnalysisSnapshot> {
  const rows = await prisma.entityRelation.findMany({
    where: {
      campaignId: input.campaignId,
      ...(input.kinds?.length ? { relationKind: { in: [...input.kinds] } } : {}),
    },
  });

  const authorizedRows = rows.filter(row => authorizedGraphRow(row, input))
    .map(row => rowForAudience(row, input.authorizedEntityKeys, input.authorizedPageIds));
  let edges = authorizedRows.map(rowToEdge).map((edge) =>
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
  authorizedPageIds?: ReadonlySet<string>;
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
