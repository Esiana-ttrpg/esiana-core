import { prisma } from './prisma.js';
import { sessionSnippet } from './sessionSnippet.js';
import { SessionScheduleStatus } from './notifications/types.js';
import {
  compileSessionNotesForCampaign,
  extractCompileMarkdown,
} from './sessionNotesCompile.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { WikiVisibility } from '../types/domain.js';

function visibleSessionPage(role: CampaignMemberRole | null) {
  const elevated = role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
  return { deletedAt: null, ...(elevated ? {} : { visibility: { in: role ? [WikiVisibility.PUBLIC, WikiVisibility.PARTY] : [WikiVisibility.PUBLIC] } }) };
}

export type DashboardSessionSummary = {
  timelinePointId: string;
  title: string;
  plannedStartAt: string | null;
  sequenceOrder: number | null;
};

export type DashboardLastSessionSummary = DashboardSessionSummary & {
  playedAt: string | null;
  snippet: string | null;
};

export async function fetchNextDashboardSession(
  campaignId: string,
  role: CampaignMemberRole | null = null,
): Promise<DashboardSessionSummary | null> {
  const now = new Date();
  const row = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now },
      timelinePoint: { campaignId, wikiPage: visibleSessionPage(role) },
    },
    orderBy: { plannedStartAt: 'asc' },
    include: {
      timelinePoint: {
        select: { id: true, sequenceOrder: true, wikiPage: { select: { title: true } } },
      },
    },
  });

  if (!row) return null;

  return {
    timelinePointId: row.timelinePointId,
    title: row.timelinePoint.wikiPage.title,
    plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
    sequenceOrder: row.timelinePoint.sequenceOrder,
  };
}

export async function fetchLastDashboardSession(
  campaignId: string,
  role: CampaignMemberRole | null,
): Promise<DashboardLastSessionSummary | null> {
  const now = new Date();
  const row = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.COMPLETED,
      plannedStartAt: { lt: now },
      timelinePoint: { campaignId, wikiPage: visibleSessionPage(role) },
    },
    orderBy: { plannedStartAt: 'desc' },
    include: {
      timelinePoint: {
        select: {
          id: true,
          sequenceOrder: true,
          wikiPageId: true,
          wikiPage: { select: { title: true, id: true, blocks: true } },
        },
      },
    },
  });

  if (!row) return null;

  const canManage =
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;

  let snippet: string | null = sessionSnippet(
    extractCompileMarkdown(row.timelinePoint.wikiPage.blocks),
  );

  if (!snippet) {
    try {
      const compiled = await compileSessionNotesForCampaign(campaignId, canManage, {
        sessionPageId: row.timelinePoint.wikiPage.id,
        orderBy: 'timeline',
      });
      snippet = sessionSnippet(compiled.compiledMarkdown) || null;
    } catch {
      snippet = null;
    }
  }

  return {
    timelinePointId: row.timelinePointId,
    title: row.timelinePoint.wikiPage.title,
    plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
    sequenceOrder: row.timelinePoint.sequenceOrder,
    playedAt: row.plannedStartAt?.toISOString() ?? row.publishedAt?.toISOString() ?? null,
    snippet,
  };
}

export function formatSessionStatusLabel(
  next: DashboardSessionSummary | null,
  last: DashboardLastSessionSummary | null,
): string | null {
  if (next?.title) {
    return `Next: ${next.title}`;
  }
  if (last?.title) {
    return `${last.title} complete`;
  }
  return null;
}
