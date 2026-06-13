import { CampaignMemberRoles, type CampaignMemberRole } from '../types/domain.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import { isPlayerTheoryThread } from '../../../shared/threadDisplay.js';
import type { ThreadSignalId } from '../../../shared/threadSignals.js';
import { ensureNarrativeThreadsSystemCategoryKey } from './ensureNarrativeThreadsSystemCategoryKey.js';
import {
  parseThreadMetadata,
  type ThreadKind,
  type ThreadStatus,
} from './threadMetadata.js';
import { buildContentSnippet } from './wikiCategories.js';
import { prisma } from './prisma.js';
import {
  collectVisibleThreadSubtreeRows,
  type ThreadHubPageRow,
} from './threadHubTree.js';
import {
  getLifecycleStates,
  isThreadVisibleToViewer,
} from './narrativeLifecycleService.js';
import { NarrativeLifecycleSubjectKinds } from '../../../shared/narrativeLifecycle.js';
import { buildNarrativeViewerContextFromCampaign } from './narrativeProjectionContext.js';
import { computeThreadSignalsFromMetadata } from './threadSignals.js';
import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';

export const DASHBOARD_RECENTLY_RESOLVED_DAYS = 14;

export type DashboardOpenThreadEntry = {
  id: string;
  title: string;
  updatedAt: string;
  threadKind: ThreadKind;
  threadStatus: ThreadStatus;
  snippet: string;
  playerSubmitted: boolean;
  lifecycleState?: NarrativeLifecycleState;
  threadSignals?: ThreadSignalId[];
  sortOrder: number | null;
  resolvedAt?: string;
};

export type DashboardThreadBundle = {
  living: DashboardOpenThreadEntry[];
  theories: DashboardOpenThreadEntry[];
  recentlyResolved: DashboardOpenThreadEntry[];
};

const STATUS_SORT_ORDER: Record<ThreadStatus, number> = {
  OPEN: 0,
  DORMANT: 1,
  RESOLVED: 2,
  ABANDONED: 3,
};

const LIVING_LIFECYCLE = new Set<NarrativeLifecycleState>([
  NarrativeLifecycleStates.ACTIVE,
  NarrativeLifecycleStates.DISCOVERED,
]);

const LIVING_STATUS = new Set<ThreadStatus>(['OPEN', 'DORMANT']);

function rowToEntry(
  row: ThreadHubPageRow,
  lifecycleMap: Map<string, NarrativeLifecycleState>,
  includeSignals: boolean,
): DashboardOpenThreadEntry {
  const thread = parseThreadMetadata(row.metadata);
  const lifecycleState =
    lifecycleMap.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    threadKind: thread.threadKind,
    threadStatus: thread.threadStatus,
    snippet: buildContentSnippet(
      (row.blocks ?? []) as Parameters<typeof buildContentSnippet>[0],
    ),
    playerSubmitted: thread.playerSubmitted,
    lifecycleState,
    ...(includeSignals
      ? { threadSignals: computeThreadSignalsFromMetadata(thread, row.updatedAt) }
      : {}),
    sortOrder: thread.sortOrder,
    ...(thread.resolvedSessionId || thread.threadStatus === 'RESOLVED'
      ? { resolvedAt: row.updatedAt.toISOString() }
      : {}),
  };
}

export function sortLivingEntries(entries: DashboardOpenThreadEntry[]): void {
  entries.sort((a, b) => {
    const statusOrder =
      STATUS_SORT_ORDER[a.threadStatus] - STATUS_SORT_ORDER[b.threadStatus];
    if (statusOrder !== 0) return statusOrder;
    const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function sortByResolvedAt(entries: DashboardOpenThreadEntry[]): void {
  entries.sort((a, b) =>
    (b.resolvedAt ?? b.updatedAt).localeCompare(a.resolvedAt ?? a.updatedAt),
  );
}

/**
 * Dashboard Living Threads buckets for the campaign home rail.
 */
export async function buildDashboardThreadBundle(
  campaignId: string,
  role: CampaignMemberRole | null,
  options?: {
    livingLimit?: number;
    theoriesLimit?: number;
    recentlyResolvedLimit?: number;
  },
): Promise<DashboardThreadBundle> {
  const livingLimit = options?.livingLimit ?? 8;
  const theoriesLimit = options?.theoriesLimit ?? 5;
  const recentlyResolvedLimit = options?.recentlyResolvedLimit ?? 5;

  const threadsRootId = await ensureNarrativeThreadsSystemCategoryKey(campaignId);
  if (!threadsRootId) {
    return { living: [], theories: [], recentlyResolved: [] };
  }

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
    },
  });

  const threadRows: ThreadHubPageRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    parentId: row.parentId,
    visibility: row.visibility,
    metadata: row.metadata,
    blocks: row.blocks,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
  }));

  const visible = collectVisibleThreadSubtreeRows(threadRows, threadsRootId, role);
  const topLevel = visible.filter((row) => row.parentId === threadsRootId);

  const lifecycleMap = await getLifecycleStates(
    campaignId,
    NarrativeLifecycleSubjectKinds.OPEN_THREAD,
    topLevel.map((row) => row.id),
  );
  const viewerCtx = await buildNarrativeViewerContextFromCampaign(campaignId, role);
  const visibleTopLevel = topLevel.filter((row) =>
    isThreadVisibleToViewer(row.id, lifecycleMap, viewerCtx),
  );

  const includeSignals =
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
  const cutoffMs = Date.now() - DASHBOARD_RECENTLY_RESOLVED_DAYS * 24 * 60 * 60 * 1000;

  const livingCandidates: DashboardOpenThreadEntry[] = [];
  const theoryCandidates: DashboardOpenThreadEntry[] = [];
  const resolvedCandidates: DashboardOpenThreadEntry[] = [];

  for (const row of visibleTopLevel) {
    const thread = parseThreadMetadata(row.metadata);
    const lifecycle =
      lifecycleMap.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    const entry = rowToEntry(row, lifecycleMap, includeSignals);

    const isTheory = isPlayerTheoryThread(thread.threadKind, thread.playerSubmitted);
    const isResolved =
      thread.threadStatus === 'RESOLVED' ||
      lifecycle === NarrativeLifecycleStates.COMPLETED;
    const isRecentlyResolved =
      isResolved && row.updatedAt.getTime() >= cutoffMs;

    if (isRecentlyResolved) {
      resolvedCandidates.push(entry);
      continue;
    }

    if (!LIVING_LIFECYCLE.has(lifecycle)) continue;
    if (!LIVING_STATUS.has(thread.threadStatus)) continue;

    if (isTheory) {
      theoryCandidates.push(entry);
    } else {
      livingCandidates.push(entry);
    }
  }

  sortLivingEntries(livingCandidates);
  sortLivingEntries(theoryCandidates);
  sortByResolvedAt(resolvedCandidates);

  return {
    living: livingCandidates.slice(0, livingLimit),
    theories: theoryCandidates.slice(0, theoriesLimit),
    recentlyResolved: resolvedCandidates.slice(0, recentlyResolvedLimit),
  };
}

/** @deprecated Use buildDashboardThreadBundle */
export async function buildDashboardOpenThreadEntries(
  campaignId: string,
  role: CampaignMemberRole | null,
  options?: { limit?: number },
): Promise<DashboardOpenThreadEntry[]> {
  const bundle = await buildDashboardThreadBundle(campaignId, role, {
    livingLimit: options?.limit ?? 8,
    theoriesLimit: 0,
    recentlyResolvedLimit: 0,
  });
  return bundle.living;
}
