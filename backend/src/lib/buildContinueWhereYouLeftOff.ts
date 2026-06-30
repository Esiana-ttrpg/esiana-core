import { prisma } from './prisma.js';
import { canViewWikiPage } from './wikiTree.js';
import { campaignWikiHref } from './dashboardPaths.js';
import { campaignNotePath } from './notifications/deepLinks.js';
import { formatRelativeEditAge } from './editorialFreshness.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import type { DashboardLastSessionSummary, DashboardSessionSummary } from './buildDashboardSessions.js';

export type ContinueWhereYouLeftOffItem = {
  entityType: 'WIKI_PAGE' | 'SESSION';
  entityId: string;
  title: string;
  href: string;
  reason: string;
  updatedAt?: string;
};

type ComposeInput = {
  campaignId: string;
  campaignHandle: string;
  userId: string;
  role: CampaignMemberRole | null;
  nextSession: DashboardSessionSummary | null;
  lastSession: DashboardLastSessionSummary | null;
};

function isDmRole(role: CampaignMemberRole | null): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

export async function buildContinueWhereYouLeftOff(
  input: ComposeInput,
): Promise<ContinueWhereYouLeftOffItem[]> {
  const { campaignId, campaignHandle, userId, role, nextSession, lastSession } = input;
  const limit = 8;
  const seen = new Set<string>();
  const items: ContinueWhereYouLeftOffItem[] = [];

  function push(item: ContinueWhereYouLeftOffItem) {
    const key = `${item.entityType}:${item.entityId}`;
    if (seen.has(key) || items.length >= limit) return;
    seen.add(key);
    items.push(item);
  }

  if (nextSession) {
    push({
      entityType: 'SESSION',
      entityId: nextSession.timelinePointId,
      title: nextSession.title,
      href: campaignNotePath(campaignHandle, nextSession.timelinePointId),
      reason: 'Next session',
      updatedAt: nextSession.plannedStartAt ?? undefined,
    });
  }

  if (lastSession) {
    push({
      entityType: 'SESSION',
      entityId: lastSession.timelinePointId,
      title: lastSession.title,
      href: campaignNotePath(campaignHandle, lastSession.timelinePointId),
      reason: 'Last session recap',
      updatedAt: lastSession.playedAt ?? undefined,
    });
  }

  const touched = await prisma.wikiPageStats.findMany({
    where: {
      campaignId,
      lastEditedByUserId: userId,
    },
    select: {
      pageId: true,
      lastEditedAt: true,
      page: {
        select: {
          id: true,
          title: true,
          parentId: true,
          visibility: true,
          templateType: true,
          workspace: true,
          pathKey: true,
          metadata: true,
        },
      },
    },
    orderBy: { lastEditedAt: 'desc' },
    take: isDmRole(role) ? 6 : 12,
  });

  for (const row of touched) {
    if (!canViewWikiPage(row.page.visibility, role)) continue;
    const age = formatRelativeEditAge(row.lastEditedAt);
    push({
      entityType: 'WIKI_PAGE',
      entityId: row.page.id,
      title: row.page.title,
      href: campaignWikiHref(campaignHandle, row.page),
      reason: `You edited this ${age}`,
      updatedAt: row.lastEditedAt.toISOString(),
    });
  }

  return items;
}

export async function buildPersonalPinned(
  campaignId: string,
  campaignHandle: string,
  userId: string,
  role: CampaignMemberRole | null,
): Promise<
  Array<{ id: string; title: string; href: string; freshnessLabel?: string | null }>
> {
  const shortcuts = await prisma.pageShortcut.findMany({
    where: { userId, campaignId },
    include: {
      page: {
        select: {
          id: true,
          title: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          templateType: true,
          workspace: true,
          pathKey: true,
          metadata: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const { formatEditorialFreshness } = await import('./editorialFreshness.js');

  return shortcuts
    .filter((s) => canViewWikiPage(s.page.visibility, role))
    .map((s) => ({
      id: s.page.id,
      title: s.page.title,
      href: campaignWikiHref(campaignHandle, s.page),
      freshnessLabel: formatEditorialFreshness(s.page.updatedAt),
    }));
}
