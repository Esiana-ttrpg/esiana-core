/**
 * Layer 5 — phased arc hierarchy projection (O(n) per phase).
 * Campaign Arc → Questline → Quest → Objective tree + scene associations (many-to-many).
 */
import {
  classifyArcContainmentChild,
  isArcMetadataPresent,
  parseArcMetadata,
  validateArcContainment,
  type ArcKind,
  type ArcMetadataFields,
} from './arcMetadata.js';
import { isObjectiveMetadataPresent, parseObjectiveMetadata } from './objectiveMetadata.js';
import { isSceneMetadataPresent, parseSceneMetadata } from './sceneMetadata.js';

export type ArcHierarchyNodeKind =
  | 'campaign_arc'
  | 'questline'
  | 'quest'
  | 'objective'
  | 'scene_ref';

export interface ArcHierarchySceneSlice {
  id: string;
  title: string;
  sceneStatus: string;
  beatType: string | null;
  narrativeWeight: string;
  associatedObjectiveCount: number;
}

export interface ArcHierarchyNode {
  kind: ArcHierarchyNodeKind;
  id: string;
  title: string;
  children: ArcHierarchyNode[];
  arc?: Pick<ArcMetadataFields, 'arcKind' | 'actIndex' | 'pacingTarget'>;
  questStatus?: string;
  objectiveStatus?: string;
}

export type ArcHierarchyWarningKind =
  | 'invalid_arc_containment'
  | 'objective_parent_not_quest'
  | 'dangling_scene_association'
  | 'dangling_objective_association';

export interface ArcHierarchyWarning {
  kind: ArcHierarchyWarningKind;
  message: string;
  entityIds: string[];
}

export interface ArcHierarchyProjection {
  roots: ArcHierarchyNode[];
  scenesById: Record<string, ArcHierarchySceneSlice>;
  orphans: {
    quests: Array<{ id: string; title: string }>;
    objectives: Array<{ id: string; title: string }>;
    scenes: Array<{ id: string; title: string }>;
  };
  ancestryByEntityId: Record<string, string[]>;
  warnings: ArcHierarchyWarning[];
  sceneObjectiveCounts: Record<string, number>;
}

export interface ArcHierarchyInputRow {
  id: string;
  title: string;
  parentId: string | null;
  metadata: unknown;
}

export interface ArcHierarchyInput {
  questsRootId: string;
  questRows: ArcHierarchyInputRow[];
  sceneRows: ArcHierarchyInputRow[];
}

function isQuestLikeMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.questStatus !== undefined ||
    raw.questType !== undefined ||
    raw.boardOrder !== undefined
  );
}

interface NormalizedEntity {
  id: string;
  title: string;
  parentId: string | null;
  metadata: unknown;
  isArc: boolean;
  arc: ArcMetadataFields;
  isQuest: boolean;
  isObjective: boolean;
}

interface NormalizedState {
  entitiesById: Map<string, NormalizedEntity>;
  sceneRowMetadata: Map<string, unknown>;
  objectivesByQuestId: Map<string, string[]>;
  scenesByObjectiveId: Map<string, string[]>;
  scenesByQuestIdOnly: Map<string, string[]>;
  scenesById: Map<string, ArcHierarchySceneSlice>;
  questIdsInArcOverlay: Set<string>;
  childToArcParents: Map<string, string[]>;
}

function phase1NormalizeEntities(input: ArcHierarchyInput): NormalizedState {
  const entitiesById = new Map<string, NormalizedEntity>();
  const sceneRowMetadata = new Map<string, unknown>();
  const objectivesByQuestId = new Map<string, string[]>();
  const scenesByObjectiveId = new Map<string, string[]>();
  const scenesByQuestIdOnly = new Map<string, string[]>();
  const scenesById = new Map<string, ArcHierarchySceneSlice>();
  const sceneObjectiveCounts = new Map<string, number>();

  for (const row of input.questRows) {
    const isArc = isArcMetadataPresent(row.metadata);
    const isObjective = isObjectiveMetadataPresent(row.metadata);
    const isQuest = !isArc && !isObjective && isQuestLikeMetadata(row.metadata);
    entitiesById.set(row.id, {
      id: row.id,
      title: row.title,
      parentId: row.parentId,
      metadata: row.metadata,
      isArc,
      arc: parseArcMetadata(row.metadata),
      isQuest,
      isObjective,
    });
    if (isObjective && row.parentId) {
      const list = objectivesByQuestId.get(row.parentId) ?? [];
      list.push(row.id);
      objectivesByQuestId.set(row.parentId, list);
    }
  }

  for (const row of input.sceneRows) {
    if (!isSceneMetadataPresent(row.metadata)) continue;
    const scene = parseSceneMetadata(row.metadata);
    scenesById.set(row.id, {
      id: row.id,
      title: row.title,
      sceneStatus: scene.sceneStatus,
      beatType: scene.beatType,
      narrativeWeight: scene.narrativeWeight,
      associatedObjectiveCount: 0,
    });
    sceneRowMetadata.set(row.id, row.metadata);
    const objectiveIds = scene.linkedObjectivePageIds;
    if (objectiveIds.length > 0) {
      for (const objectiveId of objectiveIds) {
        const list = scenesByObjectiveId.get(objectiveId) ?? [];
        list.push(row.id);
        scenesByObjectiveId.set(objectiveId, list);
        sceneObjectiveCounts.set(row.id, (sceneObjectiveCounts.get(row.id) ?? 0) + 1);
      }
    } else {
      for (const questId of scene.linkedQuestPageIds) {
        const list = scenesByQuestIdOnly.get(questId) ?? [];
        list.push(row.id);
        scenesByQuestIdOnly.set(questId, list);
      }
    }
  }

  for (const [sceneId, count] of sceneObjectiveCounts) {
    const slice = scenesById.get(sceneId);
    if (slice) slice.associatedObjectiveCount = count;
  }

  return {
    entitiesById,
    sceneRowMetadata,
    objectivesByQuestId,
    scenesByObjectiveId,
    scenesByQuestIdOnly,
    scenesById,
    questIdsInArcOverlay: new Set<string>(),
    childToArcParents: new Map<string, string[]>(),
  };
}

function phase2BuildArcOverlays(state: NormalizedState): void {
  for (const entity of state.entitiesById.values()) {
    if (!entity.isArc) continue;
    for (const childId of entity.arc.containedPageIds) {
      const parents = state.childToArcParents.get(childId) ?? [];
      parents.push(entity.id);
      state.childToArcParents.set(childId, parents);
      const child = state.entitiesById.get(childId);
      if (child?.isQuest) {
        state.questIdsInArcOverlay.add(childId);
      }
    }
  }
}

function makeSceneRefNodes(sceneIds: string[]): ArcHierarchyNode[] {
  const nodes: ArcHierarchyNode[] = [];
  const seen = new Set<string>();
  for (const sceneId of sceneIds) {
    if (seen.has(sceneId)) continue;
    seen.add(sceneId);
    nodes.push({ kind: 'scene_ref', id: sceneId, title: '', children: [] });
  }
  return nodes;
}

function buildObjectiveNodes(
  questId: string,
  state: NormalizedState,
): ArcHierarchyNode[] {
  const objectiveIds = state.objectivesByQuestId.get(questId) ?? [];
  return objectiveIds.map((objectiveId) => {
    const entity = state.entitiesById.get(objectiveId);
    const objective = parseObjectiveMetadata(entity?.metadata);
    const sceneIds = state.scenesByObjectiveId.get(objectiveId) ?? [];
    return {
      kind: 'objective' as const,
      id: objectiveId,
      title: entity?.title ?? 'Objective',
      objectiveStatus: objective.objectiveStatus,
      children: makeSceneRefNodes(sceneIds),
    };
  });
}

function buildQuestNode(questId: string, state: NormalizedState): ArcHierarchyNode | null {
  const entity = state.entitiesById.get(questId);
  if (!entity) return null;
  const raw = entity.metadata as Record<string, unknown>;
  const questStatus =
    typeof raw.questStatus === 'string' ? raw.questStatus : undefined;
  const objectiveNodes = buildObjectiveNodes(questId, state);
  const questOnlyScenes = state.scenesByQuestIdOnly.get(questId) ?? [];
  return {
    kind: 'quest',
    id: questId,
    title: entity.title,
    questStatus,
    children: [...objectiveNodes, ...makeSceneRefNodes(questOnlyScenes)],
  };
}

function buildArcNode(arcId: string, state: NormalizedState): ArcHierarchyNode | null {
  const entity = state.entitiesById.get(arcId);
  if (!entity?.isArc) return null;
  const children: ArcHierarchyNode[] = [];
  for (const childId of entity.arc.containedPageIds) {
    const child = state.entitiesById.get(childId);
    if (!child) continue;
    if (child.isArc && child.arc.arcKind === 'questline') {
      const questlineNode = buildArcNode(childId, state);
      if (questlineNode) children.push(questlineNode);
    } else if (child.isQuest) {
      const questNode = buildQuestNode(childId, state);
      if (questNode) children.push(questNode);
    }
  }
  return {
    kind: entity.arc.arcKind === 'questline' ? 'questline' : 'campaign_arc',
    id: arcId,
    title: entity.title,
    arc: {
      arcKind: entity.arc.arcKind,
      actIndex: entity.arc.actIndex,
      pacingTarget: entity.arc.pacingTarget,
    },
    children,
  };
}

function phase3To4BuildTree(state: NormalizedState): ArcHierarchyNode[] {
  const roots: ArcHierarchyNode[] = [];
  for (const entity of state.entitiesById.values()) {
    if (!entity.isArc || entity.arc.arcKind !== 'campaign_arc') continue;
    const node = buildArcNode(entity.id, state);
    if (node) roots.push(node);
  }
  return roots;
}

function phase5ResolveOrphans(state: NormalizedState): ArcHierarchyProjection['orphans'] {
  const orphans: ArcHierarchyProjection['orphans'] = {
    quests: [],
    objectives: [],
    scenes: [],
  };
  for (const entity of state.entitiesById.values()) {
    if (entity.isQuest && !state.questIdsInArcOverlay.has(entity.id)) {
      orphans.quests.push({ id: entity.id, title: entity.title });
    }
    if (entity.isObjective) {
      const parent = entity.parentId ? state.entitiesById.get(entity.parentId) : null;
      if (!parent?.isQuest) {
        orphans.objectives.push({ id: entity.id, title: entity.title });
      }
    }
  }
  for (const [sceneId, slice] of state.scenesById) {
    let attached = false;
    for (const ids of state.scenesByObjectiveId.values()) {
      if (ids.includes(sceneId)) {
        attached = true;
        break;
      }
    }
    if (!attached) {
      for (const ids of state.scenesByQuestIdOnly.values()) {
        if (ids.includes(sceneId)) {
          attached = true;
          break;
        }
      }
    }
    if (!attached) orphans.scenes.push({ id: sceneId, title: slice.title });
  }
  return orphans;
}

function phase6ComputeAncestry(
  roots: ArcHierarchyNode[],
  state: NormalizedState,
): Record<string, string[]> {
  const ancestryByEntityId: Record<string, string[]> = {};

  const walk = (node: ArcHierarchyNode, arcChain: string[]) => {
    const chain =
      node.kind === 'campaign_arc' || node.kind === 'questline'
        ? [...arcChain, node.id]
        : arcChain;
    if (node.kind === 'scene_ref') {
      ancestryByEntityId[node.id] = chain;
    } else {
      ancestryByEntityId[node.id] = chain;
    }
    for (const child of node.children) walk(child, chain);
  };
  for (const root of roots) walk(root, []);

  for (const questId of state.questIdsInArcOverlay) {
    if (!ancestryByEntityId[questId]) {
      const parents = state.childToArcParents.get(questId) ?? [];
      ancestryByEntityId[questId] = parents;
    }
  }

  return ancestryByEntityId;
}

function phase7EmitWarnings(state: NormalizedState): ArcHierarchyWarning[] {
  const warnings: ArcHierarchyWarning[] = [];

  for (const entity of state.entitiesById.values()) {
    if (!entity.isArc) continue;
    for (const childId of entity.arc.containedPageIds) {
      const child = state.entitiesById.get(childId);
      if (!child) {
        warnings.push({
          kind: 'invalid_arc_containment',
          message: 'Arc references a missing page',
          entityIds: [entity.id, childId],
        });
        continue;
      }
      const childKind = classifyArcContainmentChild(child.metadata, child.isQuest);
      if (!validateArcContainment(entity.arc.arcKind, childKind)) {
        warnings.push({
          kind: 'invalid_arc_containment',
          message: `Invalid ${entity.arc.arcKind} containment`,
          entityIds: [entity.id, childId],
        });
      }
    }
  }

  for (const entity of state.entitiesById.values()) {
    if (!entity.isObjective) continue;
    const parent = entity.parentId ? state.entitiesById.get(entity.parentId) : null;
    if (!parent?.isQuest) {
      warnings.push({
        kind: 'objective_parent_not_quest',
        message: 'Objective wiki parent is not a quest page',
        entityIds: [entity.id],
      });
    }
  }

  for (const [sceneId, slice] of state.scenesById) {
    const meta = state.sceneRowMetadata.get(sceneId);
    const scene = parseSceneMetadata(meta);
    for (const objectiveId of scene.linkedObjectivePageIds) {
      if (!state.entitiesById.has(objectiveId)) {
        warnings.push({
          kind: 'dangling_objective_association',
          message: 'Scene references a missing objective',
          entityIds: [sceneId, objectiveId],
        });
      }
    }
    if (slice.associatedObjectiveCount === 0) {
      for (const questId of scene.linkedQuestPageIds) {
        if (!state.entitiesById.has(questId)) {
          warnings.push({
            kind: 'dangling_scene_association',
            message: 'Scene references a missing quest',
            entityIds: [sceneId, questId],
          });
        }
      }
    }
  }

  return warnings;
}

export function buildArcHierarchyProjection(input: ArcHierarchyInput): ArcHierarchyProjection {
  const state = phase1NormalizeEntities(input);
  phase2BuildArcOverlays(state);
  const roots = phase3To4BuildTree(state);
  const orphans = phase5ResolveOrphans(state);
  const ancestryByEntityId = phase6ComputeAncestry(roots, state);
  const warnings = phase7EmitWarnings(state);

  const scenesById: Record<string, ArcHierarchySceneSlice> = {};
  const sceneObjectiveCounts: Record<string, number> = {};
  for (const [id, slice] of state.scenesById) {
    scenesById[id] = slice;
    sceneObjectiveCounts[id] = slice.associatedObjectiveCount;
  }

  return {
    roots,
    scenesById,
    orphans,
    ancestryByEntityId,
    warnings,
    sceneObjectiveCounts,
  };
}

/** O(1) arc ancestry check for storyboard collapseByArc filter. */
export function sceneArcAncestryIntersects(
  sceneId: string,
  allowedArcIds: Set<string>,
  ancestryByEntityId: Record<string, string[]>,
  scenesByObjectiveId: Map<string, string[]>,
  sceneRows: ArcHierarchyInputRow[],
): boolean {
  if (allowedArcIds.size === 0) return true;
  const scene = sceneRows.find((r) => r.id === sceneId);
  if (!scene) return true;
  const meta = parseSceneMetadata(scene.metadata);
  for (const objectiveId of meta.linkedObjectivePageIds) {
    const chain = ancestryByEntityId[objectiveId];
    if (chain?.some((arcId) => allowedArcIds.has(arcId))) return true;
  }
  for (const questId of meta.linkedQuestPageIds) {
    const chain = ancestryByEntityId[questId];
    if (chain?.some((arcId) => allowedArcIds.has(arcId))) return true;
  }
  return false;
}

export function resolveArcKindFromMetadata(metadata: unknown): ArcKind | null {
  if (!isArcMetadataPresent(metadata)) return null;
  return parseArcMetadata(metadata).arcKind;
}
