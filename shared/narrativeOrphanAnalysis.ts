/**
 * Layer 4 — tiered orphaned content analysis (pure).
 */
import type {
  ContinuityIssueSeverity,
  ContinuityIssueType,
} from './continuityIssue.js';
import type { EntityGraphEdge } from './entityGraph.js';
import { EntityRelationKinds } from './entityGraph.js';
import { NarrativeLifecycleStates, type NarrativeLifecycleState } from './narrativeLifecycle.js';
import {
  computeConnectivityScore,
  hasChronologyEdge,
  hasNonParentNarrativeEdge,
  hasThreadGraphEdge,
  isNarrativelyConnected,
} from './narrativeConnectivity.js';
import type { ThreadMetadataFields } from './threadMetadata.js';

export type NarrativeIsolationClass = 'structural' | 'narrative' | 'temporal';

export type NarrativeOrphanPageRow = {
  pageId: string;
  title: string;
  codexType: string;
  inboundLinkCount: number;
  isContinuityRoot: boolean;
  lifecycleState?: NarrativeLifecycleState;
  subjectKind?: 'quest' | 'open_thread';
  thread?: ThreadMetadataFields | null;
  updatedAtMs?: number;
};

export type NarrativeOrphanScanInput = {
  pages: readonly NarrativeOrphanPageRow[];
  edges: readonly EntityGraphEdge[];
  pageIdsInThreadRelated: ReadonlySet<string>;
  pageIdsInQuestParticipation: ReadonlySet<string>;
  activeTargetPageIds: ReadonlySet<string>;
  calendarEventIds: ReadonlySet<string>;
  dissolvedOrgPageIds: ReadonlySet<string>;
};

export type NarrativeOrphanRuleId =
  | 'entity_graph_isolated'
  | 'quest_isolated'
  | 'thread_unconnected'
  | 'npc_narratively_disconnected'
  | 'faction_inactive';

export type NarrativeOrphanFinding = {
  ruleId: NarrativeOrphanRuleId;
  isolationClass: NarrativeIsolationClass;
  issueType: ContinuityIssueType;
  severity: ContinuityIssueSeverity;
  pageId: string;
  title: string;
  messageParts: Record<string, string>;
};

const NARRATIVE_CODEX_TYPES = new Set([
  'CHARACTER',
  'QUEST',
  'LOCATION',
  'ORGANIZATION',
  'BESTIARY',
  'OBJECT',
  'FAMILY',
  'ANCESTRY',
  'LANGUAGE',
  'RULE_RESOURCE',
]);

function isDraftLifecycle(state: NarrativeLifecycleState | undefined): boolean {
  return state === undefined;
}

function isOpenAuthoredThread(thread: ThreadMetadataFields | null | undefined): boolean {
  if (!thread) return false;
  if (thread.playerSubmitted || thread.threadKind === 'theory') return false;
  return thread.threadStatus === 'OPEN' || thread.threadStatus === 'DORMANT';
}

export function isStructurallyIsolated(
  page: NarrativeOrphanPageRow,
  input: NarrativeOrphanScanInput,
): boolean {
  if (page.isContinuityRoot) return false;
  if (page.lifecycleState === NarrativeLifecycleStates.LOCKED) return false;

  if (hasNonParentNarrativeEdge(page.pageId, input.edges)) return false;
  if (page.inboundLinkCount > 0) return false;
  if (input.pageIdsInThreadRelated.has(page.pageId)) return false;
  if (hasThreadGraphEdge(page.pageId, input.edges)) return false;
  if (input.pageIdsInQuestParticipation.has(page.pageId)) return false;
  if (hasChronologyEdge(page.pageId, input.edges)) return false;

  return true;
}

export function detectNarrativeOrphans(
  input: NarrativeOrphanScanInput,
): NarrativeOrphanFinding[] {
  const findings: NarrativeOrphanFinding[] = [];

  for (const page of input.pages) {
    const isThreadSubject = page.subjectKind === 'open_thread';
    const isQuestSubject = page.subjectKind === 'quest';
    if (
      !NARRATIVE_CODEX_TYPES.has(page.codexType) &&
      !isThreadSubject &&
      !isQuestSubject
    ) {
      continue;
    }
    if (page.isContinuityRoot) continue;
    if (isDraftLifecycle(page.lifecycleState) && page.subjectKind) {
      // skip draft subjects when lifecycle unknown — treat as non-draft for entities
    }

    const structurallyIsolated = isStructurallyIsolated(page, input);

    if (
      structurallyIsolated &&
      page.codexType !== 'QUEST' &&
      page.subjectKind !== 'open_thread'
    ) {
      findings.push({
        ruleId: 'entity_graph_isolated',
        isolationClass: 'structural',
        issueType: 'narrative_orphan_entity',
        severity: 'info',
        pageId: page.pageId,
        title: page.title,
        messageParts: { codexType: page.codexType },
      });
      continue;
    }

    if (
      page.subjectKind === 'quest' &&
      page.lifecycleState === NarrativeLifecycleStates.ACTIVE &&
      structurallyIsolated
    ) {
      findings.push({
        ruleId: 'quest_isolated',
        isolationClass: 'structural',
        issueType: 'narrative_orphan_quest',
        severity: 'warning',
        pageId: page.pageId,
        title: page.title,
        messageParts: {},
      });
      continue;
    }

    if (
      page.subjectKind === 'open_thread' &&
      isOpenAuthoredThread(page.thread) &&
      !page.thread?.relatedPageIds.length &&
      !hasThreadGraphEdge(page.pageId, input.edges)
    ) {
      findings.push({
        ruleId: 'thread_unconnected',
        isolationClass: 'structural',
        issueType: 'narrative_orphan_thread',
        severity: 'warning',
        pageId: page.pageId,
        title: page.title,
        messageParts: { threadKind: page.thread?.threadKind ?? 'thread' },
      });
      continue;
    }

    if (page.codexType === 'CHARACTER' && !structurallyIsolated) {
      const score = computeConnectivityScore({
        startPageId: page.pageId,
        edges: input.edges,
        activeTargetPageIds: input.activeTargetPageIds,
        calendarEventIds: input.calendarEventIds,
      });
      if (!isNarrativelyConnected(score)) {
        findings.push({
          ruleId: 'npc_narratively_disconnected',
          isolationClass: 'narrative',
          issueType: 'narrative_orphan_npc',
          severity: 'info',
          pageId: page.pageId,
          title: page.title,
          messageParts: {},
        });
      }
      continue;
    }

    if (page.codexType === 'ORGANIZATION') {
      const hasActiveRefs =
        input.activeTargetPageIds.has(page.pageId) ||
        input.pageIdsInQuestParticipation.has(page.pageId) ||
        input.pageIdsInThreadRelated.has(page.pageId);

      if (hasActiveRefs) continue;

      const score = computeConnectivityScore({
        startPageId: page.pageId,
        edges: input.edges,
        activeTargetPageIds: input.activeTargetPageIds,
        calendarEventIds: input.calendarEventIds,
      });

      const isDissolved = input.dissolvedOrgPageIds.has(page.pageId);
      const inactive =
        isDissolved ||
        score.strongScore === 0 ||
        !isNarrativelyConnected(score);

      if (inactive) {
        findings.push({
          ruleId: 'faction_inactive',
          isolationClass: 'temporal',
          issueType: 'narrative_orphan_faction',
          severity: 'info',
          pageId: page.pageId,
          title: page.title,
          messageParts: { dissolved: isDissolved ? 'true' : 'false' },
        });
      }
    }
  }

  return findings;
}

/** Shared structural check for entity-graph diagnostics endpoint. */
export function isEntityGraphStructurallyIsolated(
  pageId: string,
  input: Pick<
    NarrativeOrphanScanInput,
    'edges' | 'pageIdsInThreadRelated' | 'pageIdsInQuestParticipation'
  > & {
    inboundLinkCount: number;
    isContinuityRoot: boolean;
  },
): boolean {
  return isStructurallyIsolated(
    {
      pageId,
      title: '',
      codexType: 'CHARACTER',
      inboundLinkCount: input.inboundLinkCount,
      isContinuityRoot: input.isContinuityRoot,
    },
    {
      pages: [],
      edges: input.edges,
      pageIdsInThreadRelated: input.pageIdsInThreadRelated,
      pageIdsInQuestParticipation: input.pageIdsInQuestParticipation,
      activeTargetPageIds: new Set(),
      calendarEventIds: new Set(),
      dissolvedOrgPageIds: new Set(),
    },
  );
}
