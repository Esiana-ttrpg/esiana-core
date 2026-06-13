/**
 * Layer 4 — pure narrative dead-end / broken-chain analysis.
 */
import type { ContentRevelationState } from './contentPresence.js';
import { ContentRevelationStates } from './contentPresence.js';
import type {
  ContinuityIssueCategory,
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import {
  BranchNodeKinds,
  type NarrativeBranchEdge,
  type NarrativeBranchGraph,
} from './narrativeBranch.js';
import {
  bfsReachable,
  dedupeBranchEdges,
  resolveEntryNodeIds,
} from './narrativeBranchAnalysis.js';
import type { ConsequenceRuleSet } from './narrativeConsequence.js';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from './narrativeLifecycle.js';
import type { ThreadMetadataFields } from './threadMetadata.js';

export const DEFAULT_STALE_EDGE_WINDOW_MS = 5 * 60 * 1000;

const TERMINAL_KINDS = new Set([
  BranchNodeKinds.OUTCOME,
  BranchNodeKinds.HIDDEN,
  BranchNodeKinds.FAILURE,
  BranchNodeKinds.MERGE,
]);

const TERMINAL_LIFECYCLE = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.COMPLETED,
  NarrativeLifecycleStates.FAILED,
]);

export type NarrativeDeadEndSubjectKind = 'quest' | 'open_thread' | 'scene';

export type NarrativeDeadEndScanRow = {
  subjectPageId: string;
  subjectTitle: string;
  subjectKind: NarrativeDeadEndSubjectKind;
  lifecycleState: NarrativeLifecycleState;
  presenceState: ContentRevelationState;
  updatedAt: Date;
  branchGraph: NarrativeBranchGraph | null;
  activeNodeId: string | null;
  consequenceRules: ConsequenceRuleSet | null;
  thread: ThreadMetadataFields | null;
};

export type NormalizedNarrativeSubject = {
  row: NarrativeDeadEndScanRow;
  subjectPageId: string;
  subjectTitle: string;
  subjectKind: NarrativeDeadEndSubjectKind;
  lifecycleState: NarrativeLifecycleState;
  isDraftSubject: boolean;
  isRecentlyEdited: boolean;
  entryNodeIds: string[];
  terminalNodeIds: string[];
  reachableFromEntry: Set<string>;
  dedupedEdges: NarrativeBranchEdge[];
  nodeIdSet: Set<string>;
  nodesById: Map<string, NarrativeBranchGraph['nodes'][number]>;
  hasLifecycleResolutionHook: boolean;
  isConsequenceReferenced: boolean;
};

export type NarrativeDeadEndFinding = {
  ruleId: string;
  issueCategory: ContinuityIssueCategory;
  issueType: ContinuityIssueType;
  severity: ContinuityIssueSeverity;
  subjectPageId: string;
  relatedPageId?: string;
  branchNodeId?: string;
  consequenceRuleId?: string;
  messageParts: Record<string, string>;
};

export type DetectNarrativeDeadEndsInput = {
  subjects: NarrativeDeadEndScanRow[];
  existingPageIds: ReadonlySet<string>;
  pagePresenceById: ReadonlyMap<string, ContentRevelationState>;
  consequenceReferenceIndex: ReadonlySet<string>;
  now?: Date;
  staleEdgeWindowMs?: number;
};

function hasLifecycleResolutionHook(rules: ConsequenceRuleSet | null): boolean {
  if (!rules) return false;
  return rules.rules.some(
    (rule) =>
      rule.trigger.type === 'on_lifecycle' &&
      (rule.trigger.lifecycleTarget === NarrativeLifecycleStates.COMPLETED ||
        rule.trigger.lifecycleTarget === NarrativeLifecycleStates.FAILED),
  );
}

export function normalizeNarrativeSubject(
  row: NarrativeDeadEndScanRow,
  input: DetectNarrativeDeadEndsInput,
): NormalizedNarrativeSubject {
  const now = input.now ?? new Date();
  const staleWindow = input.staleEdgeWindowMs ?? DEFAULT_STALE_EDGE_WINDOW_MS;
  const isDraftSubject = row.presenceState === ContentRevelationStates.DRAFT;
  const isRecentlyEdited = now.getTime() - row.updatedAt.getTime() < staleWindow;

  const graph = row.branchGraph;
  const dedupedEdges = graph ? dedupeBranchEdges(graph.edges) : [];
  const nodeIdSet = new Set(graph?.nodes.map((n) => n.id) ?? []);
  const nodesById = new Map((graph?.nodes ?? []).map((n) => [n.id, n]));

  const entryNodeIds = graph ? resolveEntryNodeIds(graph, row.activeNodeId) : [];
  const reachableFromEntry =
    graph && entryNodeIds.length > 0
      ? bfsReachable(entryNodeIds, dedupedEdges)
      : new Set<string>();

  const terminalNodeIds = (graph?.nodes ?? [])
    .filter((n) => TERMINAL_KINDS.has(n.kind))
    .map((n) => n.id);

  return {
    row,
    subjectPageId: row.subjectPageId,
    subjectTitle: row.subjectTitle,
    subjectKind: row.subjectKind,
    lifecycleState: row.lifecycleState,
    isDraftSubject,
    isRecentlyEdited,
    entryNodeIds,
    terminalNodeIds,
    reachableFromEntry,
    dedupedEdges,
    nodeIdSet,
    nodesById,
    hasLifecycleResolutionHook: hasLifecycleResolutionHook(row.consequenceRules),
    isConsequenceReferenced: input.consequenceReferenceIndex.has(row.subjectPageId),
  };
}

function isStaleDanglingEdge(subject: NormalizedNarrativeSubject): boolean {
  return subject.isDraftSubject || subject.isRecentlyEdited;
}

function passStructuralIntegrity(
  subject: NormalizedNarrativeSubject,
): NarrativeDeadEndFinding[] {
  const findings: NarrativeDeadEndFinding[] = [];
  const graph = subject.row.branchGraph;
  if (!graph) return findings;

  for (const edge of graph.edges) {
    const missingFrom = !subject.nodeIdSet.has(edge.from);
    const missingTo = !subject.nodeIdSet.has(edge.to);
    if (!missingFrom && !missingTo) continue;

    const branchNodeId = missingFrom ? edge.from : edge.to;
    if (isStaleDanglingEdge(subject)) {
      findings.push({
        ruleId: 'branch_stale_edge',
        issueCategory: 'structural',
        issueType: 'narrative_broken_chain',
        severity: 'info',
        subjectPageId: subject.subjectPageId,
        branchNodeId,
        messageParts: {
          subjectTitle: subject.subjectTitle,
          branchNodeId,
        },
      });
    } else {
      findings.push({
        ruleId: 'branch_hard_dangling_edge',
        issueCategory: 'structural',
        issueType: 'narrative_broken_chain',
        severity: subject.isDraftSubject ? 'warning' : 'critical',
        subjectPageId: subject.subjectPageId,
        branchNodeId,
        messageParts: {
          subjectTitle: subject.subjectTitle,
          branchNodeId,
        },
      });
    }
  }

  for (const node of graph.nodes) {
    const hasOutgoing = subject.dedupedEdges.some((e) => e.from === node.id);
    if (hasOutgoing || TERMINAL_KINDS.has(node.kind)) continue;

    findings.push({
      ruleId: 'branch_non_terminal_leaf',
      issueCategory: 'structural',
      issueType: 'narrative_dead_end',
      severity: 'warning',
      subjectPageId: subject.subjectPageId,
      branchNodeId: node.id,
      messageParts: {
        subjectTitle: subject.subjectTitle,
        nodeLabel: node.label,
        branchNodeId: node.id,
      },
    });
  }

  return findings;
}

function passResolutionTopology(
  subject: NormalizedNarrativeSubject,
): NarrativeDeadEndFinding[] {
  const findings: NarrativeDeadEndFinding[] = [];
  const graph = subject.row.branchGraph;
  if (!graph || subject.isDraftSubject) return findings;

  for (const terminalId of subject.terminalNodeIds) {
    if (subject.reachableFromEntry.has(terminalId)) continue;
    const node = subject.nodesById.get(terminalId);
    findings.push({
      ruleId: 'branch_unreachable_terminal',
      issueCategory: 'structural',
      issueType: 'narrative_unreachable_conclusion',
      severity: 'warning',
      subjectPageId: subject.subjectPageId,
      branchNodeId: terminalId,
      messageParts: {
        subjectTitle: subject.subjectTitle,
        nodeLabel: node?.label ?? terminalId,
        branchNodeId: terminalId,
      },
    });
  }

  if (subject.subjectKind !== 'quest') return findings;

  const livingQuest =
    subject.lifecycleState === NarrativeLifecycleStates.DISCOVERED ||
    subject.lifecycleState === NarrativeLifecycleStates.ACTIVE;

  if (!livingQuest || subject.hasLifecycleResolutionHook) return findings;

  const hasReachableTerminal = subject.terminalNodeIds.some((id) =>
    subject.reachableFromEntry.has(id),
  );
  if (hasReachableTerminal) return findings;

  findings.push({
    ruleId: 'quest_no_resolution_path',
    issueCategory: 'narrative_intent',
    issueType: 'narrative_incomplete_arc',
    severity: 'warning',
    subjectPageId: subject.subjectPageId,
    messageParts: {
      subjectTitle: subject.subjectTitle,
    },
  });

  return findings;
}

function shouldEscalateThread(subject: NormalizedNarrativeSubject, thread: ThreadMetadataFields): boolean {
  return (
    thread.threadKind === 'promise' ||
    thread.narrativeWeight === 'critical' ||
    subject.isConsequenceReferenced
  );
}

function passNarrativeIntent(
  subject: NormalizedNarrativeSubject,
  input: DetectNarrativeDeadEndsInput,
): NarrativeDeadEndFinding[] {
  const findings: NarrativeDeadEndFinding[] = [];

  if (subject.subjectKind === 'open_thread' && subject.row.thread) {
    const thread = subject.row.thread;
    const eligibleKind =
      thread.threadKind === 'foreshadowing' || thread.threadKind === 'promise';
    const open = thread.threadStatus === 'OPEN';
    const noPayoff = !thread.payoffPageId;
    const notTerminal = !TERMINAL_LIFECYCLE.has(subject.lifecycleState);

    if (eligibleKind && open && noPayoff && notTerminal) {
      if (shouldEscalateThread(subject, thread)) {
        findings.push({
          ruleId: 'thread_incomplete_escalated',
          issueCategory: 'narrative_intent',
          issueType: 'narrative_incomplete_arc',
          severity: 'warning',
          subjectPageId: subject.subjectPageId,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            threadKind: thread.threadKind,
          },
        });
      } else {
        findings.push({
          ruleId: 'thread_unresolved_soft',
          issueCategory: 'narrative_intent',
          issueType: 'narrative_unresolved_thread',
          severity: 'info',
          subjectPageId: subject.subjectPageId,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            threadKind: thread.threadKind,
          },
        });
      }
    }
  }

  const rules = subject.row.consequenceRules;
  if (!rules) return findings;

  for (const rule of rules.rules) {
    if (rule.trigger.type === 'on_enter_node') {
      const branchNodeId = rule.trigger.branchNodeId;
      if (!subject.nodeIdSet.has(branchNodeId)) {
        const severity: ContinuityIssueSeverity = subject.isDraftSubject
          ? 'warning'
          : 'critical';
        findings.push({
          ruleId: 'consequence_missing_branch_node',
          issueCategory: 'system_consistency',
          issueType: 'narrative_broken_chain',
          severity,
          subjectPageId: subject.subjectPageId,
          branchNodeId,
          consequenceRuleId: rule.id,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            branchNodeId,
            consequenceRuleId: rule.id,
          },
        });
      }
    }

    for (const effect of rule.effects) {
      let targetPageId: string | null = null;
      if (effect.type === 'discover_wiki_page') targetPageId = effect.pageId;
      if (effect.type === 'discover_quest') targetPageId = effect.questPageId;

      if (!targetPageId) continue;

      if (!input.existingPageIds.has(targetPageId)) {
        findings.push({
          ruleId: 'consequence_missing_page',
          issueCategory: 'system_consistency',
          issueType: 'narrative_broken_chain',
          severity: subject.isDraftSubject ? 'warning' : 'critical',
          subjectPageId: subject.subjectPageId,
          relatedPageId: targetPageId,
          consequenceRuleId: rule.id,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            targetPageId,
            consequenceRuleId: rule.id,
          },
        });
        continue;
      }

      const presence =
        input.pagePresenceById.get(targetPageId) ?? ContentRevelationStates.REVEALED;
      if (presence === ContentRevelationStates.DRAFT) {
        findings.push({
          ruleId: 'consequence_target_draft',
          issueCategory: 'system_consistency',
          issueType: 'narrative_broken_chain',
          severity: 'warning',
          subjectPageId: subject.subjectPageId,
          relatedPageId: targetPageId,
          consequenceRuleId: rule.id,
          messageParts: {
            subjectTitle: subject.subjectTitle,
            targetPageId,
            consequenceRuleId: rule.id,
          },
        });
      }
    }
  }

  return findings;
}

export function detectNarrativeDeadEnds(
  input: DetectNarrativeDeadEndsInput,
): NarrativeDeadEndFinding[] {
  const findings: NarrativeDeadEndFinding[] = [];

  for (const row of input.subjects) {
    const subject = normalizeNarrativeSubject(row, input);
    findings.push(
      ...passStructuralIntegrity(subject),
      ...passResolutionTopology(subject),
      ...passNarrativeIntent(subject, input),
    );
  }

  return findings;
}
