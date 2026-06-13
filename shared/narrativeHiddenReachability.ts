/**
 * Layer 4 — hidden branch activation reachability analysis.
 */
import type { ContentRevelationState } from './contentPresence.js';
import { ContentRevelationStates } from './contentPresence.js';
import type {
  ContinuityIssueCategory,
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import type { BranchCondition } from './narrativeBranch.js';
import { BranchNodeKinds } from './narrativeBranch.js';
import {
  bfsReachable,
  dedupeBranchEdges,
  graphEdgeConditionKey,
  resolveActivationEntryNodeIds,
} from './narrativeBranchAnalysis.js';
import {
  allowedLifecycleTransitions,
  type NarrativeLifecycleState,
} from './narrativeLifecycle.js';
import {
  DEFAULT_STALE_EDGE_WINDOW_MS,
  type NarrativeDeadEndScanRow,
} from './narrativeDeadEnd.js';

export type ActivationConditionIndex = {
  existingPageIds: ReadonlySet<string>;
  lifecycleBySubjectId: ReadonlyMap<string, NarrativeLifecycleState>;
  calendarEventIds: ReadonlySet<string>;
  liveGraphEdges: ReadonlySet<string>;
};

export type HiddenReachabilityFinding = {
  ruleId: string;
  issueCategory: ContinuityIssueCategory;
  issueType: ContinuityIssueType;
  severity: ContinuityIssueSeverity;
  subjectPageId: string;
  branchNodeId?: string;
  messageParts: Record<string, string>;
};

export type DetectHiddenReachabilityInput = {
  subjects: NarrativeDeadEndScanRow[];
  conditionIndex: ActivationConditionIndex;
  now?: Date;
  staleEdgeWindowMs?: number;
};

function canReachLifecycleState(
  from: NarrativeLifecycleState,
  target: NarrativeLifecycleState,
): boolean {
  if (from === target) return true;
  const visited = new Set<NarrativeLifecycleState>([from]);
  const queue: NarrativeLifecycleState[] = [from];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of allowedLifecycleTransitions(current)) {
      if (next === target) return true;
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

export function isBranchConditionSatisfiable(
  condition: BranchCondition | undefined,
  index: ActivationConditionIndex,
): boolean {
  if (!condition) return true;

  switch (condition.type) {
    case 'manual_flag':
      return true;
    case 'lifecycle': {
      if (!index.existingPageIds.has(condition.subjectId)) return false;
      const current = index.lifecycleBySubjectId.get(condition.subjectId);
      if (!current) return false;
      return canReachLifecycleState(current, condition.state);
    }
    case 'calendar_event':
      return index.calendarEventIds.has(condition.eventId);
    case 'graph_edge':
      return index.liveGraphEdges.has(graphEdgeConditionKey(condition));
    default:
      return false;
  }
}

export function detectHiddenReachabilityIssues(
  input: DetectHiddenReachabilityInput,
): HiddenReachabilityFinding[] {
  const findings: HiddenReachabilityFinding[] = [];
  const now = input.now ?? new Date();
  const staleWindow = input.staleEdgeWindowMs ?? DEFAULT_STALE_EDGE_WINDOW_MS;

  for (const row of input.subjects) {
    const graph = row.branchGraph;
    if (!graph) continue;

    const isDraftSubject = row.presenceState === ContentRevelationStates.DRAFT;
    if (isDraftSubject) continue;

    const isRecentlyEdited = now.getTime() - row.updatedAt.getTime() < staleWindow;
    const activationEntryIds = resolveActivationEntryNodeIds(graph, row.activeNodeId);
    if (activationEntryIds.length === 0) continue;

    const dedupedEdges = dedupeBranchEdges(graph.edges);
    const activationReachable = bfsReachable(
      activationEntryIds,
      dedupedEdges,
      (edge) => isBranchConditionSatisfiable(edge.condition, input.conditionIndex),
    );

    const explicitActivationRoots = new Set(graph.entryNodeIds ?? []);

    for (const node of graph.nodes) {
      if (node.kind !== BranchNodeKinds.HIDDEN) continue;
      if (explicitActivationRoots.has(node.id)) continue;
      if (activationReachable.has(node.id)) continue;

      findings.push({
        ruleId: 'hidden_no_activation_path',
        issueCategory: 'structural',
        issueType: 'narrative_unreachable_hidden',
        severity: isRecentlyEdited ? 'info' : 'warning',
        subjectPageId: row.subjectPageId,
        branchNodeId: node.id,
        messageParts: {
          subjectTitle: row.subjectTitle,
          nodeLabel: node.label,
          branchNodeId: node.id,
        },
      });
    }
  }

  return findings;
}
