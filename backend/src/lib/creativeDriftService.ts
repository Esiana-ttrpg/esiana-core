import {
  computeCreativeDriftScan,
  type CreativeDriftComputeInput,
} from '../../../shared/creativeDriftCompute.js';
import {
  parseCreativeDriftDispositionMap,
  type CreativeDriftDisposition,
  type CreativeDriftDispositionMap,
  type CreativeDriftScanResult,
  type DriftDispositionKind,
} from '../../../shared/creativeDrift.js';
import { BranchNodeKinds } from '../../../shared/narrativeBranch.js';
import { EntityRelationKinds } from '../../../shared/entityGraph.js';
import {
  NarrativeLifecycleSubjectKinds,
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '../../../shared/narrativeLifecycle.js';
import { isPlayerTheoryThread } from '../../../shared/threadDisplay.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import { readBranchGraphFromMetadata } from './narrativeBranchService.js';
import { getLifecycleStates } from './narrativeLifecycleService.js';
import { parseThreadMetadata } from './threadMetadata.js';
import { parseQuestMetadata } from './questMetadata.js';
import { collectVisibleQuestSubtreeRows } from './questHubTree.js';
import { collectVisibleThreadSubtreeRows } from './threadHubTree.js';
import { resolveWikiCodexType } from './resolveWikiCodexType.js';
import { parseSystemCategoryKey } from './wikiSystemCategory.js';
import { prisma } from './prisma.js';

const NARRATIVE_TARGET_KINDS = [
  EntityRelationKinds.THREAD_RELATED,
  EntityRelationKinds.THREAD_PAYOFF,
  EntityRelationKinds.QUEST_GIVER,
  EntityRelationKinds.QUEST_FACTION,
] as const;

const ENTITY_CODEX_TYPES = new Set([
  'CHARACTER',
  'ORGANIZATION',
  'LOCATION',
  'OBJECT',
  'FAMILY',
  'BESTIARY',
]);

const LIVING_LIFECYCLE = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.ACTIVE,
  NarrativeLifecycleStates.DISCOVERED,
]);

function canAccessCreativeDrift(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function forwardReachableNodeIds(
  graph: NonNullable<ReturnType<typeof readBranchGraphFromMetadata>>,
  activeNodeId: string | null,
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [];
  if (activeNodeId) {
    queue.push(activeNodeId);
  } else {
    for (const node of graph.nodes) {
      if (node.kind === BranchNodeKinds.OUTCOME) queue.push(node.id);
    }
  }
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const edge of graph.edges) {
      if (edge.from === id) queue.push(edge.to);
    }
  }
  return reachable;
}

export async function loadCreativeDriftDispositions(
  campaignId: string,
): Promise<CreativeDriftDispositionMap> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { creativeDriftDispositions: true },
  });
  return parseCreativeDriftDispositionMap(campaign?.creativeDriftDispositions);
}

export async function saveCreativeDriftDisposition(
  campaignId: string,
  fingerprint: string,
  disposition: CreativeDriftDisposition,
): Promise<CreativeDriftDispositionMap> {
  const existing = await loadCreativeDriftDispositions(campaignId);
  const next: CreativeDriftDispositionMap = {
    ...existing,
    [fingerprint]: disposition,
  };
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { creativeDriftDispositions: next as object },
  });
  return next;
}

export async function buildCreativeDriftScan(
  campaignId: string,
  role: CampaignMemberRole | null,
): Promise<CreativeDriftScanResult | null> {
  if (!canAccessCreativeDrift(role)) return null;

  const [threadsRootId, questsRootId, dispositions] = await Promise.all([
    ensureNarrativeThreadsSystemCategoryKey(campaignId),
    ensureQuestsSystemCategoryKey(campaignId),
    loadCreativeDriftDispositions(campaignId),
  ]);

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      templateType: true,
      updatedAt: true,
    },
  });

  const threadRows = threadsRootId
    ? collectVisibleThreadSubtreeRows(
        pages.map((p) => ({
          id: p.id,
          title: p.title,
          parentId: p.parentId,
          visibility: p.visibility,
          metadata: p.metadata,
          blocks: [],
          createdAt: p.updatedAt,
          updatedAt: p.updatedAt,
        })),
        threadsRootId,
        role,
      )
    : [];

  const topLevelThreads = threadRows.filter((r) => r.parentId === threadsRootId);

  const questRows = questsRootId
    ? collectVisibleQuestSubtreeRows(
        pages.map((p) => ({
          id: p.id,
          title: p.title,
          parentId: p.parentId,
          visibility: p.visibility,
          metadata: p.metadata,
          blocks: [],
          createdAt: p.updatedAt,
          updatedAt: p.updatedAt,
        })),
        questsRootId,
        role,
      )
    : [];

  const topLevelQuests = questRows.filter((r) => r.parentId === questsRootId);

  const threadIds = topLevelThreads.map((r) => r.id);
  const questIds = topLevelQuests.map((r) => r.id);

  const [threadLifecycle, questLifecycle, activityRows, narrativeEdges, branchStates] =
    await Promise.all([
      getLifecycleStates(
        campaignId,
        NarrativeLifecycleSubjectKinds.OPEN_THREAD,
        threadIds,
      ),
      getLifecycleStates(campaignId, NarrativeLifecycleSubjectKinds.QUEST, questIds),
      prisma.campaignActivity.findMany({
        where: { campaignId, entityType: 'WIKI_PAGE' },
        select: { entityId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.entityRelation.findMany({
        where: {
          campaignId,
          relationKind: { in: [...NARRATIVE_TARGET_KINDS] },
          targetEntityType: 'wiki_page',
        },
        select: { targetEntityId: true, relationKind: true },
      }),
      prisma.narrativeBranchState.findMany({
        where: { campaignId },
        select: { subjectId: true, activeNodeId: true },
      }),
    ]);

  const lastActivityByPage = new Map<string, Date>();
  for (const row of activityRows) {
    if (!lastActivityByPage.has(row.entityId)) {
      lastActivityByPage.set(row.entityId, row.createdAt);
    }
  }

  const livingLinkedEntityIds = new Set<string>();
  for (const row of topLevelThreads) {
    const lifecycle =
      threadLifecycle.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    if (!LIVING_LIFECYCLE.has(lifecycle)) continue;
    const thread = parseThreadMetadata(row.metadata);
    for (const id of thread.relatedPageIds) livingLinkedEntityIds.add(id);
  }

  for (const row of topLevelQuests) {
    const lifecycle = questLifecycle.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    if (!LIVING_LIFECYCLE.has(lifecycle)) continue;
    const quest = parseQuestMetadata(row.metadata);
    if (quest.questGiverId) livingLinkedEntityIds.add(quest.questGiverId);
    if (quest.factionId) livingLinkedEntityIds.add(quest.factionId);
  }

  const threadWeightByEntity = new Map<string, 'minor' | 'major' | 'critical'>();
  for (const row of topLevelThreads) {
    const thread = parseThreadMetadata(row.metadata);
    for (const id of thread.relatedPageIds) {
      const existing = threadWeightByEntity.get(id);
      if (!existing || thread.narrativeWeight === 'critical') {
        threadWeightByEntity.set(id, thread.narrativeWeight);
      }
    }
  }

  const parentById = new Map(pages.map((p) => [p.id, p.parentId]));

  function isUnderSystemRoot(pageId: string, rootId: string | null): boolean {
    if (!rootId) return false;
    let current: string | null | undefined = pageId;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) return false;
      visited.add(current);
      if (current === rootId) return true;
      current = parentById.get(current) ?? null;
    }
    return false;
  }

  const entityPages = pages.filter((page) => {
    if (isUnderSystemRoot(page.id, threadsRootId)) return false;
    if (isUnderSystemRoot(page.id, questsRootId)) return false;
    if (parseSystemCategoryKey(page.metadata)) return false;
    const codex = resolveWikiCodexType({
      templateType: page.templateType,
      metadata: page.metadata,
    });
    return ENTITY_CODEX_TYPES.has(codex);
  });

  const inboundNarrativeCount = new Map<string, number>();
  for (const edge of narrativeEdges) {
    const pageId = edge.targetEntityId;
    inboundNarrativeCount.set(pageId, (inboundNarrativeCount.get(pageId) ?? 0) + 1);
  }

  const branchActiveBySubject = new Map(
    branchStates.map((r) => [r.subjectId, r.activeNodeId]),
  );

  const branches: CreativeDriftComputeInput['branches'] = [];
  for (const page of pages) {
    const graph = readBranchGraphFromMetadata(page.metadata);
    if (!graph) continue;
    const activeNodeId = branchActiveBySubject.get(page.id) ?? null;
    const reachable = forwardReachableNodeIds(graph, activeNodeId);
    for (const node of graph.nodes) {
      if (node.kind !== BranchNodeKinds.HIDDEN && node.kind !== BranchNodeKinds.FAILURE) {
        continue;
      }
      if (reachable.has(node.id)) continue;
      branches.push({
        subjectId: page.id,
        subjectTitle: page.title,
        nodeId: node.id,
        nodeLabel: node.label,
        nodeKind: node.kind,
        narrativeWeight: 'major',
        updatedAt: page.updatedAt,
      });
    }
  }

  const computeInput: CreativeDriftComputeInput = {
    threads: topLevelThreads.map((row) => {
      const thread = parseThreadMetadata(row.metadata);
      return {
        id: row.id,
        title: row.title,
        updatedAt: row.updatedAt,
        threadKind: thread.threadKind,
        threadStatus: thread.threadStatus,
        narrativeWeight: thread.narrativeWeight,
        relatedPageIds: thread.relatedPageIds,
        introducedSessionId: thread.introducedSessionId,
        lastAdvancedSessionId: thread.lastAdvancedSessionId,
        payoffPageId: thread.payoffPageId,
        playerSubmitted: thread.playerSubmitted,
        emotionalResidueKind: thread.emotionalResidueKind,
        lifecycleState:
          threadLifecycle.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED,
        isAuthored: !isPlayerTheoryThread(thread.threadKind, thread.playerSubmitted),
      };
    }),
    quests: topLevelQuests.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt,
      lifecycleState:
        questLifecycle.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED,
      lastActivityAt: lastActivityByPage.get(row.id) ?? null,
    })),
    entities: entityPages.map((page) => ({
      id: page.id,
      title: page.title,
      templateCategory: resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
      }),
      updatedAt: page.updatedAt,
      lastActivityAt: lastActivityByPage.get(page.id) ?? null,
      inboundNarrativeEdgeCount: inboundNarrativeCount.get(page.id) ?? 0,
      linkedByLivingNarrative: livingLinkedEntityIds.has(page.id),
      introWeight: threadWeightByEntity.get(page.id) ?? null,
    })),
    branches,
    dispositions,
  };

  return computeCreativeDriftScan(computeInput);
}

export function parseDispositionPatch(body: unknown): {
  fingerprint: string;
  kind: DriftDispositionKind;
  snoozeUntil?: string | null;
  note?: string | null;
} | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  if (typeof raw.fingerprint !== 'string' || !raw.fingerprint.trim()) return null;
  const kind = raw.disposition ?? raw.kind;
  if (typeof kind !== 'string') return null;
  const normalized = kind.trim().toLowerCase();
  const allowed = ['intentional', 'revive_later', 'archived', 'snoozed'] as const;
  if (!(allowed as readonly string[]).includes(normalized)) return null;
  return {
    fingerprint: raw.fingerprint.trim(),
    kind: normalized as DriftDispositionKind,
    snoozeUntil:
      typeof raw.snoozeUntil === 'string' ? raw.snoozeUntil : null,
    note: typeof raw.note === 'string' ? raw.note : null,
  };
}
