/**
 * Layer 5 — derive storyboard edges from entity graph with explainable provenance.
 */
import {
  EntityRelationKinds,
  type EntityGraphEdge,
  type EntityRelationKind,
} from './entityGraph.js';
import type { StoryboardActiveMode } from './storyboardProjection.js';

export type StoryboardDerivationDomain =
  | 'wiki_metadata'
  | 'entity_graph'
  | 'calendar'
  | 'manual';

export interface StoryboardEdgeProvenance {
  derivationSource: string;
  derivationDomain: StoryboardDerivationDomain;
  explanationTemplate: string;
  editable: boolean;
  editField?: string;
}

/** Canonical metadata field → human explanation for each relation kind used on the storyboard. */
export const STORYBOARD_EDGE_PROVENANCE: Record<string, StoryboardEdgeProvenance> = {
  [EntityRelationKinds.SCENE_FOLLOWS]: {
    derivationSource: 'followsScenePageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} follows {target} in scene sequence',
    editable: true,
    editField: 'followsScenePageIds',
  },
  [EntityRelationKinds.SCENE_THREAD]: {
    derivationSource: 'linkedThreadPageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} links thread {target}',
    editable: false,
  },
  [EntityRelationKinds.SCENE_CLUE]: {
    derivationSource: 'linkedCluePageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} surfaces clue {target}',
    editable: false,
  },
  [EntityRelationKinds.SCENE_QUEST]: {
    derivationSource: 'linkedQuestPageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} tied to quest {target}',
    editable: false,
  },
  [EntityRelationKinds.OBJECTIVE_SCENE]: {
    derivationSource: 'linkedObjectivePageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} advances objective {target}',
    editable: false,
  },
  [EntityRelationKinds.SCENE_PARTICIPANT]: {
    derivationSource: 'participantPageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{target} participates in {source}',
    editable: false,
  },
  [EntityRelationKinds.SCENE_LOCATION]: {
    derivationSource: 'locationPageId',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: '{source} set at {target}',
    editable: false,
  },
  [EntityRelationKinds.QUEST_OBJECTIVE]: {
    derivationSource: 'parentId',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: 'Quest {source} contains objective {target}',
    editable: false,
  },
  [EntityRelationKinds.THREAD_RELATED]: {
    derivationSource: 'relatedPageIds',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: 'Thread {source} related to {target}',
    editable: false,
  },
  [EntityRelationKinds.THREAD_PAYOFF]: {
    derivationSource: 'payoffPageId',
    derivationDomain: 'wiki_metadata',
    explanationTemplate: 'Thread {source} payoff at {target}',
    editable: false,
  },
};

export const STORYBOARD_MODE_RELATION_KINDS: Record<
  StoryboardActiveMode,
  readonly EntityRelationKind[]
> = {
  arc_flow: [EntityRelationKinds.SCENE_FOLLOWS],
  investigation: [
    EntityRelationKinds.SCENE_CLUE,
    EntityRelationKinds.SCENE_THREAD,
    EntityRelationKinds.THREAD_RELATED,
    EntityRelationKinds.THREAD_PAYOFF,
  ],
  session_prep: [
    EntityRelationKinds.SCENE_FOLLOWS,
    EntityRelationKinds.SCENE_QUEST,
    EntityRelationKinds.OBJECTIVE_SCENE,
    EntityRelationKinds.QUEST_OBJECTIVE,
    EntityRelationKinds.SCENE_PARTICIPANT,
    EntityRelationKinds.SCENE_LOCATION,
  ],
  continuity: [
    EntityRelationKinds.SCENE_FOLLOWS,
    EntityRelationKinds.SCENE_THREAD,
    EntityRelationKinds.SCENE_CLUE,
    EntityRelationKinds.SCENE_QUEST,
    EntityRelationKinds.OBJECTIVE_SCENE,
    EntityRelationKinds.SCENE_PARTICIPANT,
    EntityRelationKinds.SCENE_LOCATION,
  ],
};

export const STORYBOARD_MODE_LABELS: Record<StoryboardActiveMode, string> = {
  arc_flow: 'Arc flow',
  investigation: 'Investigation',
  session_prep: 'Session prep',
  continuity: 'Continuity',
};

export interface StoryboardProjectedEdge {
  sourceId: string;
  targetId: string;
  relationKind: EntityRelationKind;
  derivationSource: string;
  derivationDomain: StoryboardDerivationDomain;
  explanation: string;
  activeMode: StoryboardActiveMode;
  editable: boolean;
  editField?: string;
  edgeKind: 'required' | 'optional' | 'branch';
}

function graphNodeId(edge: EntityGraphEdge, end: 'source' | 'target'): string {
  return end === 'source' ? edge.source.entityId : edge.target.entityId;
}

function formatExplanation(
  template: string,
  sourceTitle: string,
  targetTitle: string,
): string {
  return template.replace('{source}', sourceTitle).replace('{target}', targetTitle);
}

function edgeVisualKind(relationKind: EntityRelationKind): 'required' | 'optional' | 'branch' {
  if (relationKind === EntityRelationKinds.SCENE_FOLLOWS) return 'required';
  if (
    relationKind === EntityRelationKinds.THREAD_PAYOFF ||
    relationKind === EntityRelationKinds.OBJECTIVE_SCENE
  ) {
    return 'branch';
  }
  return 'optional';
}

export function buildModeLegend(activeMode: StoryboardActiveMode): string {
  const kinds = STORYBOARD_MODE_RELATION_KINDS[activeMode];
  const labels = kinds
    .map((kind) => {
      const prov = STORYBOARD_EDGE_PROVENANCE[kind];
      return prov ? `${kind} (from ${prov.derivationSource})` : kind;
    })
    .join(', ');
  return `${STORYBOARD_MODE_LABELS[activeMode]} mode shows: ${labels}`;
}

export function deriveStoryboardEdges(input: {
  activeMode: StoryboardActiveMode;
  visibleNodeIds: Set<string>;
  entityGraphEdges: readonly EntityGraphEdge[];
  entityTitles: Map<string, string>;
}): StoryboardProjectedEdge[] {
  const allowedKinds = new Set(STORYBOARD_MODE_RELATION_KINDS[input.activeMode]);
  const seen = new Set<string>();
  const result: StoryboardProjectedEdge[] = [];

  for (const edge of input.entityGraphEdges) {
    if (!allowedKinds.has(edge.relationKind)) continue;

    const sourceId = graphNodeId(edge, 'source');
    const targetId = graphNodeId(edge, 'target');
    if (!input.visibleNodeIds.has(sourceId) || !input.visibleNodeIds.has(targetId)) continue;

    const dedupeKey = `${edge.relationKind}:${sourceId}:${targetId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const provenance = STORYBOARD_EDGE_PROVENANCE[edge.relationKind];
    if (!provenance) continue;

    const sourceTitle = input.entityTitles.get(sourceId) ?? sourceId;
    const targetTitle = input.entityTitles.get(targetId) ?? targetId;

    result.push({
      sourceId,
      targetId,
      relationKind: edge.relationKind,
      derivationSource: provenance.derivationSource,
      derivationDomain: provenance.derivationDomain,
      explanation: formatExplanation(
        provenance.explanationTemplate,
        sourceTitle,
        targetTitle,
      ),
      activeMode: input.activeMode,
      editable: provenance.editable,
      editField: provenance.editField,
      edgeKind: edgeVisualKind(edge.relationKind),
    });
  }

  return result;
}

export function assertStoryboardEdgeProvenance(edges: StoryboardProjectedEdge[]): void {
  for (const edge of edges) {
    if (!edge.relationKind) throw new Error('edge missing relationKind');
    if (!edge.derivationSource) throw new Error('edge missing derivationSource');
    if (!edge.explanation) throw new Error('edge missing explanation');
  }
}
