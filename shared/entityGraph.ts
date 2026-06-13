/**
 * Layer 1 — unified entity relationship graph (canonical edge taxonomy + API shapes).
 */
import type { ChronologyDateParts } from './chronologyTypes.js';
import type { NarrativeRelationSemantics } from './narrativeRelationSemantics.js';

export const EDGE_TAXONOMY_VERSION = 'entity-graph-v2';
export const GRAPH_SEMANTICS_VERSION = 'graph-semantics-v2';

export const EntityGraphEntityTypes = {
  WIKI_PAGE: 'wiki_page',
  CALENDAR_EVENT: 'calendar_event',
  MAP_PIN: 'map_pin',
  MAP_SCENE_OBJECT: 'map_scene_object',
  SCENE: 'scene',
  CLUE: 'clue',
} as const;

export type EntityGraphEntityType =
  (typeof EntityGraphEntityTypes)[keyof typeof EntityGraphEntityTypes];

export const EntityRelationKinds = {
  WIKI_REFERENCE: 'WIKI_REFERENCE',
  ORG_DIPLOMATIC: 'ORG_DIPLOMATIC',
  ORG_PARENT: 'ORG_PARENT',
  ANCESTRY_PARENT: 'ANCESTRY_PARENT',
  CHARACTER_ANCESTRY: 'CHARACTER_ANCESTRY',
  ORG_LEADER: 'ORG_LEADER',
  ORG_HQ: 'ORG_HQ',
  CHARACTER_AFFILIATION: 'CHARACTER_AFFILIATION',
  CHARACTER_LINEAGE: 'CHARACTER_LINEAGE',
  CHARACTER_SOCIAL: 'CHARACTER_SOCIAL',
  QUEST_GIVER: 'QUEST_GIVER',
  QUEST_FACTION: 'QUEST_FACTION',
  THREAD_RELATED: 'THREAD_RELATED',
  THREAD_PAYOFF: 'THREAD_PAYOFF',
  SCENE_PARTICIPANT: 'SCENE_PARTICIPANT',
  SCENE_LOCATION: 'SCENE_LOCATION',
  SCENE_QUEST: 'SCENE_QUEST',
  SCENE_CLUE: 'SCENE_CLUE',
  SCENE_THREAD: 'SCENE_THREAD',
  SCENE_FOLLOWS: 'SCENE_FOLLOWS',
  ARC_CONTAINS: 'ARC_CONTAINS',
  QUESTLINE_CONTAINS: 'QUESTLINE_CONTAINS',
  QUEST_OBJECTIVE: 'QUEST_OBJECTIVE',
  OBJECTIVE_SCENE: 'OBJECTIVE_SCENE',
  LOCATION_RELATED: 'LOCATION_RELATED',
  LOCATION_REGION: 'LOCATION_REGION',
  LOCATION_MAP: 'LOCATION_MAP',
  CALENDAR_PREREQUISITE: 'CALENDAR_PREREQUISITE',
  MAP_TARGETS: 'MAP_TARGETS',
  PAGE_PARENT: 'PAGE_PARENT',
  HAVEN_LOCATION: 'HAVEN_LOCATION',
  HAVEN_RESIDENT: 'HAVEN_RESIDENT',
  HAVEN_FACTION: 'HAVEN_FACTION',
  HAVEN_RELATED: 'HAVEN_RELATED',
  HAVEN_REFERENCE: 'HAVEN_REFERENCE',
} as const;

export type EntityRelationKind =
  (typeof EntityRelationKinds)[keyof typeof EntityRelationKinds];

export const EntityRelationSourceDomains = {
  WIKI_LINK: 'wiki_link',
  WIKI_METADATA: 'wiki_metadata',
  CALENDAR: 'calendar',
  MAP: 'map',
  DOWNTIME: 'downtime',
} as const;

export type EntityRelationSourceDomain =
  (typeof EntityRelationSourceDomains)[keyof typeof EntityRelationSourceDomains];

export const EntityRelationDirections = {
  DIRECTED: 'directed',
  UNDIRECTED_HALF: 'undirected_half',
} as const;

export type EntityRelationDirection =
  (typeof EntityRelationDirections)[keyof typeof EntityRelationDirections];

export type LabelPreview = {
  sourceLabel?: string;
  targetLabel?: string;
};

export type EntityRelationPayload =
  | { kind: typeof EntityRelationKinds.WIKI_REFERENCE; aliasText?: string; preview?: LabelPreview }
  | {
      kind: typeof EntityRelationKinds.ORG_DIPLOMATIC;
      stance: string;
      relationType: string;
      note?: string;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.CHARACTER_AFFILIATION;
      role?: string | null;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.CHARACTER_LINEAGE;
      relationshipType: string;
      linkKind?: 'parent' | 'spouse';
      semantics?: NarrativeRelationSemantics;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.CHARACTER_SOCIAL;
      narrativeType: string;
      semantics?: NarrativeRelationSemantics;
      preview?: LabelPreview;
    }
  | { kind: typeof EntityRelationKinds.QUEST_GIVER; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.QUEST_FACTION; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.THREAD_RELATED; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.THREAD_PAYOFF; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_PARTICIPANT; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_LOCATION; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_QUEST; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_CLUE; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_THREAD; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.SCENE_FOLLOWS; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.ARC_CONTAINS; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.QUESTLINE_CONTAINS; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.QUEST_OBJECTIVE; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.OBJECTIVE_SCENE; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.LOCATION_RELATED; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.LOCATION_REGION; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.LOCATION_MAP; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.ORG_PARENT; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.ANCESTRY_PARENT; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.CHARACTER_ANCESTRY; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.ORG_LEADER; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.ORG_HQ; preview?: LabelPreview }
  | { kind: typeof EntityRelationKinds.CALENDAR_PREREQUISITE; preview?: LabelPreview }
  | {
      kind: typeof EntityRelationKinds.MAP_TARGETS;
      pinType?: string | null;
      label?: string | null;
      preview?: LabelPreview;
    }
  | { kind: typeof EntityRelationKinds.PAGE_PARENT; preview?: LabelPreview }
  | {
      kind: typeof EntityRelationKinds.HAVEN_LOCATION;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.HAVEN_RESIDENT;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.HAVEN_FACTION;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.HAVEN_RELATED;
      preview?: LabelPreview;
    }
  | {
      kind: typeof EntityRelationKinds.HAVEN_REFERENCE;
      referenceType?: string | null;
      title?: string | null;
      preview?: LabelPreview;
    };

import type { PageNarrativeStatusProjection } from './pageNarrativeStatus.js';

export type EntityGraphNodeRef = {
  entityType: EntityGraphEntityType;
  entityId: string;
};

export type EntityGraphNodePreview = EntityGraphNodeRef & {
  title: string;
  codexType?: string | null;
  href?: string | null;
  narrativeStatus?: PageNarrativeStatusProjection;
};

export type EntityGraphEdge = {
  id: string;
  source: EntityGraphNodeRef;
  target: EntityGraphNodeRef;
  relationKind: EntityRelationKind;
  direction: EntityRelationDirection;
  startDate: ChronologyDateParts | null;
  endDate: ChronologyDateParts | null;
  visibility: string | null;
  payload: EntityRelationPayload | null;
  sourceDomain: EntityRelationSourceDomain;
  sourceRecordKey: string;
  sourcePageId: string | null;
  visible?: boolean;
};

export type GraphVersionHeaders = {
  edgeTaxonomyVersion: string;
  graphSemanticsVersion: string;
};

export type GraphAnalysisSnapshot = GraphVersionHeaders & {
  campaignId: string;
  edges: EntityGraphEdge[];
  adjacency?: EntityGraphAdjacencyIndex;
};

export type LocalGraphQueryResult = GraphVersionHeaders & {
  seed: EntityGraphNodeRef;
  depth: number;
  edges: EntityGraphEdge[];
  nodes: EntityGraphNodePreview[];
};

export type EntityGraphAdjacencyIndex = {
  outbound: Map<string, EntityGraphEdge[]>;
  inbound: Map<string, EntityGraphEdge[]>;
};

export type GraphDiagnosticCheck =
  | 'cycles'
  | 'orphans'
  | 'unreachable'
  | 'dangling';

export type GraphCycleFinding = {
  kind: EntityRelationKind;
  nodeIds: string[];
};

export type GraphOrphanFinding = {
  node: EntityGraphNodeRef;
  preview?: EntityGraphNodePreview;
};

export type GraphDanglingFinding = {
  edgeId: string;
  sourceRecordKey: string;
  missingSide: 'source' | 'target';
  node: EntityGraphNodeRef;
};

export type GraphDiagnosticsResult = GraphVersionHeaders & {
  campaignId: string;
  checks: GraphDiagnosticCheck[];
  cycles: GraphCycleFinding[];
  orphans: GraphOrphanFinding[];
  dangling: GraphDanglingFinding[];
};

export function nodeRefKey(ref: EntityGraphNodeRef): string {
  return `${ref.entityType}:${ref.entityId}`;
}

export function parseNodeRefKey(key: string): EntityGraphNodeRef | null {
  const idx = key.indexOf(':');
  if (idx <= 0) return null;
  const entityType = key.slice(0, idx) as EntityGraphEntityType;
  const entityId = key.slice(idx + 1);
  if (!entityId) return null;
  return { entityType, entityId };
}

export function isUndirectedRelationKind(kind: EntityRelationKind): boolean {
  return kind === EntityRelationKinds.LOCATION_RELATED;
}

export function buildUndirectedRecordKeys(baseKey: string): { forward: string; reverse: string } {
  return {
    forward: `${baseKey}:forward`,
    reverse: `${baseKey}:reverse`,
  };
}

export function parseEntityRelationPayload(raw: unknown): EntityRelationPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = (raw as { kind?: unknown }).kind;
  if (typeof kind !== 'string') return null;
  if (!(Object.values(EntityRelationKinds) as string[]).includes(kind)) return null;
  return raw as EntityRelationPayload;
}
