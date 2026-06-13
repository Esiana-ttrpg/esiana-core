/**
 * Layer 2 — sparse authored branch graphs (wiki metadata).
 */
import type { NarrativeLifecycleState } from './narrativeLifecycle.js';

export const NARRATIVE_BRANCH_VERSION = 'narrative-branch-v1';
export const MAX_BRANCH_NODES = 12;
export const MAX_BRANCH_EDGES = 24;

export const BranchNodeKinds = {
  OUTCOME: 'outcome',
  HIDDEN: 'hidden',
  FAILURE: 'failure',
  MERGE: 'merge',
} as const;

export type BranchNodeKind =
  (typeof BranchNodeKinds)[keyof typeof BranchNodeKinds];

export type BranchCondition =
  | { type: 'lifecycle'; subjectId: string; state: NarrativeLifecycleState }
  | { type: 'calendar_event'; eventId: string }
  | { type: 'graph_edge'; sourcePageId: string; targetPageId: string; kind: string }
  | { type: 'manual_flag'; key: string; value: boolean };

export type NarrativeBranchNode = {
  id: string;
  label: string;
  kind: BranchNodeKind;
};

export type NarrativeBranchEdge = {
  from: string;
  to: string;
  condition?: BranchCondition;
};

export type NarrativeBranchGraph = {
  version: typeof NARRATIVE_BRANCH_VERSION;
  nodes: NarrativeBranchNode[];
  edges: NarrativeBranchEdge[];
  /** Optional explicit entry roots for reachability analysis */
  entryNodeIds?: string[];
};

export class NarrativeBranchValidationError extends Error {
  readonly code = 'INVALID_BRANCH_GRAPH';
  constructor(message: string) {
    super(message);
    this.name = 'NarrativeBranchValidationError';
  }
}

export function parseNarrativeBranchGraph(raw: unknown): NarrativeBranchGraph | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== NARRATIVE_BRANCH_VERSION) return null;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;
  const nodes: NarrativeBranchNode[] = [];
  for (const entry of obj.nodes) {
    if (!entry || typeof entry !== 'object') continue;
    const node = entry as Record<string, unknown>;
    if (typeof node.id !== 'string' || typeof node.label !== 'string') continue;
    const kind = node.kind;
    if (
      kind !== BranchNodeKinds.OUTCOME &&
      kind !== BranchNodeKinds.HIDDEN &&
      kind !== BranchNodeKinds.FAILURE &&
      kind !== BranchNodeKinds.MERGE
    ) {
      continue;
    }
    nodes.push({ id: node.id, label: node.label, kind });
  }
  const edges: NarrativeBranchEdge[] = [];
  for (const entry of obj.edges) {
    if (!entry || typeof entry !== 'object') continue;
    const edge = entry as Record<string, unknown>;
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') continue;
    edges.push({
      from: edge.from,
      to: edge.to,
      condition: edge.condition as BranchCondition | undefined,
    });
  }
  if (nodes.length === 0) return null;
  const entryNodeIds: string[] = [];
  if (Array.isArray(obj.entryNodeIds)) {
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const entry of obj.entryNodeIds) {
      if (typeof entry === 'string' && nodeIds.has(entry)) {
        entryNodeIds.push(entry);
      }
    }
  }
  return {
    version: NARRATIVE_BRANCH_VERSION,
    nodes,
    edges,
    ...(entryNodeIds.length > 0 ? { entryNodeIds } : {}),
  };
}

export function assertValidBranchGraph(graph: NarrativeBranchGraph): void {
  if (graph.nodes.length > MAX_BRANCH_NODES) {
    throw new NarrativeBranchValidationError(
      `Branch graph exceeds ${MAX_BRANCH_NODES} nodes`,
    );
  }
  if (graph.edges.length > MAX_BRANCH_EDGES) {
    throw new NarrativeBranchValidationError(
      `Branch graph exceeds ${MAX_BRANCH_EDGES} edges`,
    );
  }
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new NarrativeBranchValidationError('Branch edge references unknown node');
    }
  }
  if (graph.entryNodeIds?.length) {
    for (const entryId of graph.entryNodeIds) {
      if (!nodeIds.has(entryId)) {
        throw new NarrativeBranchValidationError(
          'Branch entryNodeIds references unknown node',
        );
      }
    }
  }
}

export function allowedNextBranchNodes(
  graph: NarrativeBranchGraph,
  activeNodeId: string | null,
): NarrativeBranchNode[] {
  if (!activeNodeId) {
    return graph.nodes.filter((n) => n.kind === BranchNodeKinds.OUTCOME);
  }
  const outgoing = graph.edges.filter((e) => e.from === activeNodeId);
  const targetIds = new Set(outgoing.map((e) => e.to));
  return graph.nodes.filter((n) => targetIds.has(n.id));
}
