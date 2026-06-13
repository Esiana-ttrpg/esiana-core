/**
 * Relations workspace — server-precomputed lens projections (browser-safe).
 */
import type { ChronologyDateParts } from './chronologyTypes.js';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  nodeRefKey,
  type EntityGraphEdge,
  type EntityGraphNodePreview,
} from './entityGraph.js';
import { stanceToPolarity } from './narrativeRelationSemantics.js';
import {
  PROJECTION_DERIVED,
  buildRelationsTruncation,
  type RelationsRenderCaps,
  type RelationsTruncation,
} from './relationsRenderCaps.js';
import type { FactionReputationScores } from './reputationMetadata.js';

export const RELATIONS_PROJECTION_VERSION = 'relations-projection-v1';

export type RelationsLens = 'social' | 'structure' | 'kinship';

export type SocialDynamicsMode =
  | 'blocs'
  | 'connections'
  | 'reputation'
  | 'conflicts'
  | 'influence';

export type StructureMode = 'chain' | 'institutional';

export type KinshipMode = 'generations' | 'succession';

export type RelationsProjectionLevel = 'summary' | 'cluster' | 'entity';

export type ProjectionFocus =
  | { kind: 'party' }
  | { kind: 'wiki_page'; entityType: string; entityId: string }
  | { kind: 'bloc'; blocId: string };

export type ProjectionWindow = {
  lens: RelationsLens;
  mode: string;
  level: RelationsProjectionLevel;
  focus: ProjectionFocus;
  at: ChronologyDateParts | 'current';
  includeHistorical?: boolean;
};

export type RelationsNarrativeSummary = {
  headline: string;
  bullets: string[];
  at: ChronologyDateParts | 'current';
};

export type BlocSummary = {
  id: string;
  title: string;
  codexType: string | null;
  memberCount: number;
  partyTrust: number | null;
  partyNotoriety: number | null;
  standingLabel: string | null;
};

export type AggregatedTension = {
  id: string;
  sourceBlocId: string;
  sourceBlocTitle: string;
  targetBlocId: string;
  targetBlocTitle: string;
  polarity: 'positive' | 'negative' | 'neutral' | 'ambivalent';
  stance: string;
  supportingEdgeCount: number;
  topActors: Array<{ id: string; title: string }>;
};

export type PartyStanding = {
  blocId: string;
  blocTitle: string;
  trust: number;
  notoriety: number;
  label: string;
};

export type ConflictItem = {
  id: string;
  title: string;
  description: string;
  polarity: 'negative' | 'ambivalent';
  entityIds: string[];
};

export type ClusterMember = {
  id: string;
  title: string;
  role: string | null;
  codexType: string | null;
};

export type ConnectionNode = {
  id: string;
  title: string;
  codexType: string | null;
  angle: number;
  radius: number;
  blocId: string | null;
};

export type ConnectionEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  polarity: string;
  relationKind: string;
  inferred: boolean;
};

export type StructureNode = {
  id: string;
  title: string;
  role: string | null;
  depth: number;
  parentId: string | null;
};

export type KinshipMember = {
  id: string;
  title: string;
  generation: number;
  lineageRole: string | null;
};

export type KinshipEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  linkKind: string | null;
};

export type SocialRelationsRenderModel = {
  lens: 'social';
  mode: SocialDynamicsMode;
  level: RelationsProjectionLevel;
  narrativeSummary: RelationsNarrativeSummary;
  blocs: BlocSummary[];
  tensions: AggregatedTension[];
  partyStandings: PartyStanding[];
  conflicts: ConflictItem[];
  members: ClusterMember[];
  connectionNodes: ConnectionNode[];
  connectionEdges: ConnectionEdge[];
  truncation: RelationsTruncation;
  focus: ProjectionWindow;
};

export type StructureRelationsRenderModel = {
  lens: 'structure';
  mode: StructureMode;
  level: RelationsProjectionLevel;
  narrativeSummary: RelationsNarrativeSummary;
  nodes: StructureNode[];
  truncation: RelationsTruncation;
  focus: ProjectionWindow;
};

export type KinshipRelationsRenderModel = {
  lens: 'kinship';
  mode: KinshipMode;
  level: RelationsProjectionLevel;
  narrativeSummary: RelationsNarrativeSummary;
  members: KinshipMember[];
  edges: KinshipEdge[];
  truncation: RelationsTruncation;
  focus: ProjectionWindow;
};

export type RelationsRenderModel =
  | SocialRelationsRenderModel
  | StructureRelationsRenderModel
  | KinshipRelationsRenderModel;

export type WikiPageSnapshot = {
  id: string;
  title: string;
  templateType: string;
  metadata: unknown;
};

export type RelationsProjectionInput = {
  window: ProjectionWindow;
  caps: RelationsRenderCaps;
  edges: EntityGraphEdge[];
  nodePreviews: Map<string, EntityGraphNodePreview>;
  orgPages: WikiPageSnapshot[];
  reputationByFaction: Record<string, FactionReputationScores>;
};

function previewTitle(
  previews: Map<string, EntityGraphNodePreview>,
  pageId: string,
): string {
  const key = nodeRefKey({
    entityType: EntityGraphEntityTypes.WIKI_PAGE,
    entityId: pageId,
  });
  return previews.get(key)?.title ?? 'Unknown';
}

function previewCodex(
  previews: Map<string, EntityGraphNodePreview>,
  pageId: string,
): string | null {
  const key = nodeRefKey({
    entityType: EntityGraphEntityTypes.WIKI_PAGE,
    entityId: pageId,
  });
  return previews.get(key)?.codexType ?? null;
}

function standingLabel(trust: number): string {
  if (trust >= 60) return 'Trusted';
  if (trust >= 35) return 'Friendly';
  if (trust >= 15) return 'Neutral';
  if (trust >= -15) return 'Wary';
  if (trust >= -40) return 'Hostile';
  return 'Hated';
}

function stanceLabel(stance: string): string {
  const s = stance.trim().toUpperCase();
  if (s === 'ALLY') return 'allied';
  if (s === 'HOSTILE' || s === 'SECRET_HOSTILE') return 'hostile';
  if (s === 'VASSAL') return 'vassal';
  if (s === 'AT_WAR') return 'at war';
  return 'neutral';
}

export function buildNarrativeSummary(input: {
  headline?: string;
  at: ChronologyDateParts | 'current';
  tensions: AggregatedTension[];
  partyStandings: PartyStanding[];
  conflicts: ConflictItem[];
}): RelationsNarrativeSummary {
  const bullets: string[] = [];
  for (const tension of input.tensions.slice(0, 2)) {
    if (tension.polarity === 'negative') {
      bullets.push(
        `${tension.sourceBlocTitle} is escalating tensions with ${tension.targetBlocTitle}.`,
      );
    } else if (tension.polarity === 'positive') {
      bullets.push(
        `${tension.sourceBlocTitle} maintains an alliance with ${tension.targetBlocTitle}.`,
      );
    }
  }
  for (const standing of input.partyStandings.slice(0, 2)) {
    if (standing.trust >= 35) {
      bullets.push(`The party is ${standing.label.toLowerCase()} by ${standing.blocTitle}.`);
    } else if (standing.trust <= -15) {
      bullets.push(`The party is ${standing.label.toLowerCase()} to ${standing.blocTitle}.`);
    }
  }
  for (const conflict of input.conflicts.slice(0, 2)) {
    bullets.push(conflict.description);
  }
  const capped = bullets.slice(0, PROJECTION_DERIVED.maxNarrativeBullets);
  if (capped.length === 0) {
    capped.push('No major tensions recorded at this time.');
  }
  return {
    headline: input.headline ?? 'Current Situation',
    bullets: capped,
    at: input.at,
  };
}

function collectBlocAffiliations(
  edges: EntityGraphEdge[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_AFFILIATION) continue;
    if (
      edge.source.entityType !== EntityGraphEntityTypes.WIKI_PAGE ||
      edge.target.entityType !== EntityGraphEntityTypes.WIKI_PAGE
    ) {
      continue;
    }
    const orgId = edge.target.entityId;
    const charId = edge.source.entityId;
    if (!map.has(orgId)) map.set(orgId, new Set());
    map.get(orgId)!.add(charId);
  }
  return map;
}

function buildBlocSummaries(
  orgPages: WikiPageSnapshot[],
  affiliations: Map<string, Set<string>>,
  reputationByFaction: Record<string, FactionReputationScores>,
  previews: Map<string, EntityGraphNodePreview>,
  maxBlocs: number,
): { blocs: BlocSummary[]; hiddenBlocs: number } {
  const all = orgPages.map((org) => {
    const rep = reputationByFaction[org.id];
    const trust = rep?.trust ?? null;
    return {
      id: org.id,
      title: org.title,
      codexType: previewCodex(previews, org.id) ?? org.templateType,
      memberCount: affiliations.get(org.id)?.size ?? 0,
      partyTrust: trust,
      partyNotoriety: rep?.notoriety ?? null,
      standingLabel: trust !== null ? standingLabel(trust) : null,
    };
  });
  all.sort((a, b) => b.memberCount - a.memberCount);
  const visible = all.slice(0, maxBlocs);
  return { blocs: visible, hiddenBlocs: Math.max(0, all.length - visible.length) };
}

function buildAggregatedTensions(
  edges: EntityGraphEdge[],
  previews: Map<string, EntityGraphNodePreview>,
): { tensions: AggregatedTension[]; totalEdgeCount: number; aggregatedHidden: number } {
  const diplomatic = edges.filter((e) => e.relationKind === EntityRelationKinds.ORG_DIPLOMATIC);
  const map = new Map<string, AggregatedTension>();
  for (const edge of diplomatic) {
    if (
      edge.source.entityType !== EntityGraphEntityTypes.WIKI_PAGE ||
      edge.target.entityType !== EntityGraphEntityTypes.WIKI_PAGE
    ) {
      continue;
    }
    const stance =
      edge.payload?.kind === EntityRelationKinds.ORG_DIPLOMATIC
        ? edge.payload.stance
        : 'NEUTRAL';
    const key = [edge.source.entityId, edge.target.entityId].sort().join('|');
    const existing = map.get(key);
    const polarity = stanceToPolarity(stance);
    if (existing) {
      existing.supportingEdgeCount += 1;
    } else {
      map.set(key, {
        id: key,
        sourceBlocId: edge.source.entityId,
        sourceBlocTitle: previewTitle(previews, edge.source.entityId),
        targetBlocId: edge.target.entityId,
        targetBlocTitle: previewTitle(previews, edge.target.entityId),
        polarity,
        stance: stanceLabel(stance),
        supportingEdgeCount: 1,
        topActors: [],
      });
    }
  }
  const tensions = [...map.values()].sort(
    (a, b) => b.supportingEdgeCount - a.supportingEdgeCount,
  );
  return {
    tensions,
    totalEdgeCount: diplomatic.length,
    aggregatedHidden: Math.max(0, diplomatic.length - tensions.length),
  };
}

function buildPartyStandings(
  blocs: BlocSummary[],
): PartyStanding[] {
  return blocs
    .filter((b) => b.partyTrust !== null)
    .map((b) => ({
      blocId: b.id,
      blocTitle: b.title,
      trust: b.partyTrust!,
      notoriety: b.partyNotoriety ?? 0,
      label: b.standingLabel ?? standingLabel(b.partyTrust!),
    }))
    .sort((a, b) => b.trust - a.trust);
}

function buildConflicts(
  tensions: AggregatedTension[],
  edges: EntityGraphEdge[],
  previews: Map<string, EntityGraphNodePreview>,
): ConflictItem[] {
  const items: ConflictItem[] = [];
  for (const t of tensions) {
    if (t.polarity !== 'negative') continue;
    items.push({
      id: t.id,
      title: `${t.sourceBlocTitle} ↔ ${t.targetBlocTitle}`,
      description: `${t.sourceBlocTitle} is ${t.stance} toward ${t.targetBlocTitle}.`,
      polarity: 'negative',
      entityIds: [t.sourceBlocId, t.targetBlocId],
    });
  }
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_SOCIAL) continue;
    const payload = edge.payload;
    if (payload?.kind !== EntityRelationKinds.CHARACTER_SOCIAL) continue;
    const sem = payload.semantics;
    if (sem?.polarity !== 'negative' && payload.narrativeType !== 'rival') continue;
    items.push({
      id: edge.id,
      title: previewTitle(previews, edge.target.entityId),
      description: `Active rivalry involving ${previewTitle(previews, edge.source.entityId)}.`,
      polarity: 'negative',
      entityIds: [edge.source.entityId, edge.target.entityId],
    });
  }
  return items.slice(0, 10);
}

function buildClusterMembers(
  blocId: string,
  edges: EntityGraphEdge[],
  previews: Map<string, EntityGraphNodePreview>,
  cap: number,
): { members: ClusterMember[]; hidden: number } {
  const members: ClusterMember[] = [];
  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_AFFILIATION) continue;
    if (edge.target.entityId !== blocId) continue;
    const role =
      edge.payload?.kind === EntityRelationKinds.CHARACTER_AFFILIATION
        ? edge.payload.role ?? null
        : null;
    members.push({
      id: edge.source.entityId,
      title: previewTitle(previews, edge.source.entityId),
      role,
      codexType: previewCodex(previews, edge.source.entityId),
    });
  }
  members.sort((a, b) => a.title.localeCompare(b.title));
  return {
    members: members.slice(0, cap),
    hidden: Math.max(0, members.length - cap),
  };
}

function buildConnectionGraph(
  focusEntityId: string,
  edges: EntityGraphEdge[],
  previews: Map<string, EntityGraphNodePreview>,
  caps: RelationsRenderCaps,
  affiliations: Map<string, Set<string>>,
): {
  nodes: ConnectionNode[];
  connectionEdges: ConnectionEdge[];
  totalNodes: number;
  totalEdges: number;
} {
  const nodeIds = new Set<string>([focusEntityId]);
  const relevantEdges: EntityGraphEdge[] = [];
  for (const edge of edges) {
    const involvesFocus =
      (edge.source.entityType === EntityGraphEntityTypes.WIKI_PAGE &&
        edge.source.entityId === focusEntityId) ||
      (edge.target.entityType === EntityGraphEntityTypes.WIKI_PAGE &&
        edge.target.entityId === focusEntityId);
    if (!involvesFocus) continue;
    relevantEdges.push(edge);
    if (edge.source.entityType === EntityGraphEntityTypes.WIKI_PAGE) {
      nodeIds.add(edge.source.entityId);
    }
    if (edge.target.entityType === EntityGraphEntityTypes.WIKI_PAGE) {
      nodeIds.add(edge.target.entityId);
    }
  }
  const allNodeIds = [...nodeIds];
  const visibleIds = allNodeIds.slice(0, caps.maxVisibleNodes);
  const charToBloc = new Map<string, string>();
  for (const [orgId, chars] of affiliations) {
    for (const charId of chars) charToBloc.set(charId, orgId);
  }
  const nodes: ConnectionNode[] = visibleIds.map((id, index) => {
    const count = visibleIds.length;
    const angle = (index / Math.max(count, 1)) * Math.PI * 2;
    const radius = id === focusEntityId ? 0 : 120 + (index % 3) * 40;
    return {
      id,
      title: previewTitle(previews, id),
      codexType: previewCodex(previews, id),
      angle,
      radius,
      blocId: charToBloc.get(id) ?? null,
    };
  });
  const visibleSet = new Set(visibleIds);
  const connectionEdges: ConnectionEdge[] = [];
  for (const edge of relevantEdges) {
    const src =
      edge.source.entityType === EntityGraphEntityTypes.WIKI_PAGE
        ? edge.source.entityId
        : null;
    const tgt =
      edge.target.entityType === EntityGraphEntityTypes.WIKI_PAGE
        ? edge.target.entityId
        : null;
    if (!src || !tgt || !visibleSet.has(src) || !visibleSet.has(tgt)) continue;
    let polarity = 'neutral';
    if (edge.relationKind === EntityRelationKinds.ORG_DIPLOMATIC && edge.payload?.kind === EntityRelationKinds.ORG_DIPLOMATIC) {
      polarity = stanceToPolarity(edge.payload.stance);
    } else if (edge.payload?.kind === EntityRelationKinds.CHARACTER_SOCIAL) {
      polarity = edge.payload.semantics?.polarity ?? 'neutral';
    }
    connectionEdges.push({
      id: edge.id,
      sourceId: src,
      targetId: tgt,
      polarity,
      relationKind: edge.relationKind,
      inferred: edge.payload?.kind === EntityRelationKinds.CHARACTER_SOCIAL
        ? edge.payload.semantics?.provenance === 'inferred'
        : false,
    });
    if (connectionEdges.length >= caps.maxVisibleEdges) break;
  }
  return {
    nodes,
    connectionEdges,
    totalNodes: allNodeIds.length,
    totalEdges: relevantEdges.length,
  };
}

export function projectSocialRelations(
  input: RelationsProjectionInput,
): SocialRelationsRenderModel {
  const { window, caps, edges, nodePreviews, orgPages, reputationByFaction } = input;
  const affiliations = collectBlocAffiliations(edges);
  const { blocs, hiddenBlocs } = buildBlocSummaries(
    orgPages,
    affiliations,
    reputationByFaction,
    nodePreviews,
    PROJECTION_DERIVED.maxBlocCount,
  );
  const { tensions, totalEdgeCount, aggregatedHidden } = buildAggregatedTensions(
    edges,
    nodePreviews,
  );
  const partyStandings = buildPartyStandings(blocs);
  const conflicts = buildConflicts(tensions, edges, nodePreviews);

  let members: ClusterMember[] = [];
  let connectionNodes: ConnectionNode[] = [];
  let connectionEdges: ConnectionEdge[] = [];
  let visibleNodes = blocs.length;
  let totalNodes = blocs.length + hiddenBlocs;
  let visibleEdges = tensions.length;
  let totalEdges = totalEdgeCount;
  const truncationReasons: RelationsTruncation['truncationReasons'] = [];
  if (aggregatedHidden > 0) truncationReasons.push('cluster');
  if (hiddenBlocs > 0) truncationReasons.push('bloc_cap');

  if (window.level === 'cluster' && window.focus.kind === 'bloc') {
    const { members: clusterMembers, hidden } = buildClusterMembers(
      window.focus.blocId,
      edges,
      nodePreviews,
      PROJECTION_DERIVED.maxMembersPerBloc,
    );
    members = clusterMembers;
    visibleNodes = members.length;
    totalNodes = members.length + hidden;
    if (hidden > 0) truncationReasons.push('member_cap');
  }

  if (window.level === 'entity' && window.focus.kind === 'wiki_page') {
    const graph = buildConnectionGraph(
      window.focus.entityId,
      edges,
      nodePreviews,
      caps,
      affiliations,
    );
    connectionNodes = graph.nodes;
    connectionEdges = graph.connectionEdges;
    visibleNodes = graph.nodes.length;
    totalNodes = graph.totalNodes;
    visibleEdges = graph.connectionEdges.length;
    totalEdges = graph.totalEdges;
  }

  const narrativeSummary = buildNarrativeSummary({
    at: window.at,
    tensions,
    partyStandings,
    conflicts,
  });

  const truncation = buildRelationsTruncation({
    visibleNodes,
    totalNodes,
    visibleEdges,
    totalEdges,
    caps,
    reasons: truncationReasons,
  });

  return {
    lens: 'social',
    mode: (window.mode as SocialDynamicsMode) || 'blocs',
    level: window.level,
    narrativeSummary,
    blocs,
    tensions,
    partyStandings,
    conflicts,
    members,
    connectionNodes,
    connectionEdges,
    truncation,
    focus: window,
  };
}

function buildInstitutionalOverviewNodes(
  orgPages: WikiPageSnapshot[],
  edges: EntityGraphEdge[],
  nodePreviews: Map<string, EntityGraphNodePreview>,
  cap: number,
): StructureNode[] {
  const nodes: StructureNode[] = [];
  for (const org of orgPages.slice(0, cap)) {
    const members = edges.filter(
      (edge) =>
        edge.relationKind === EntityRelationKinds.CHARACTER_AFFILIATION &&
        edge.target.entityId === org.id,
    ).length;
    const subordinates = edges.filter(
      (edge) =>
        edge.relationKind === EntityRelationKinds.ORG_PARENT &&
        edge.source.entityId === org.id,
    ).length;
    const leaders = edges.filter(
      (edge) =>
        edge.relationKind === EntityRelationKinds.ORG_LEADER &&
        edge.source.entityId === org.id,
    ).length;
    nodes.push({
      id: org.id,
      title: org.title || previewTitle(nodePreviews, org.id),
      role:
        members + subordinates + leaders > 0
          ? `${members} members · ${subordinates} sub-orgs · ${leaders} leaders`
          : 'Organization',
      depth: 0,
      parentId: null,
    });
  }
  return nodes;
}

export function projectStructureRelations(
  input: RelationsProjectionInput,
): StructureRelationsRenderModel {
  const { window, caps, edges, nodePreviews, orgPages } = input;
  const mode = (window.mode as StructureMode) || 'chain';
  const nodes: StructureNode[] = [];
  const rootId =
    window.focus.kind === 'bloc'
      ? window.focus.blocId
      : window.focus.kind === 'wiki_page'
        ? window.focus.entityId
        : null;

  if (!rootId && mode === 'institutional') {
    nodes.push(
      ...buildInstitutionalOverviewNodes(
        orgPages,
        edges,
        nodePreviews,
        PROJECTION_DERIVED.maxBlocCount,
      ),
    );
  } else if (rootId) {
    nodes.push({
      id: rootId,
      title: previewTitle(nodePreviews, rootId),
      role: 'Leader',
      depth: 0,
      parentId: null,
    });
    for (const edge of edges) {
      if (edge.relationKind === EntityRelationKinds.ORG_LEADER && edge.source.entityId === rootId) {
        nodes.push({
          id: edge.target.entityId,
          title: previewTitle(nodePreviews, edge.target.entityId),
          role: 'Leader',
          depth: 1,
          parentId: rootId,
        });
      }
      if (
        edge.relationKind === EntityRelationKinds.CHARACTER_AFFILIATION &&
        edge.target.entityId === rootId
      ) {
        const role =
          edge.payload?.kind === EntityRelationKinds.CHARACTER_AFFILIATION
            ? (edge.payload.role ?? null)
            : null;
        nodes.push({
          id: edge.source.entityId,
          title: previewTitle(nodePreviews, edge.source.entityId),
          role,
          depth: 1,
          parentId: rootId,
        });
      }
      if (edge.relationKind === EntityRelationKinds.ORG_PARENT && edge.source.entityId === rootId) {
        nodes.push({
          id: edge.target.entityId,
          title: previewTitle(nodePreviews, edge.target.entityId),
          role: 'Subordinate org',
          depth: 1,
          parentId: rootId,
        });
      }
    }
  }

  const visible = nodes.slice(0, caps.maxVisibleNodes);
  const narrativeSummary = buildNarrativeSummary({
    headline: 'Institutional Structure',
    at: window.at,
    tensions: [],
    partyStandings: [],
    conflicts: [],
  });
  if (visible.length === 0) {
    narrativeSummary.bullets =
      mode === 'institutional'
        ? ['No organizations recorded for an institutional overview.']
        : ['Select an organization focus to explore its command structure.'];
  } else if (mode === 'institutional' && !rootId) {
    narrativeSummary.bullets = [
      `${visible.length} organizations appear in the institutional map.`,
      'Explore an organization to see its command chain.',
    ];
  } else {
    narrativeSummary.bullets = [
      `${visible[0]!.title} anchors the current institutional view.`,
      `${Math.max(0, visible.length - 1)} related roles and subordinates are visible.`,
    ];
  }

  return {
    lens: 'structure',
    mode,
    level: window.level,
    narrativeSummary,
    nodes: visible,
    truncation: buildRelationsTruncation({
      visibleNodes: visible.length,
      totalNodes: nodes.length,
      visibleEdges: 0,
      totalEdges: 0,
      caps,
      reasons: nodes.length > visible.length ? ['node_cap'] : undefined,
    }),
    focus: window,
  };
}

function assignKinshipGenerations(
  memberIds: string[],
  kinshipEdges: KinshipEdge[],
): Map<string, number> {
  const parentOf = new Map<string, string>();
  for (const edge of kinshipEdges) {
    if (edge.linkKind !== 'parent') continue;
    parentOf.set(edge.sourceId, edge.targetId);
  }
  const generations = new Map<string, number>();
  const queue: string[] = [];
  for (const id of memberIds) {
    if (!parentOf.has(id)) {
      generations.set(id, 0);
      queue.push(id);
    }
  }
  if (queue.length === 0 && memberIds.length > 0) {
    generations.set(memberIds[0]!, 0);
    queue.push(memberIds[0]!);
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const gen = generations.get(current) ?? 0;
    for (const edge of kinshipEdges) {
      if (edge.linkKind !== 'parent' || edge.targetId !== current) continue;
      const childId = edge.sourceId;
      if (generations.has(childId)) continue;
      generations.set(childId, gen + 1);
      queue.push(childId);
    }
  }
  for (const id of memberIds) {
    if (!generations.has(id)) generations.set(id, 0);
  }
  return generations;
}

export function projectKinshipRelations(
  input: RelationsProjectionInput,
): KinshipRelationsRenderModel {
  const { window, caps, edges, nodePreviews } = input;
  const memberIdSet = new Set<string>();
  const kinshipEdges: KinshipEdge[] = [];
  const focusFamilyId =
    window.focus.kind === 'bloc' ? window.focus.blocId : null;

  for (const edge of edges) {
    if (edge.relationKind !== EntityRelationKinds.CHARACTER_LINEAGE) continue;
    const payload = edge.payload;
    const relationshipType =
      payload?.kind === EntityRelationKinds.CHARACTER_LINEAGE
        ? payload.relationshipType
        : 'OTHER';
    const linkKind =
      payload?.kind === EntityRelationKinds.CHARACTER_LINEAGE
        ? payload.linkKind ?? 'parent'
        : 'parent';
    kinshipEdges.push({
      id: edge.id,
      sourceId: edge.source.entityId,
      targetId: edge.target.entityId,
      relationshipType,
      linkKind,
    });
    memberIdSet.add(edge.source.entityId);
    memberIdSet.add(edge.target.entityId);
  }

  const generationById = assignKinshipGenerations([...memberIdSet], kinshipEdges);
  const members: KinshipMember[] = [...memberIdSet]
    .map((id) => ({
      id,
      title: previewTitle(nodePreviews, id),
      generation: generationById.get(id) ?? 0,
      lineageRole: null,
    }))
    .sort((a, b) => a.generation - b.generation || a.title.localeCompare(b.title));

  const visibleMembers = members.slice(0, caps.maxVisibleNodes);
  const visibleEdges = kinshipEdges.slice(0, caps.maxVisibleEdges);

  const mode = (window.mode as KinshipMode) || 'generations';
  const successionEdges = kinshipEdges.filter((edge) => {
    const upper = edge.relationshipType.trim().toUpperCase();
    return upper === 'SUCCESSOR' || upper === 'HEIR';
  });

  const narrativeSummary = buildNarrativeSummary({
    headline: mode === 'succession' ? 'Line of Succession' : 'Kinship & Legacy',
    at: window.at,
    tensions: [],
    partyStandings: [],
    conflicts: [],
  });
  if (visibleMembers.length === 0) {
    narrativeSummary.bullets = ['No lineage links recorded for this focus.'];
  } else if (mode === 'succession') {
    if (successionEdges.length === 0) {
      narrativeSummary.bullets = [
        'No explicit succession or heir links are recorded.',
        `${visibleMembers.length} figures appear in the broader lineage view.`,
      ];
    } else {
      const lead = successionEdges[0]!;
      narrativeSummary.bullets = [
        `${previewTitle(nodePreviews, lead.sourceId)} is marked as ${lead.relationshipType.toLowerCase()} to ${previewTitle(nodePreviews, lead.targetId)}.`,
        `${successionEdges.length} succession tie${successionEdges.length === 1 ? '' : 's'} are visible.`,
      ];
    }
  } else {
    narrativeSummary.bullets = [
      `${visibleMembers.length} figures appear across ${new Set(visibleMembers.map((m) => m.generation)).size} generations.`,
    ];
    if (focusFamilyId) {
      narrativeSummary.bullets.push(
        `Exploring heritage connections for ${previewTitle(nodePreviews, focusFamilyId)}.`,
      );
    }
  }

  return {
    lens: 'kinship',
    mode,
    level: window.level,
    narrativeSummary,
    members: visibleMembers,
    edges: visibleEdges,
    truncation: buildRelationsTruncation({
      visibleNodes: visibleMembers.length,
      totalNodes: members.length,
      visibleEdges: visibleEdges.length,
      totalEdges: kinshipEdges.length,
      caps,
    }),
    focus: window,
  };
}

export function projectRelationsLens(
  input: RelationsProjectionInput,
): RelationsRenderModel {
  if (input.window.lens === 'structure') {
    return projectStructureRelations(input);
  }
  if (input.window.lens === 'kinship') {
    return projectKinshipRelations(input);
  }
  return projectSocialRelations(input);
}
