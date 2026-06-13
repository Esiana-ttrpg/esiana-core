import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import type { BranchCondition } from '../../../shared/narrativeBranch.js';
import { EntityRelationKinds } from '../../../shared/entityGraph.js';
import {
  detectNarrativeOrphans,
  type NarrativeOrphanPageRow,
} from '../../../shared/narrativeOrphanAnalysis.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { buildConsequenceReferenceIndex } from './narrativeDeadEndScan.js';
import { loadNarrativeDiagnosticSubjects } from './narrativeDeadEndScan.js';
import { buildNarrativeOrphanIssues } from './buildNarrativeOrphanIssues.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import {
  getContinuityRootTitles,
  isContinuityRoot,
  type WikiContinuityPageInput,
} from './wikiContinuityRoots.js';
import { parseThreadMetadata } from './threadMetadata.js';
import { prisma } from './prisma.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { rowToEdge } from './entityGraphService.js';

function canRunOrphanScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function collectQuestParticipationIds(
  pages: ReadonlyArray<{ id: string; metadata: unknown }>,
): Set<string> {
  const ids = new Set<string>();
  for (const page of pages) {
    ids.add(page.id);
    const meta = page.metadata;
    if (!meta || typeof meta !== 'object') continue;
    const raw = meta as Record<string, unknown>;
    if (typeof raw.questGiverPageId === 'string') ids.add(raw.questGiverPageId);
    if (typeof raw.factionPageId === 'string') ids.add(raw.factionPageId);
    if (typeof raw.organizationPageId === 'string') ids.add(raw.organizationPageId);
  }
  return ids;
}

function collectThreadRelatedIds(
  pages: ReadonlyArray<{ id: string; metadata: unknown }>,
): Set<string> {
  const ids = new Set<string>();
  for (const page of pages) {
    const thread = parseThreadMetadata(page.metadata);
    for (const relatedId of thread.relatedPageIds) {
      ids.add(relatedId);
    }
    if (thread.payoffPageId) ids.add(thread.payoffPageId);
  }
  return ids;
}

function collectBranchReferenceIds(
  subjects: Awaited<ReturnType<typeof loadNarrativeDiagnosticSubjects>>['subjects'],
): Set<string> {
  const ids = new Set<string>();
  for (const subject of subjects) {
    const graph = subject.branchGraph;
    if (!graph) continue;
    for (const edge of graph.edges) {
      const condition = edge.condition as BranchCondition | undefined;
      if (condition?.type === 'graph_edge') {
        ids.add(condition.sourcePageId);
        ids.add(condition.targetPageId);
      }
      if (condition?.type === 'lifecycle') {
        ids.add(condition.subjectId);
      }
    }
  }
  return ids;
}

export async function buildNarrativeOrphanContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
}): Promise<ContinuityIssue[]> {
  if (!canRunOrphanScan(input.role)) return [];

  const [loaded, entityRows, calendarEvents, threadsRootId, questsRootId] =
    await Promise.all([
      loadNarrativeDiagnosticSubjects(input.campaignId, input.role),
      prisma.entityRelation.findMany({ where: { campaignId: input.campaignId } }),
      prisma.calendarEvent.findMany({
        where: { calendar: { campaignId: input.campaignId } },
        select: { id: true },
      }),
      ensureNarrativeThreadsSystemCategoryKey(input.campaignId),
      ensureQuestsSystemCategoryKey(input.campaignId),
    ]);

  const edges = entityRows.map(rowToEdge);
  const calendarEventIds = new Set(calendarEvents.map((e) => e.id));

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId: input.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      templateType: true,
      metadata: true,
      parentId: true,
      updatedAt: true,
      stats: { select: { inboundLinkCount: true } },
      _count: { select: { children: true } },
    },
  });

  const parentIdsWithChildren = new Set(
    pages.filter((p) => p._count.children > 0).map((p) => p.id),
  );
  const continuityRootTitles = getContinuityRootTitles();

  const subjectById = new Map(
    loaded.subjects.map((s) => [s.subjectPageId, s]),
  );

  const questParticipation = collectQuestParticipationIds(pages);
  for (const id of loaded.consequenceReferenceIndex) {
    questParticipation.add(id);
  }
  for (const id of collectBranchReferenceIds(loaded.subjects)) {
    questParticipation.add(id);
  }

  for (const edge of edges) {
    if (
      edge.relationKind === EntityRelationKinds.QUEST_GIVER ||
      edge.relationKind === EntityRelationKinds.QUEST_FACTION
    ) {
      if (edge.source.entityType === 'wiki_page') {
        questParticipation.add(edge.source.entityId);
      }
      if (edge.target.entityType === 'wiki_page') {
        questParticipation.add(edge.target.entityId);
      }
    }
  }

  const threadRelated = collectThreadRelatedIds(pages);
  for (const edge of edges) {
    if (
      edge.relationKind === EntityRelationKinds.THREAD_RELATED ||
      edge.relationKind === EntityRelationKinds.THREAD_PAYOFF
    ) {
      if (edge.source.entityType === 'wiki_page') {
        threadRelated.add(edge.source.entityId);
      }
      if (edge.target.entityType === 'wiki_page') {
        threadRelated.add(edge.target.entityId);
      }
    }
  }

  const activeTargetPageIds = new Set<string>();
  for (const subject of loaded.subjects) {
    if (subject.subjectKind === 'quest') {
      if (subject.lifecycleState === NarrativeLifecycleStates.ACTIVE) {
        activeTargetPageIds.add(subject.subjectPageId);
      }
    } else if (subject.thread?.threadStatus === 'OPEN') {
      activeTargetPageIds.add(subject.subjectPageId);
    }
  }

  const dissolvedOrgPageIds = new Set<string>();

  const orphanPages: NarrativeOrphanPageRow[] = pages.map((page) => {
    const pageInput: WikiContinuityPageInput = {
      id: page.id,
      title: page.title,
      templateType: page.templateType,
      metadata: page.metadata,
      parentId: page.parentId,
      childCount: page._count.children,
    };
    const subject = subjectById.get(page.id);
    const isRoot =
      isContinuityRoot(pageInput, parentIdsWithChildren) ||
      continuityRootTitles.has(page.title);

    let subjectKind: NarrativeOrphanPageRow['subjectKind'];
    if (threadsRootId && page.parentId === threadsRootId) {
      subjectKind = 'open_thread';
    } else if (questsRootId && page.parentId === questsRootId) {
      subjectKind = 'quest';
    } else if (subject) {
      subjectKind = subject.subjectKind as typeof subjectKind;
    }

    return {
      pageId: page.id,
      title: page.title,
      codexType: resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
      }),
      inboundLinkCount: page.stats?.inboundLinkCount ?? 0,
      isContinuityRoot: isRoot,
      lifecycleState: subject?.lifecycleState,
      subjectKind,
      thread: subject?.thread ?? parseThreadMetadata(page.metadata),
      updatedAtMs: page.updatedAt.getTime(),
    };
  });

  let findings = detectNarrativeOrphans({
    pages: orphanPages,
    edges,
    pageIdsInThreadRelated: threadRelated,
    pageIdsInQuestParticipation: questParticipation,
    activeTargetPageIds,
    calendarEventIds,
    dissolvedOrgPageIds,
  });

  if (input.filterPageId) {
    findings = findings.filter((f) => f.pageId === input.filterPageId);
  }

  return buildNarrativeOrphanIssues(findings, input.scope);
}
