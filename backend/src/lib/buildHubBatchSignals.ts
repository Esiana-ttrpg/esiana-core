import { prisma } from './prisma.js';
import { SessionScheduleStatus } from './notifications/types.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import { campaignWikiHref } from './dashboardPaths.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  campaignDashboardPath,
  campaignDowntimeHubPath,
  campaignNotePath,
  campaignThreadsHubPath,
} from './notifications/deepLinks.js';
import { countPendingLedgerSuggestions } from './ledgerSuggestionService.js';

export type HubMomentumLabel = 'strong' | 'steady' | 'fading' | 'stalled';

export type HubLastSessionSignal = {
  title: string;
  playedAt: string | null;
  snippet: string | null;
  timelinePointId: string;
};

export type HubRecentEditItem = {
  campaignId: string;
  campaignName: string;
  campaignHandle: string;
  entityType: string;
  entityId: string;
  title: string;
  href: string;
  updatedAt: string;
};

export type HubPartyPreviewMember = {
  id: string;
  label: string;
  avatarUrl: string | null;
};

export type HubQuickAction = {
  label: string;
  href: string;
};

export type HubCampaignBatchSignals = {
  lastSession: HubLastSessionSignal | null;
  momentum: { label: HubMomentumLabel; daysSinceLastSession: number | null };
  attentionCounts: {
    openThreads: number;
    unresolvedWikilinks: number;
    pendingDowntime: number;
    missingRecap: boolean;
  };
  recentEdits: HubRecentEditItem[];
  partyPreview: HubPartyPreviewMember[];
  quickActions: HubQuickAction[];
  topThreadTitle: string | null;
  topThreadHref: string | null;
  topQuestTitle: string | null;
  heroCurrentArc: string | null;
  heroSummary: string | null;
};

export type CampaignHubContext = {
  campaignId: string;
  handle: string;
  name: string;
  role: CampaignMemberRole;
  description: string | null;
  recruitmentTagline: string | null;
  dashboardConfig: unknown;
};

function isDmRole(role: CampaignMemberRole): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function parseHeroFromConfig(dashboardConfig: unknown): {
  currentArc: string | null;
  summary: string | null;
} {
  if (!dashboardConfig || typeof dashboardConfig !== 'object') {
    return { currentArc: null, summary: null };
  }
  const hero = (dashboardConfig as { hero?: unknown }).hero;
  if (!hero || typeof hero !== 'object') {
    return { currentArc: null, summary: null };
  }
  const h = hero as Record<string, unknown>;
  const currentArc =
    typeof h.currentArc === 'string' && h.currentArc.trim() ? h.currentArc.trim() : null;
  const summary =
    typeof h.summary === 'string' && h.summary.trim() ? h.summary.trim() : null;
  return { currentArc, summary };
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function computeMomentum(input: {
  lastPlayedAt: string | null;
  nextSessionAt: string | null;
  lastActivityAt: string | null;
}): { label: HubMomentumLabel; daysSinceLastSession: number | null } {
  const daysSinceSession = daysSince(input.lastPlayedAt);
  const hasUpcoming =
    input.nextSessionAt != null &&
    new Date(input.nextSessionAt).getTime() >= Date.now() &&
    new Date(input.nextSessionAt).getTime() <= Date.now() + 7 * 86_400_000;

  if (
    (daysSinceSession != null && daysSinceSession <= 14) ||
    hasUpcoming
  ) {
    return { label: 'strong', daysSinceLastSession: daysSinceSession };
  }
  if (daysSinceSession != null && daysSinceSession <= 30) {
    return { label: daysSinceSession <= 14 ? 'steady' : 'fading', daysSinceLastSession: daysSinceSession };
  }
  if (input.lastActivityAt) {
    const activityDays = daysSince(input.lastActivityAt);
    if (activityDays != null && activityDays <= 30) {
      return { label: 'steady', daysSinceLastSession: daysSinceSession };
    }
  }
  if (daysSinceSession == null && !input.nextSessionAt) {
    return { label: 'stalled', daysSinceLastSession: null };
  }
  return { label: 'stalled', daysSinceLastSession: daysSinceSession };
}

function stripSnippet(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export async function batchLastSessions(
  campaignIds: string[],
): Promise<Map<string, HubLastSessionSignal>> {
  const map = new Map<string, HubLastSessionSignal>();
  if (campaignIds.length === 0) return map;

  const now = new Date();
  const rows = await prisma.campaignSessionSchedule.findMany({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { lt: now },
      timelinePoint: { campaignId: { in: campaignIds } },
    },
    orderBy: { plannedStartAt: 'desc' },
    include: {
      timelinePoint: {
        select: {
          campaignId: true,
          id: true,
          wikiPage: { select: { title: true, blocks: true } },
        },
      },
    },
  });

  for (const row of rows) {
    const campaignId = row.timelinePoint.campaignId;
    if (map.has(campaignId)) continue;
    const blocks = row.timelinePoint.wikiPage.blocks;
    const raw =
      typeof blocks === 'string'
        ? blocks
        : JSON.stringify(blocks ?? '');
    const snippet = stripSnippet(raw) || null;
    map.set(campaignId, {
      title: row.timelinePoint.wikiPage.title,
      playedAt: row.plannedStartAt?.toISOString() ?? row.publishedAt?.toISOString() ?? null,
      snippet,
      timelinePointId: row.timelinePoint.id,
    });
  }
  return map;
}

export async function batchLivingThreadCounts(
  campaignIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (campaignIds.length === 0) return map;

  const rows = await prisma.narrativeLifecycleState.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: campaignIds },
      subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      lifecycleState: {
        in: [NarrativeLifecycleStates.ACTIVE, NarrativeLifecycleStates.DISCOVERED],
      },
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    map.set(row.campaignId, row._count._all);
  }
  return map;
}

export type HubTopThreadRef = {
  title: string;
  href: string;
};

function resolveTopThreadHref(
  campaignHandle: string,
  page: {
    id: string;
    title: string;
    parentId: string | null;
    templateType: string;
    workspace?: string | null;
    pathKey?: string | null;
    metadata?: unknown;
  },
): string {
  const href = buildWikiPageHref(campaignHandle, page);
  if (href.endsWith('/dashboard')) {
    return campaignThreadsHubPath(campaignHandle);
  }
  return href;
}

export async function batchTopThreadRefs(
  contexts: CampaignHubContext[],
): Promise<Map<string, HubTopThreadRef>> {
  const map = new Map<string, HubTopThreadRef>();
  const campaignIds = contexts.map((c) => c.campaignId);
  if (campaignIds.length === 0) return map;

  const handleByCampaignId = new Map(contexts.map((c) => [c.campaignId, c.handle]));

  const lifecycles = await prisma.narrativeLifecycleState.findMany({
    where: {
      campaignId: { in: campaignIds },
      subjectKind: NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      lifecycleState: {
        in: [NarrativeLifecycleStates.ACTIVE, NarrativeLifecycleStates.DISCOVERED],
      },
    },
    orderBy: { updatedAt: 'desc' },
    select: { campaignId: true, subjectId: true },
  });

  const pageIdsByCampaign = new Map<string, string>();
  for (const row of lifecycles) {
    if (!pageIdsByCampaign.has(row.campaignId)) {
      pageIdsByCampaign.set(row.campaignId, row.subjectId);
    }
  }

  const pageIds = [...pageIdsByCampaign.values()];
  if (pageIds.length === 0) return map;

  const pages = await prisma.wikiPage.findMany({
    where: { id: { in: pageIds } },
    select: wikiPageHrefSelect,
  });
  const pageById = new Map(pages.map((p) => [p.id, p]));

  for (const [campaignId, pageId] of pageIdsByCampaign) {
    const page = pageById.get(pageId);
    const handle = handleByCampaignId.get(campaignId);
    if (!page || !handle) continue;
    map.set(campaignId, {
      title: page.title,
      href: resolveTopThreadHref(handle, page),
    });
  }
  return map;
}

export async function batchTopQuestTitles(
  campaignIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (campaignIds.length === 0) return map;

  const lifecycles = await prisma.narrativeLifecycleState.findMany({
    where: {
      campaignId: { in: campaignIds },
      subjectKind: NarrativeLifecycleSubjectKinds.QUEST,
      lifecycleState: NarrativeLifecycleStates.ACTIVE,
    },
    orderBy: { updatedAt: 'desc' },
    select: { campaignId: true, subjectId: true },
  });

  const pageIdsByCampaign = new Map<string, string>();
  for (const row of lifecycles) {
    if (!pageIdsByCampaign.has(row.campaignId)) {
      pageIdsByCampaign.set(row.campaignId, row.subjectId);
    }
  }

  const pageIds = [...pageIdsByCampaign.values()];
  if (pageIds.length === 0) return map;

  const pages = await prisma.wikiPage.findMany({
    where: { id: { in: pageIds } },
    select: { id: true, title: true },
  });
  const titleByPageId = new Map(pages.map((p) => [p.id, p.title]));

  for (const [campaignId, pageId] of pageIdsByCampaign) {
    const title = titleByPageId.get(pageId);
    if (title) map.set(campaignId, title);
  }
  return map;
}

export async function batchUnresolvedWikilinkCounts(
  managedCampaignIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (managedCampaignIds.length === 0) return map;

  const rows = await prisma.unresolvedWikilink.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: managedCampaignIds },
      status: 'OPEN',
    },
    _count: { _all: true },
  });

  for (const row of rows) {
    map.set(row.campaignId, row._count._all);
  }
  return map;
}

export async function batchPendingDowntimeCounts(
  managedCampaignIds: string[],
): Promise<Map<string, number>> {
  const { countPendingDevelopmentsWhenEnabled } = await import(
    './worldDevelopmentService.js'
  );
  const map = new Map<string, number>();
  await Promise.all(
    managedCampaignIds.map(async (campaignId) => {
      const [ledgerCount, developmentCount] = await Promise.all([
        countPendingLedgerSuggestions(campaignId),
        countPendingDevelopmentsWhenEnabled(campaignId),
      ]);
      const total = ledgerCount + developmentCount;
      if (total > 0) map.set(campaignId, total);
    }),
  );
  return map;
}

export async function batchRecentEditsForCampaigns(
  contexts: CampaignHubContext[],
  perCampaign = 2,
): Promise<Map<string, HubRecentEditItem[]>> {
  const map = new Map<string, HubRecentEditItem[]>();
  await Promise.all(
    contexts.map(async (ctx) => {
      const rows = await prisma.wikiPage.findMany({
        where: { campaignId: ctx.campaignId },
        select: {
          id: true,
          title: true,
          parentId: true,
          updatedAt: true,
          templateType: true,
          workspace: true,
          pathKey: true,
          metadata: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: perCampaign,
      });
      map.set(
        ctx.campaignId,
        rows.map((r) => ({
          campaignId: ctx.campaignId,
          campaignName: ctx.name,
          campaignHandle: ctx.handle,
          entityType: 'WIKI_PAGE',
          entityId: r.id,
          title: r.title,
          href: campaignWikiHref(ctx.handle, r),
          updatedAt: r.updatedAt.toISOString(),
        })),
      );
    }),
  );
  return map;
}

export async function batchPartyPreview(
  campaignIds: string[],
  maxPerCampaign = 5,
): Promise<Map<string, HubPartyPreviewMember[]>> {
  const map = new Map<string, HubPartyPreviewMember[]>();
  if (campaignIds.length === 0) return map;

  const members = await prisma.campaignMember.findMany({
    where: {
      campaignId: { in: campaignIds },
      role: {
        in: [
          CampaignMemberRoles.PARTICIPANT,
          CampaignMemberRoles.GAMEMASTER,
          CampaignMemberRoles.WRITER,
        ],
      },
    },
    include: {
      user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const m of members) {
    const list = map.get(m.campaignId) ?? [];
    if (list.length >= maxPerCampaign) continue;
    const label = m.user.displayName?.trim() || m.user.email.split('@')[0] || 'Player';
    list.push({
      id: m.user.id,
      label,
      avatarUrl: m.user.avatarUrl,
    });
    map.set(m.campaignId, list);
  }
  return map;
}

function buildQuickActions(
  ctx: CampaignHubContext,
  nextTimelinePointId: string | null,
): HubQuickAction[] {
  const actions: HubQuickAction[] = [
    { label: 'Enter Campaign', href: campaignDashboardPath(ctx.handle) },
  ];
  if (nextTimelinePointId) {
    actions.push({
      label: isDmRole(ctx.role) ? 'Open Session Notes' : 'Open Notes',
      href: campaignNotePath(ctx.handle, nextTimelinePointId),
    });
  }
  if (isDmRole(ctx.role)) {
    actions.push({
      label: 'Review Downtime',
      href: campaignDowntimeHubPath(ctx.handle),
    });
  }
  return actions.slice(0, 4);
}

export async function buildHubBatchSignalsForCampaigns(input: {
  contexts: CampaignHubContext[];
  lastActivityByCampaignId: Map<string, string | null>;
  nextSessionByCampaignId: Map<string, { timelinePointId: string; plannedStartAt: string | null }>;
}): Promise<Map<string, HubCampaignBatchSignals>> {
  const campaignIds = input.contexts.map((c) => c.campaignId);
  const managedIds = input.contexts.filter((c) => isDmRole(c.role)).map((c) => c.campaignId);

  const [
    lastSessions,
    threadCounts,
    wikilinkCounts,
    downtimeCounts,
    recentEditsMap,
    partyPreviewMap,
    topThreads,
    topQuests,
  ] = await Promise.all([
    batchLastSessions(campaignIds),
    batchLivingThreadCounts(campaignIds),
    batchUnresolvedWikilinkCounts(managedIds),
    batchPendingDowntimeCounts(managedIds),
    batchRecentEditsForCampaigns(input.contexts),
    batchPartyPreview(campaignIds),
    batchTopThreadRefs(input.contexts),
    batchTopQuestTitles(campaignIds),
  ]);

  const result = new Map<string, HubCampaignBatchSignals>();

  for (const ctx of input.contexts) {
    const lastSession = lastSessions.get(ctx.campaignId) ?? null;
    const nextSession = input.nextSessionByCampaignId.get(ctx.campaignId);
    const missingRecap =
      lastSession != null && (!lastSession.snippet || lastSession.snippet.length < 8);
    const hero = parseHeroFromConfig(ctx.dashboardConfig);

    const momentum = computeMomentum({
      lastPlayedAt: lastSession?.playedAt ?? null,
      nextSessionAt: nextSession?.plannedStartAt ?? null,
      lastActivityAt: input.lastActivityByCampaignId.get(ctx.campaignId) ?? null,
    });

    result.set(ctx.campaignId, {
      lastSession,
      momentum,
      attentionCounts: {
        openThreads: threadCounts.get(ctx.campaignId) ?? 0,
        unresolvedWikilinks: wikilinkCounts.get(ctx.campaignId) ?? 0,
        pendingDowntime: downtimeCounts.get(ctx.campaignId) ?? 0,
        missingRecap,
      },
      recentEdits: recentEditsMap.get(ctx.campaignId) ?? [],
      partyPreview: partyPreviewMap.get(ctx.campaignId) ?? [],
      quickActions: buildQuickActions(ctx, nextSession?.timelinePointId ?? lastSession?.timelinePointId ?? null),
      topThreadTitle: topThreads.get(ctx.campaignId)?.title ?? null,
      topThreadHref: topThreads.get(ctx.campaignId)?.href ?? null,
      topQuestTitle: topQuests.get(ctx.campaignId) ?? null,
      heroCurrentArc: hero.currentArc,
      heroSummary: hero.summary,
    });
  }

  return result;
}

export function mergeGlobalRecentEdits(
  batchMap: Map<string, HubRecentEditItem[]>,
  limit = 8,
): HubRecentEditItem[] {
  const all: HubRecentEditItem[] = [];
  for (const items of batchMap.values()) {
    all.push(...items);
  }
  all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return all.slice(0, limit);
}
