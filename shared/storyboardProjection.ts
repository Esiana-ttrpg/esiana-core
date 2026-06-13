/**
 * Layer 5 — storyboard view storage (layout-only projection).
 */
import type { EntityGraphEdge } from './entityGraph.js';
import type { ContinuityIssue } from './continuityIssue.js';
import { normalizeSceneBeatTypeFilter } from './narrativeBeatTypes.js';
import type { SceneBeatType } from './sceneMetadata.js';
import {
  buildModeLegend,
  deriveStoryboardEdges,
  type StoryboardProjectedEdge,
} from './storyboardEdgeDerivation.js';

export type { StoryboardProjectedEdge } from './storyboardEdgeDerivation.js';
export {
  STORYBOARD_EDGE_PROVENANCE,
  STORYBOARD_MODE_RELATION_KINDS,
  STORYBOARD_MODE_LABELS,
  buildModeLegend,
  deriveStoryboardEdges,
} from './storyboardEdgeDerivation.js';

export const STORYBOARD_VIEW_VERSION = 'storyboard-view-v1';

export const ADVENTURE_SECTIONS = [
  'board',
  'scenes',
  'investigation',
  'continuity',
  'arcs',
  'sessions',
  'scene-timeline',
  'thread-history',
  'timeline',
] as const;

export type AdventureSection = (typeof ADVENTURE_SECTIONS)[number];

export type StoryboardNodeEntityType =
  | 'scene'
  | 'quest'
  | 'thread'
  | 'character'
  | 'location'
  | 'event'
  | 'wiki_page';

export type StoryboardEdgeKind = 'required' | 'optional' | 'branch';

export type StoryboardActiveMode =
  | 'arc_flow'
  | 'investigation'
  | 'session_prep'
  | 'continuity';

export interface StoryboardVisibilityFilters {
  collapseByArc?: string[];
  hideCompletedScenes?: boolean;
  onlyReachable?: boolean;
  factionPageIds?: string[];
  sessionId?: string;
  playerRelevancePageIds?: string[];
  isolateInvestigationPath?: string;
  onlyPressureLinked?: boolean;
  narrativeWeightMin?: 'minor' | 'major' | 'critical';
  beatTypes?: SceneBeatType[];
}

export interface StoryboardViewNode {
  entityType: StoryboardNodeEntityType;
  entityId: string;
  x: number;
  y: number;
  laneId?: string;
  collapsed?: boolean;
}

export interface StoryboardViewEdge {
  sourceId: string;
  targetId: string;
  edgeKind: StoryboardEdgeKind;
  label?: string;
}

export interface StoryboardViewLane {
  id: string;
  label: string;
  actIndex?: number;
  collapsed?: boolean;
}

export interface StoryboardViewAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  linkedEntityIds?: string[];
}

export interface StoryboardViewV1 {
  version: typeof STORYBOARD_VIEW_VERSION;
  nodes: StoryboardViewNode[];
  edges: StoryboardViewEdge[];
  lanes: StoryboardViewLane[];
  annotations: StoryboardViewAnnotation[];
  visibility: StoryboardVisibilityFilters;
  activeMode: StoryboardActiveMode;
}

export interface StoryboardProjectedNode extends StoryboardViewNode {
  title: string;
  beatType?: string | null;
  narrativeWeight?: string;
  sceneStatus?: string;
  questStatus?: string | null;
  threadKind?: string | null;
  codexType?: string | null;
  missing: boolean;
  continuityRiskCount: number;
}

export interface StoryboardProjection {
  layout: StoryboardViewV1;
  nodes: StoryboardProjectedNode[];
  edges: StoryboardProjectedEdge[];
  modeLegend: string;
  continuityIssues: ContinuityIssue[];
}

export function emptyStoryboardView(): StoryboardViewV1 {
  return {
    version: STORYBOARD_VIEW_VERSION,
    nodes: [],
    edges: [],
    lanes: [],
    annotations: [],
    visibility: {},
    activeMode: 'arc_flow',
  };
}

export function parseStoryboardView(raw: unknown): StoryboardViewV1 {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyStoryboardView();
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== STORYBOARD_VIEW_VERSION) {
    return emptyStoryboardView();
  }

  const nodes: StoryboardViewNode[] = [];
  if (Array.isArray(obj.nodes)) {
    for (const entry of obj.nodes) {
      if (!entry || typeof entry !== 'object') continue;
      const n = entry as Record<string, unknown>;
      if (typeof n.entityId !== 'string' || typeof n.entityType !== 'string') continue;
      if (typeof n.x !== 'number' || typeof n.y !== 'number') continue;
      nodes.push({
        entityType: n.entityType as StoryboardNodeEntityType,
        entityId: n.entityId,
        x: n.x,
        y: n.y,
        laneId: typeof n.laneId === 'string' ? n.laneId : undefined,
        collapsed: n.collapsed === true,
      });
    }
  }

  const edges: StoryboardViewEdge[] = [];
  if (Array.isArray(obj.edges)) {
    for (const entry of obj.edges) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.sourceId !== 'string' || typeof e.targetId !== 'string') continue;
      const edgeKind =
        e.edgeKind === 'optional' || e.edgeKind === 'branch' ? e.edgeKind : 'required';
      edges.push({
        sourceId: e.sourceId,
        targetId: e.targetId,
        edgeKind,
        label: typeof e.label === 'string' ? e.label : undefined,
      });
    }
  }

  const lanes: StoryboardViewLane[] = [];
  if (Array.isArray(obj.lanes)) {
    for (const entry of obj.lanes) {
      if (!entry || typeof entry !== 'object') continue;
      const l = entry as Record<string, unknown>;
      if (typeof l.id !== 'string' || typeof l.label !== 'string') continue;
      lanes.push({
        id: l.id,
        label: l.label,
        actIndex: typeof l.actIndex === 'number' ? l.actIndex : undefined,
        collapsed: l.collapsed === true,
      });
    }
  }

  const annotations: StoryboardViewAnnotation[] = [];
  if (Array.isArray(obj.annotations)) {
    for (const entry of obj.annotations) {
      if (!entry || typeof entry !== 'object') continue;
      const a = entry as Record<string, unknown>;
      if (typeof a.id !== 'string' || typeof a.text !== 'string') continue;
      if (typeof a.x !== 'number' || typeof a.y !== 'number') continue;
      annotations.push({
        id: a.id,
        x: a.x,
        y: a.y,
        text: a.text,
        linkedEntityIds: Array.isArray(a.linkedEntityIds)
          ? a.linkedEntityIds.filter((id): id is string => typeof id === 'string')
          : undefined,
      });
    }
  }

  const visibility: StoryboardVisibilityFilters = {};
  if (obj.visibility && typeof obj.visibility === 'object' && !Array.isArray(obj.visibility)) {
    const v = obj.visibility as Record<string, unknown>;
    if (Array.isArray(v.collapseByArc)) {
      visibility.collapseByArc = v.collapseByArc.filter((id): id is string => typeof id === 'string');
    }
    if (v.hideCompletedScenes === true) visibility.hideCompletedScenes = true;
    if (v.onlyReachable === true) visibility.onlyReachable = true;
    if (Array.isArray(v.factionPageIds)) {
      visibility.factionPageIds = v.factionPageIds.filter((id): id is string => typeof id === 'string');
    }
    if (typeof v.sessionId === 'string') visibility.sessionId = v.sessionId;
    if (Array.isArray(v.playerRelevancePageIds)) {
      visibility.playerRelevancePageIds = v.playerRelevancePageIds.filter(
        (id): id is string => typeof id === 'string',
      );
    }
    if (typeof v.isolateInvestigationPath === 'string') {
      visibility.isolateInvestigationPath = v.isolateInvestigationPath;
    }
    if (v.onlyPressureLinked === true) visibility.onlyPressureLinked = true;
    if (
      v.narrativeWeightMin === 'minor' ||
      v.narrativeWeightMin === 'major' ||
      v.narrativeWeightMin === 'critical'
    ) {
      visibility.narrativeWeightMin = v.narrativeWeightMin;
    }
    if (Array.isArray(v.beatTypes)) {
      const beatTypes = normalizeSceneBeatTypeFilter(v.beatTypes);
      if (beatTypes.length > 0) visibility.beatTypes = beatTypes;
    }
  }

  const activeModeRaw = obj.activeMode;
  const activeMode: StoryboardActiveMode =
    activeModeRaw === 'investigation' ||
    activeModeRaw === 'session_prep' ||
    activeModeRaw === 'continuity'
      ? activeModeRaw
      : 'arc_flow';

  return {
    version: STORYBOARD_VIEW_VERSION,
    nodes,
    edges,
    lanes,
    annotations,
    visibility,
    activeMode,
  };
}

export type StoryboardEntityRecord = {
  title: string;
  entityType?: StoryboardNodeEntityType;
  beatType?: string | null;
  narrativeWeight?: string;
  sceneStatus?: string;
  questStatus?: string | null;
  threadKind?: string | null;
  codexType?: string | null;
};

export type StoryboardEntityLookup = Map<string, StoryboardEntityRecord>;

export function pruneStaleLayoutNodes(
  layout: StoryboardViewV1,
  validEntityIds: Set<string>,
): StoryboardViewV1 {
  return {
    ...layout,
    nodes: layout.nodes.filter((node) => validEntityIds.has(node.entityId)),
  };
}

/** Strip deprecated semantic edges before persisting layout chrome. */
export function sanitizeLayoutForSave(layout: StoryboardViewV1): StoryboardViewV1 {
  return {
    ...layout,
    edges: [],
  };
}

export function buildStoryboardProjection(input: {
  layout: StoryboardViewV1;
  entities: StoryboardEntityLookup;
  entityGraphEdges?: readonly EntityGraphEdge[];
  continuityIssues?: ContinuityIssue[];
  pressureLinkedIds?: Set<string>;
  /** Precomputed arc ancestry for collapseByArc — O(1) lookup per scene node. */
  ancestryByEntityId?: Record<string, string[]>;
}): StoryboardProjection {
  const {
    layout,
    entities,
    entityGraphEdges = [],
    continuityIssues = [],
    pressureLinkedIds,
    ancestryByEntityId = {},
  } = input;
  const issuesByEntity = new Map<string, number>();
  for (const issue of continuityIssues) {
    const ids = [
      ...(issue.pageId ? [issue.pageId] : []),
      ...(issue.relatedPageId ? [issue.relatedPageId] : []),
      ...(issue.relatedPageIds ?? []),
    ];
    for (const id of ids) {
      issuesByEntity.set(id, (issuesByEntity.get(id) ?? 0) + 1);
    }
  }

  const filters = layout.visibility;
  let nodes = layout.nodes.map((node) => {
    const entity = entities.get(node.entityId);
    const missing = !entity;
    return {
      ...node,
      title: entity?.title ?? 'Missing entity',
      beatType: entity?.beatType ?? null,
      narrativeWeight: entity?.narrativeWeight,
      sceneStatus: entity?.sceneStatus,
      questStatus: entity?.questStatus ?? null,
      threadKind: entity?.threadKind ?? null,
      codexType: entity?.codexType ?? null,
      missing,
      continuityRiskCount: issuesByEntity.get(node.entityId) ?? 0,
    };
  });

  if (filters.hideCompletedScenes) {
    nodes = nodes.filter((n) => n.sceneStatus !== 'PLAYED');
  }
  if (filters.onlyPressureLinked && pressureLinkedIds) {
    nodes = nodes.filter((n) => pressureLinkedIds.has(n.entityId));
  }
  if (filters.narrativeWeightMin) {
    const minRank = weightRank(filters.narrativeWeightMin);
    nodes = nodes.filter((n) => weightRank(n.narrativeWeight) >= minRank);
  }
  if (filters.beatTypes && filters.beatTypes.length > 0) {
    const allowed = new Set(filters.beatTypes);
    nodes = nodes.filter((n) => {
      if (!n.beatType) return false;
      return allowed.has(n.beatType as SceneBeatType);
    });
  }
  if (filters.collapseByArc && filters.collapseByArc.length > 0) {
    const allowedArcs = new Set(filters.collapseByArc);
    nodes = nodes.filter((n) => {
      const chain = ancestryByEntityId[n.entityId];
      if (!chain || chain.length === 0) return true;
      return chain.some((arcId) => allowedArcs.has(arcId));
    });
  }

  const collapsedLaneIds = new Set(
    layout.lanes.filter((lane) => lane.collapsed).map((lane) => lane.id),
  );
  if (collapsedLaneIds.size > 0) {
    nodes = nodes.filter((n) => !n.laneId || !collapsedLaneIds.has(n.laneId));
  }

  const visibleIds = new Set(nodes.map((n) => n.entityId));
  const entityTitles = new Map<string, string>();
  for (const node of nodes) {
    entityTitles.set(node.entityId, node.title);
  }

  const activeMode = layout.activeMode;
  const edges = deriveStoryboardEdges({
    activeMode,
    visibleNodeIds: visibleIds,
    entityGraphEdges,
    entityTitles,
  });

  return {
    layout,
    nodes,
    edges,
    modeLegend: buildModeLegend(activeMode),
    continuityIssues,
  };
}

function weightRank(weight?: string | null): number {
  switch (weight) {
    case 'critical':
      return 3;
    case 'major':
      return 2;
    case 'minor':
      return 1;
    default:
      return 2;
  }
}

export function normalizeAdventureSection(raw: unknown): AdventureSection {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'story') {
      return 'board';
    }
    if ((ADVENTURE_SECTIONS as readonly string[]).includes(lower)) {
      return lower as AdventureSection;
    }
  }
  return 'board';
}

export interface StoryboardPreset {
  id: string;
  label: string;
  description: string;
  lanes: StoryboardViewLane[];
  activeMode?: StoryboardActiveMode;
}

/** @deprecated Use StoryboardPreset */
export type StoryboardSessionPreset = StoryboardPreset;

/** Non-destructive storyboard scaffolds — layout chrome only. */
export const STORYBOARD_PRESETS: StoryboardPreset[] = [
  {
    id: 'three-act-campaign',
    label: 'Three-act campaign',
    description: 'Act I setup, Act II confrontation, Act III resolution',
    activeMode: 'arc_flow',
    lanes: [
      { id: 'act-1', label: 'Act I — Setup', actIndex: 0 },
      { id: 'act-2', label: 'Act II — Confrontation', actIndex: 1 },
      { id: 'act-3', label: 'Act III — Resolution', actIndex: 2 },
    ],
  },
  {
    id: 'mystery-investigation',
    label: 'Mystery investigation',
    description: 'Discovery, analysis, and confrontation lanes',
    activeMode: 'investigation',
    lanes: [
      { id: 'discovery', label: 'Discovery', actIndex: 0 },
      { id: 'analysis', label: 'Analysis', actIndex: 1 },
      { id: 'confrontation', label: 'Confrontation', actIndex: 2 },
    ],
  },
  {
    id: 'session-five-beat',
    label: 'Five-beat session',
    description: 'Hook → escalation → choice → fallout → button',
    activeMode: 'session_prep',
    lanes: [
      { id: 'hook', label: 'Hook', actIndex: 0 },
      { id: 'escalation', label: 'Escalation', actIndex: 1 },
      { id: 'choice', label: 'Choice', actIndex: 2 },
      { id: 'fallout', label: 'Fallout', actIndex: 3 },
      { id: 'button', label: 'Button', actIndex: 4 },
    ],
  },
];

/** @deprecated Use STORYBOARD_PRESETS */
export const STORYBOARD_SESSION_PRESETS = STORYBOARD_PRESETS;
