import type { CampaignMemberRole } from '../types/domain.js';
import { ensureQuestsSystemCategoryKey } from './ensureQuestsSystemCategoryKey.js';
import {
  parseQuestMetadata,
  sanitizeQuestMetadataForRole,
  type QuestStatus,
} from './questMetadata.js';
import { parseQuestTaskProgress, type QuestTaskProgress } from './questTaskProgress.js';
import {
  collectVisibleQuestSubtreeRows,
  type QuestHubPageRow,
} from './questHubTree.js';
import { buildContentSnippet } from './wikiCategories.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { isElevatedMembershipRole } from '../../../shared/campaignPolicy/membershipRoles.js';
import { prisma } from './prisma.js';
import {
  getLifecycleStates,
  isQuestVisibleToViewer,
} from './narrativeLifecycleService.js';
import { NarrativeLifecycleSubjectKinds } from '../../../shared/narrativeLifecycle.js';
import { buildNarrativeViewerContextFromCampaign } from './narrativeProjectionContext.js';

export type DashboardQuestLedgerEntry = {
  id: string;
  title: string;
  updatedAt: string;
  questStatus: QuestStatus;
  progress: QuestTaskProgress;
  snippet: string;
  parentId: string | null;
  templateType: string;
  workspace: string | null;
  pathKey: string | null;
  metadata: unknown;
};

const STATUS_SORT_ORDER: Record<QuestStatus, number> = {
  ACTIVE: 0,
  AVAILABLE: 1,
  COMPLETED: 2,
  FAILED: 3,
  ABANDONED: 4,
};

function canManageNotebooks(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

/**
 * Top-level main quests under the Quests category (direct children), with
 * quest status and checklist progress for the dashboard widget.
 */
export async function buildDashboardQuestLedgerEntries(
  campaignId: string,
  role: CampaignMemberRole | null,
  options?: { limit?: number },
): Promise<DashboardQuestLedgerEntry[]> {
  const limit = options?.limit ?? 8;
  const questsRootId = await ensureQuestsSystemCategoryKey(campaignId);
  if (!questsRootId) return [];

  const canManage = canManageNotebooks(role);
  const hasElevatedView = isElevatedMembershipRole(role);

  const rows = await prisma.wikiPage.findMany({
    where: { campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      blocks: true,
      updatedAt: true,
      templateType: true,
      workspace: true,
      pathKey: true,
    },
  });

  const questRows: QuestHubPageRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    parentId: row.parentId,
    visibility: row.visibility,
    metadata: row.metadata,
    blocks: row.blocks,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
  }));

  const visible = collectVisibleQuestSubtreeRows(questRows, questsRootId, role);
  const topLevel = visible.filter((row) => row.parentId === questsRootId);

  const lifecycleMap = await getLifecycleStates(
    campaignId,
    NarrativeLifecycleSubjectKinds.QUEST,
    topLevel.map((row) => row.id),
  );
  const viewerCtx = await buildNarrativeViewerContextFromCampaign(
    campaignId,
    role,
  );
  const visibleTopLevel = topLevel.filter((row) =>
    isQuestVisibleToViewer(row.id, lifecycleMap, viewerCtx),
  );

  const rowById = new Map(rows.map((source) => [source.id, source]));

  const entries: DashboardQuestLedgerEntry[] = visibleTopLevel.map((row) => {
    const source = rowById.get(row.id);
    const quest = sanitizeQuestMetadataForRole(
      parseQuestMetadata(row.metadata),
      hasElevatedView,
    );
    return {
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
      questStatus: quest.questStatus,
      progress: parseQuestTaskProgress(row.blocks, {
        includeDmOnlyBlocks: canManage,
      }),
      snippet: buildContentSnippet(
        row.blocks as Parameters<typeof buildContentSnippet>[0],
      ),
      parentId: source?.parentId ?? row.parentId,
      templateType: source?.templateType ?? 'DEFAULT',
      workspace: source?.workspace ?? null,
      pathKey: source?.pathKey ?? null,
      metadata: source?.metadata ?? row.metadata,
    };
  });

  entries.sort((a, b) => {
    const statusDiff =
      STATUS_SORT_ORDER[a.questStatus] - STATUS_SORT_ORDER[b.questStatus];
    if (statusDiff !== 0) return statusDiff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  return entries.slice(0, limit);
}
