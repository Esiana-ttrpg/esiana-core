/**
 * Layer 4 — circular dependency detection (SCC-based, canonical fingerprints).
 */
import type { ContentRevelationState } from './contentPresence.js';
import { ContentRevelationStates } from './contentPresence.js';
import type {
  ContinuityIssueCategory,
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  type EntityGraphEdge,
} from './entityGraph.js';
import { findCycles } from './entityGraphQuery.js';
import { dedupeBranchEdges } from './narrativeBranchAnalysis.js';
import type { BranchCondition, NarrativeBranchGraph } from './narrativeBranch.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';

export const GLOBAL_NARRATIVE_CYCLE_CAP = 50;
export const MAX_CYCLE_PARTICIPANTS = 25;

export type NarrativeUnlockNodeKind =
  | 'quest'
  | 'open_thread'
  | 'calendar_event'
  | 'scene'
  | 'clue';

export type UnlockDependencyEdge = {
  fromId: string;
  toId: string;
  fromKind: NarrativeUnlockNodeKind;
  toKind: NarrativeUnlockNodeKind;
  source:
    | 'lifecycle_condition'
    | 'consequence_discover'
    | 'calendar_event_condition';
};

export type CalendarPrerequisiteCycle = {
  eventIds: string[];
  canonicalKey: string;
};

export type NarrativeCircularDependencyFinding = {
  ruleId: string;
  issueType: ContinuityIssueType;
  issueCategory: ContinuityIssueCategory;
  severity: ContinuityIssueSeverity;
  subjectPageId?: string;
  participantIds: string[];
  participantKinds?: NarrativeUnlockNodeKind[];
  participantLabels?: Record<string, string>;
  representativePath?: string[];
  summarized?: boolean;
  messageParts: Record<string, string>;
};

export type DetectUnlockCyclesInput = {
  subjects: readonly NarrativeDeadEndScanRow[];
  narrativeSubjectIds: ReadonlySet<string>;
  pagePresenceById: ReadonlyMap<string, ContentRevelationState>;
  maxParticipants?: number;
};

export type DetectBranchCyclesInput = {
  subjects: readonly NarrativeDeadEndScanRow[];
};

function serializeCycle(nodes: readonly string[]): string {
  return nodes.join('>');
}

/** Rotate cycle to lex-min start, compare forward vs reverse, return canonical key. */
export function canonicalizeCycle(nodeIds: readonly string[]): string {
  if (nodeIds.length === 0) return '';

  let cycle = [...nodeIds];
  if (cycle.length > 1 && cycle[0] === cycle[cycle.length - 1]) {
    cycle = cycle.slice(0, -1);
  }
  if (cycle.length === 0) return '';
  if (cycle.length === 1) return cycle[0];

  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIdx]) minIdx = i;
  }
  const forward = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];

  const reversed = [...cycle].reverse();
  let minIdxRev = 0;
  for (let i = 1; i < reversed.length; i++) {
    if (reversed[i] < reversed[minIdxRev]) minIdxRev = i;
  }
  const reverseRotated = [...reversed.slice(minIdxRev), ...reversed.slice(0, minIdxRev)];

  const forwardKey = serializeCycle(forward);
  const reverseKey = serializeCycle(reverseRotated);
  return forwardKey <= reverseKey ? forwardKey : reverseKey;
}

/** Ordered participant list derived from canonical key (for UI). */
export function canonicalCycleParticipants(nodeIds: readonly string[]): string[] {
  const key = canonicalizeCycle(nodeIds);
  if (!key) return [];
  if (!key.includes('>')) return [key];
  return key.split('>');
}

function subjectKindForRow(row: NarrativeDeadEndScanRow): NarrativeUnlockNodeKind {
  return row.subjectKind === 'quest' ? 'quest' : 'open_thread';
}

function buildAdjacency(edges: readonly { fromId: string; toId: string }[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
    return adj.get(id)!;
  };
  for (const edge of edges) {
    ensure(edge.fromId).push(edge.toId);
    ensure(edge.toId);
    ensure(edge.fromId);
  }
  return adj;
}

function hasSelfLoop(nodeId: string, adjacency: Map<string, string[]>): boolean {
  return (adjacency.get(nodeId) ?? []).includes(nodeId);
}

/** Tarjan SCC — returns components in discovery order. */
export function tarjanStronglyConnectedComponents(
  adjacency: Map<string, string[]>,
): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const components: string[][] = [];

  const strongConnect = (node: string): void => {
    indices.set(node, index);
    lowlinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(next)!));
      } else if (onStack.has(next)) {
        lowlinks.set(node, Math.min(lowlinks.get(node)!, indices.get(next)!));
      }
    }

    if (lowlinks.get(node) === indices.get(node)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== node);
      components.push(component);
    }
  };

  for (const node of adjacency.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return components;
}

function isCyclicComponent(component: string[], adjacency: Map<string, string[]>): boolean {
  if (component.length > 1) return true;
  if (component.length === 1) return hasSelfLoop(component[0], adjacency);
  return false;
}

function buildRepresentativePath(
  participantIds: readonly string[],
  edges: readonly UnlockDependencyEdge[],
): string[] | undefined {
  if (participantIds.length < 2) {
    return participantIds.length === 1 ? [...participantIds] : undefined;
  }

  const participantSet = new Set(participantIds);
  const outEdges = new Map<string, string[]>();
  for (const edge of edges) {
    if (!participantSet.has(edge.fromId) || !participantSet.has(edge.toId)) continue;
    const list = outEdges.get(edge.fromId) ?? [];
    list.push(edge.toId);
    outEdges.set(edge.fromId, list);
  }

  const start = participantIds[0];
  const path = [start];
  const visited = new Set<string>([start]);
  let current = start;

  while (path.length < participantIds.length) {
    const nextCandidates = (outEdges.get(current) ?? []).filter((id) => participantSet.has(id));
    const next = nextCandidates.find((id) => !visited.has(id)) ?? nextCandidates[0];
    if (!next) break;
    path.push(next);
    visited.add(next);
    current = next;
    if (next === start && path.length > 1) break;
  }

  return path.length >= 2 ? path : [...participantIds];
}

function unlockCycleSeverity(
  participantIds: readonly string[],
  participantKinds: readonly NarrativeUnlockNodeKind[],
  pagePresenceById: ReadonlyMap<string, ContentRevelationState>,
): ContinuityIssueSeverity {
  let anyPublished = false;
  for (let i = 0; i < participantIds.length; i++) {
    const kind = participantKinds[i];
    if (kind === 'calendar_event') {
      anyPublished = true;
      continue;
    }
    if (kind === 'scene' || kind === 'clue') continue;
    const presence =
      pagePresenceById.get(participantIds[i]) ?? ContentRevelationStates.REVEALED;
    if (presence !== ContentRevelationStates.DRAFT) {
      anyPublished = true;
    }
  }
  return anyPublished ? 'critical' : 'warning';
}

export function extractUnlockDependencies(
  subjects: readonly NarrativeDeadEndScanRow[],
  narrativeSubjectIds: ReadonlySet<string>,
): UnlockDependencyEdge[] {
  const edges: UnlockDependencyEdge[] = [];

  for (const row of subjects) {
    const dependentKind = subjectKindForRow(row);
    const graph = row.branchGraph;
    if (graph) {
      for (const edge of dedupeBranchEdges(graph.edges)) {
        const condition = edge.condition as BranchCondition | undefined;
        if (!condition) continue;
        if (condition.type === 'lifecycle') {
          const prereqKind = narrativeSubjectIds.has(condition.subjectId)
            ? subjects.find((s) => s.subjectPageId === condition.subjectId)
            : undefined;
          edges.push({
            fromId: condition.subjectId,
            toId: row.subjectPageId,
            fromKind: prereqKind ? subjectKindForRow(prereqKind) : 'quest',
            toKind: dependentKind,
            source: 'lifecycle_condition',
          });
        } else if (condition.type === 'calendar_event') {
          edges.push({
            fromId: condition.eventId,
            toId: row.subjectPageId,
            fromKind: 'calendar_event',
            toKind: dependentKind,
            source: 'calendar_event_condition',
          });
        }
      }
    }

    const rules = row.consequenceRules;
    if (!rules) continue;
    for (const rule of rules.rules) {
      for (const effect of rule.effects) {
        let targetId: string | null = null;
        if (effect.type === 'discover_quest') targetId = effect.questPageId;
        if (effect.type === 'discover_wiki_page') targetId = effect.pageId;
        if (!targetId || !narrativeSubjectIds.has(targetId)) continue;
        const targetRow = subjects.find((s) => s.subjectPageId === targetId);
        edges.push({
          fromId: row.subjectPageId,
          toId: targetId,
          fromKind: subjectKindForRow(row),
          toKind: targetRow ? subjectKindForRow(targetRow) : 'quest',
          source: 'consequence_discover',
        });
      }
    }
  }

  return edges;
}

export function extractCalendarPrerequisiteCycles(
  edges: readonly EntityGraphEdge[],
): CalendarPrerequisiteCycle[] {
  const raw = findCycles(edges, [EntityRelationKinds.CALENDAR_PREREQUISITE]);
  const seen = new Set<string>();
  const cycles: CalendarPrerequisiteCycle[] = [];

  for (const finding of raw) {
    const eventIds = finding.nodeIds.filter(Boolean);
    if (eventIds.length === 0) continue;
    const canonicalKey = canonicalizeCycle(eventIds);
    if (seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);
    cycles.push({
      eventIds: canonicalCycleParticipants(eventIds),
      canonicalKey,
    });
  }

  return cycles;
}

export function detectUnlockCycles(
  input: DetectUnlockCyclesInput,
): NarrativeCircularDependencyFinding[] {
  const deps = extractUnlockDependencies(input.subjects, input.narrativeSubjectIds);
  if (deps.length === 0) return [];

  const adjacency = buildAdjacency(deps);
  const kindById = new Map<string, NarrativeUnlockNodeKind>();
  for (const edge of deps) {
    kindById.set(edge.fromId, edge.fromKind);
    kindById.set(edge.toId, edge.toKind);
  }

  const maxParticipants = input.maxParticipants ?? MAX_CYCLE_PARTICIPANTS;
  const findings: NarrativeCircularDependencyFinding[] = [];
  const seenKeys = new Set<string>();

  for (const component of tarjanStronglyConnectedComponents(adjacency)) {
    if (!isCyclicComponent(component, adjacency)) continue;

    const participantIds = canonicalCycleParticipants(component);
    const canonicalKey = canonicalizeCycle(component);
    if (seenKeys.has(canonicalKey)) continue;
    seenKeys.add(canonicalKey);

    const participantKinds = participantIds.map(
      (id) => kindById.get(id) ?? 'quest',
    );
    const summarized = participantIds.length > maxParticipants;
    const displayIds = summarized
      ? participantIds.slice(0, maxParticipants)
      : participantIds;

    const titleById = new Map<string, string>();
    for (const row of input.subjects) {
      titleById.set(row.subjectPageId, row.subjectTitle);
    }

    const participantLabels: Record<string, string> = {};
    for (const id of displayIds) {
      participantLabels[id] = titleById.get(id) ?? id;
    }

    findings.push({
      ruleId: summarized ? 'unlock_cycle_large_scc' : 'unlock_cycle_scc',
      issueType: 'narrative_unlock_cycle',
      issueCategory: 'system_consistency',
      severity: unlockCycleSeverity(participantIds, participantKinds, input.pagePresenceById),
      participantIds: displayIds,
      participantKinds: participantKinds.slice(0, displayIds.length),
      participantLabels,
      representativePath: buildRepresentativePath(displayIds, deps),
      summarized,
      messageParts: {
        participantCount: String(participantIds.length),
        canonicalCycleKey: canonicalKey,
      },
    });
  }

  return findings;
}

export function detectBranchCycles(
  input: DetectBranchCyclesInput,
): NarrativeCircularDependencyFinding[] {
  const findings: NarrativeCircularDependencyFinding[] = [];
  const seenKeys = new Set<string>();

  for (const row of input.subjects) {
    const graph = row.branchGraph;
    if (!graph) continue;

    const edges = dedupeBranchEdges(graph.edges);
    if (edges.length === 0) continue;

    const adjacency = buildAdjacency(
      edges.map((edge) => ({ fromId: edge.from, toId: edge.to })),
    );
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

    for (const component of tarjanStronglyConnectedComponents(adjacency)) {
      if (!isCyclicComponent(component, adjacency)) continue;

      const participantIds = canonicalCycleParticipants(component);
      const scopedKey = `${row.subjectPageId}:${canonicalizeCycle(component)}`;
      if (seenKeys.has(scopedKey)) continue;
      seenKeys.add(scopedKey);

      const participantLabels: Record<string, string> = {};
      for (const id of participantIds) {
        participantLabels[id] = nodesById.get(id)?.label ?? id;
      }

      findings.push({
        ruleId: 'branch_cycle_scc',
        issueType: 'narrative_branch_cycle',
        issueCategory: 'structural',
        severity: 'warning',
        subjectPageId: row.subjectPageId,
        participantIds,
        representativePath: [...participantIds],
        messageParts: {
          subjectTitle: row.subjectTitle,
          participantCount: String(participantIds.length),
          canonicalCycleKey: canonicalizeCycle(component),
        },
        participantLabels,
      });
    }
  }

  return findings;
}

export function calendarCyclesToFindings(
  cycles: readonly CalendarPrerequisiteCycle[],
  eventTitles: ReadonlyMap<string, string>,
  maxParticipants: number = MAX_CYCLE_PARTICIPANTS,
): NarrativeCircularDependencyFinding[] {
  return cycles.map((cycle) => {
    const summarized = cycle.eventIds.length > maxParticipants;
    const displayIds = summarized
      ? cycle.eventIds.slice(0, maxParticipants)
      : cycle.eventIds;
    const participantLabels: Record<string, string> = {};
    for (const id of displayIds) {
      participantLabels[id] = eventTitles.get(id) ?? id;
    }

    return {
      ruleId: summarized ? 'calendar_prerequisite_large_scc' : 'calendar_prerequisite_scc',
      issueType: 'calendar_prerequisite_cycle',
      issueCategory: 'system_consistency',
      severity: 'warning',
      participantIds: displayIds,
      participantKinds: displayIds.map(() => 'calendar_event' as const),
      participantLabels,
      representativePath: [...displayIds],
      summarized,
      messageParts: {
        participantCount: String(cycle.eventIds.length),
        canonicalCycleKey: cycle.canonicalKey,
      },
    };
  });
}

export function filterFindingsByPageId(
  findings: readonly NarrativeCircularDependencyFinding[],
  filterPageId: string,
  eventWikiPageIds?: ReadonlyMap<string, string | null>,
): NarrativeCircularDependencyFinding[] {
  return findings.filter((finding) => {
    if (finding.subjectPageId === filterPageId) return true;
    if (finding.participantIds.includes(filterPageId)) return true;
    if (eventWikiPageIds) {
      for (const eventId of finding.participantIds) {
        if (eventWikiPageIds.get(eventId) === filterPageId) return true;
      }
    }
    return false;
  });
}

export function applyCycleFindingCap(
  findings: NarrativeCircularDependencyFinding[],
  cap: number = GLOBAL_NARRATIVE_CYCLE_CAP,
): NarrativeCircularDependencyFinding[] {
  if (findings.length <= cap) return findings;
  return findings.slice(0, cap);
}

/** Resolve wiki-page participant ids for cycle UI links. */
export function wikiParticipantIds(finding: NarrativeCircularDependencyFinding): string[] {
  const kinds = finding.participantKinds ?? [];
  return finding.participantIds.filter((id, index) => {
    const kind = kinds[index];
    return kind === 'quest' || kind === 'open_thread' || kind === undefined;
  });
}
