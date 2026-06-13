/**
 * Layer 4 — clue redundancy and progression bottleneck analysis (pure).
 */
import type {
  ContinuityIssueCategory,
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import { BranchNodeKinds, type NarrativeBranchGraph } from './narrativeBranch.js';
import {
  bfsReachable,
  dedupeBranchEdges,
  resolveEntryNodeIds,
} from './narrativeBranchAnalysis.js';
import type { ActivationConditionIndex } from './narrativeHiddenReachability.js';
import { isBranchConditionSatisfiable } from './narrativeHiddenReachability.js';
import type { NarrativeDeadEndScanRow } from './narrativeDeadEnd.js';
import type { ThreadKind } from './threadMetadata.js';

export type ClueRedundancyFinding = {
  ruleId: string;
  issueCategory: ContinuityIssueCategory;
  issueType: ContinuityIssueType;
  severity: ContinuityIssueSeverity;
  subjectPageId: string;
  branchNodeId?: string;
  targetPageId?: string;
  clueThreadPageId?: string;
  messageParts: Record<string, string>;
};

export type DetectClueRedundancyInput = {
  subjects: readonly NarrativeDeadEndScanRow[];
  conditionIndex: ActivationConditionIndex;
  clueThreadPageIds: ReadonlySet<string>;
  threadKindByPageId: ReadonlyMap<string, ThreadKind>;
};

function isEdgeTraversable(
  conditionIndex: ActivationConditionIndex,
): (edge: { condition?: unknown }) => boolean {
  return (edge) =>
    isBranchConditionSatisfiable(
      edge.condition as Parameters<typeof isBranchConditionSatisfiable>[0],
      conditionIndex,
    );
}

function terminalNodeIds(graph: NarrativeBranchGraph): string[] {
  const outbound = new Map<string, number>();
  for (const node of graph.nodes) outbound.set(node.id, 0);
  for (const edge of graph.edges) {
    outbound.set(edge.from, (outbound.get(edge.from) ?? 0) + 1);
  }
  return graph.nodes
    .filter(
      (n) =>
        (outbound.get(n.id) ?? 0) === 0 ||
        n.kind === BranchNodeKinds.OUTCOME ||
        n.kind === BranchNodeKinds.FAILURE ||
        n.kind === BranchNodeKinds.MERGE,
    )
    .map((n) => n.id);
}

function reverseReachable(
  targetNodeId: string,
  edges: ReturnType<typeof dedupeBranchEdges>,
  isTraversable: (edge: { condition?: unknown }) => boolean,
): Set<string> {
  const reachable = new Set<string>([targetNodeId]);
  const queue = [targetNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const edge of edges) {
      if (edge.to !== id) continue;
      if (!isTraversable(edge)) continue;
      if (reachable.has(edge.from)) continue;
      reachable.add(edge.from);
      queue.push(edge.from);
    }
  }
  return reachable;
}

function countIndependentPredecessorFrontiers(
  targetNodeId: string,
  entryNodeIds: readonly string[],
  edges: ReturnType<typeof dedupeBranchEdges>,
  isTraversable: (edge: { condition?: unknown }) => boolean,
): number {
  const reverseFromTarget = reverseReachable(targetNodeId, edges, isTraversable);
  let frontierCount = 0;

  for (const entry of entryNodeIds) {
    if (!reverseFromTarget.has(entry)) continue;
    const forward = bfsReachable([entry], edges, isTraversable);
    if (!forward.has(targetNodeId)) continue;
    frontierCount += 1;
  }

  return frontierCount;
}

function findArticulationBottlenecks(
  graph: NarrativeBranchGraph,
  entryNodeIds: readonly string[],
  isTraversable: (edge: { condition?: unknown }) => boolean,
): string[] {
  const edges = dedupeBranchEdges(graph.edges);
  const terminals = terminalNodeIds(graph);
  if (terminals.length === 0 || entryNodeIds.length === 0) return [];

  const allReachable = bfsReachable(entryNodeIds, edges, isTraversable);
  const reachableTerminals = terminals.filter((t) => allReachable.has(t));
  if (reachableTerminals.length === 0) return [];

  const bottlenecks: string[] = [];
  for (const node of graph.nodes) {
    if (!allReachable.has(node.id)) continue;
    if (entryNodeIds.includes(node.id)) continue;

    let stillReachableAll = true;
    for (const terminal of reachableTerminals) {
      const withoutNode = bfsReachable(
        entryNodeIds,
        edges.filter((e) => e.from !== node.id && e.to !== node.id),
        isTraversable,
      );
      if (!withoutNode.has(terminal)) {
        stillReachableAll = false;
        break;
      }
    }
    if (!stillReachableAll) {
      bottlenecks.push(node.id);
    }
  }
  return bottlenecks;
}

function clueOnSolePath(
  subject: NarrativeDeadEndScanRow,
  graph: NarrativeBranchGraph,
  entryNodeIds: readonly string[],
  input: DetectClueRedundancyInput,
  isTraversable: (edge: { condition?: unknown }) => boolean,
): ClueRedundancyFinding[] {
  const findings: ClueRedundancyFinding[] = [];
  const edges = dedupeBranchEdges(graph.edges);
  const terminals = terminalNodeIds(graph);

  for (const terminal of terminals) {
    const independentPaths = countIndependentPredecessorFrontiers(
      terminal,
      entryNodeIds,
      edges,
      isTraversable,
    );
    if (independentPaths >= 2) continue;

    for (const edge of edges) {
      const condition = edge.condition;
      if (
        condition?.type === 'graph_edge' &&
        input.clueThreadPageIds.has(condition.sourcePageId)
      ) {
        findings.push({
          ruleId: 'clue_no_alternative_path',
          issueCategory: 'structural',
          issueType: 'narrative_clue_single_point_of_failure',
          severity: 'warning',
          subjectPageId: subject.subjectPageId,
          branchNodeId: edge.to,
          clueThreadPageId: condition.sourcePageId,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            terminalId: terminal,
          },
        });
      }
      if (
        condition?.type === 'lifecycle' &&
        input.threadKindByPageId.get(condition.subjectId) === 'clue'
      ) {
        findings.push({
          ruleId: 'clue_no_alternative_path',
          issueCategory: 'structural',
          issueType: 'narrative_clue_single_point_of_failure',
          severity: 'warning',
          subjectPageId: subject.subjectPageId,
          branchNodeId: edge.to,
          clueThreadPageId: condition.subjectId,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            terminalId: terminal,
          },
        });
      }
    }
  }

  return findings;
}

export function detectClueRedundancyIssues(
  input: DetectClueRedundancyInput,
): ClueRedundancyFinding[] {
  const findings: ClueRedundancyFinding[] = [];
  const isTraversable = isEdgeTraversable(input.conditionIndex);

  for (const subject of input.subjects) {
    const graph = subject.branchGraph;
    if (!graph || graph.nodes.length === 0) continue;

    const entryNodeIds = resolveEntryNodeIds(graph, subject.activeNodeId);
    if (entryNodeIds.length === 0) continue;

    findings.push(
      ...clueOnSolePath(subject, graph, entryNodeIds, input, isTraversable),
    );

    const bottlenecks = findArticulationBottlenecks(
      graph,
      entryNodeIds,
      isTraversable,
    );
    for (const nodeId of bottlenecks) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      findings.push({
        ruleId: 'progression_articulation_point',
        issueCategory: 'structural',
        issueType: 'narrative_progression_bottleneck',
        severity: 'info',
        subjectPageId: subject.subjectPageId,
        branchNodeId: nodeId,
        messageParts: {
          subjectTitle: subject.subjectTitle,
          nodeLabel: node?.label ?? nodeId,
        },
      });
    }
  }

  return findings;
}

export function countSpofClues(findings: readonly ClueRedundancyFinding[]): number {
  return findings.filter((f) => f.ruleId === 'clue_no_alternative_path').length;
}
