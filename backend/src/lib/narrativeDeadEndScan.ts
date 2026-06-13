import {
  ContentPresenceEntityType,
  ContentRevelationStates,
  type ContentRevelationState,
} from '../../../shared/contentPresence.js';
import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  detectNarrativeDeadEnds,
  type NarrativeDeadEndScanRow,
} from '../../../shared/narrativeDeadEnd.js';
import {
  NarrativeLifecycleSubjectKinds,
  NarrativeLifecycleStates,
} from '../../../shared/narrativeLifecycle.js';
import type { ConsequenceRuleSet } from '../../../shared/narrativeConsequence.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { ensureNarrativeScenesSystemCategoryKey } from './ensureNarrativeScenesSystemCategoryKey.js';
import { getContentPresenceStateMap } from './contentPresenceService.js';
import { readBranchGraphFromMetadata } from './narrativeBranchService.js';
import { readConsequenceRulesFromMetadata } from './narrativeConsequenceService.js';
import { getLifecycleStates } from './narrativeLifecycleService.js';
import { buildNarrativeDeadEndIssues } from './buildNarrativeDeadEndIssues.js';
import { parseThreadMetadata } from './threadMetadata.js';
import { collectVisibleQuestSubtreeRows } from './questHubTree.js';
import { collectVisibleThreadSubtreeRows } from './threadHubTree.js';
import { collectVisibleSceneSubtreeRows } from './sceneHubTree.js';
import { prisma } from './prisma.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';

export const GLOBAL_NARRATIVE_DEAD_END_CAP = 50;

function canRunNarrativeDeadEndScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

export function buildConsequenceReferenceIndex(
  pages: ReadonlyArray<{ id: string; metadata: unknown }>,
): Set<string> {
  const refs = new Set<string>();
  for (const page of pages) {
    const rules = readConsequenceRulesFromMetadata(page.metadata);
    if (!rules) continue;
    collectConsequencePageRefs(rules, refs);
  }
  return refs;
}

function collectConsequencePageRefs(rules: ConsequenceRuleSet, refs: Set<string>): void {
  for (const rule of rules.rules) {
    for (const effect of rule.effects) {
      if (effect.type === 'discover_wiki_page') refs.add(effect.pageId);
      if (effect.type === 'discover_quest') refs.add(effect.questPageId);
      if (effect.type === 'set_faction_stance') refs.add(effect.factionPageId);
      if (effect.type === 'circulate_rumor') {
        if (effect.draft?.subjectPageId) refs.add(effect.draft.subjectPageId);
        if (effect.targetLocationPageId) refs.add(effect.targetLocationPageId);
        if (effect.targetOrgPageId) refs.add(effect.targetOrgPageId);
      }
    }
  }
}

export async function loadNarrativeDiagnosticSubjects(
  campaignId: string,
  role: CampaignMemberRole | null,
): Promise<{
  subjects: NarrativeDeadEndScanRow[];
  existingPageIds: Set<string>;
  pagePresenceById: Map<string, ContentRevelationState>;
  consequenceReferenceIndex: Set<string>;
}> {
  const [threadsRootId, questsRootId, scenesRootId] = await Promise.all([
    ensureNarrativeThreadsSystemCategoryKey(campaignId),
    ensureQuestsSystemCategoryKey(campaignId),
    ensureNarrativeScenesSystemCategoryKey(campaignId),
  ]);

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      updatedAt: true,
    },
  });

  const existingPageIds = new Set(pages.map((p) => p.id));
  const consequenceReferenceIndex = buildConsequenceReferenceIndex(pages);

  const pagePresenceById = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.WIKI_PAGE,
    pages.map((p) => p.id),
  );
  for (const page of pages) {
    if (!pagePresenceById.has(page.id)) {
      pagePresenceById.set(page.id, ContentRevelationStates.REVEALED);
    }
  }

  const wikiRows = pages.map((p) => ({
    id: p.id,
    title: p.title,
    parentId: p.parentId,
    visibility: p.visibility,
    metadata: p.metadata,
    blocks: [],
    createdAt: p.updatedAt,
    updatedAt: p.updatedAt,
  }));

  const threadRows = threadsRootId
    ? collectVisibleThreadSubtreeRows(wikiRows, threadsRootId, role)
    : [];
  const questRows = questsRootId
    ? collectVisibleQuestSubtreeRows(wikiRows, questsRootId, role)
    : [];
  const sceneRows = scenesRootId
    ? collectVisibleSceneSubtreeRows(wikiRows, scenesRootId, role)
    : [];

  const topLevelThreads = threadRows.filter((r) => r.parentId === threadsRootId);
  const topLevelQuests = questRows.filter((r) => r.parentId === questsRootId);
  const topLevelScenes = sceneRows.filter((r) => r.parentId === scenesRootId);

  const threadIds = topLevelThreads.map((r) => r.id);
  const questIds = topLevelQuests.map((r) => r.id);
  const sceneIds = topLevelScenes.map((r) => r.id);
  const allSubjectIds = [...threadIds, ...questIds, ...sceneIds];

  const [threadLifecycle, questLifecycle, sceneLifecycle, branchStates] = await Promise.all([
    getLifecycleStates(
      campaignId,
      NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      threadIds,
    ),
    getLifecycleStates(campaignId, NarrativeLifecycleSubjectKinds.QUEST, questIds),
    getLifecycleStates(campaignId, NarrativeLifecycleSubjectKinds.SCENE, sceneIds),
    prisma.narrativeBranchState.findMany({
      where: { campaignId, subjectId: { in: allSubjectIds } },
      select: { subjectId: true, activeNodeId: true },
    }),
  ]);

  const activeNodeBySubject = new Map(
    branchStates.map((row) => [row.subjectId, row.activeNodeId]),
  );

  const subjects: NarrativeDeadEndScanRow[] = [];

  for (const row of topLevelQuests) {
    const lifecycle =
      questLifecycle.get(row.id) ?? NarrativeLifecycleStates.LOCKED;
    subjects.push({
      subjectPageId: row.id,
      subjectTitle: row.title,
      subjectKind: 'quest',
      lifecycleState: lifecycle,
      presenceState:
        pagePresenceById.get(row.id) ?? ContentRevelationStates.REVEALED,
      updatedAt: row.updatedAt,
      branchGraph: readBranchGraphFromMetadata(row.metadata),
      activeNodeId: activeNodeBySubject.get(row.id) ?? null,
      consequenceRules: readConsequenceRulesFromMetadata(row.metadata),
      thread: null,
    });
  }

  for (const row of topLevelThreads) {
    const lifecycle =
      threadLifecycle.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    subjects.push({
      subjectPageId: row.id,
      subjectTitle: row.title,
      subjectKind: 'open_thread',
      lifecycleState: lifecycle,
      presenceState:
        pagePresenceById.get(row.id) ?? ContentRevelationStates.REVEALED,
      updatedAt: row.updatedAt,
      branchGraph: readBranchGraphFromMetadata(row.metadata),
      activeNodeId: activeNodeBySubject.get(row.id) ?? null,
      consequenceRules: readConsequenceRulesFromMetadata(row.metadata),
      thread: parseThreadMetadata(row.metadata),
    });
  }

  for (const row of topLevelScenes) {
    const lifecycle =
      sceneLifecycle.get(row.id) ?? NarrativeLifecycleStates.LOCKED;
    subjects.push({
      subjectPageId: row.id,
      subjectTitle: row.title,
      subjectKind: 'scene',
      lifecycleState: lifecycle,
      presenceState:
        pagePresenceById.get(row.id) ?? ContentRevelationStates.REVEALED,
      updatedAt: row.updatedAt,
      branchGraph: null,
      activeNodeId: null,
      consequenceRules: readConsequenceRulesFromMetadata(row.metadata),
      thread: null,
    });
  }

  return {
    subjects,
    existingPageIds,
    pagePresenceById,
    consequenceReferenceIndex,
  };
}

export async function buildNarrativeDeadEndContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
  maxIssues?: number;
}): Promise<ContinuityIssue[]> {
  if (!canRunNarrativeDeadEndScan(input.role)) return [];

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const subjects = input.filterPageId
    ? loaded.subjects.filter((s) => s.subjectPageId === input.filterPageId)
    : loaded.subjects;

  const findings = detectNarrativeDeadEnds({
    subjects,
    existingPageIds: loaded.existingPageIds,
    pagePresenceById: loaded.pagePresenceById,
    consequenceReferenceIndex: loaded.consequenceReferenceIndex,
  });

  let issues = buildNarrativeDeadEndIssues(findings, input.scope);
  if (input.maxIssues !== undefined && issues.length > input.maxIssues) {
    issues = issues.slice(0, input.maxIssues);
  }
  return issues;
}
