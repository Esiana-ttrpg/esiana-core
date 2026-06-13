import { prisma } from './prisma.js';
import { SessionScheduleStatus } from './notifications/types.js';
import {
  compileSessionNotesForCampaign,
  extractCompileMarkdown,
} from './sessionNotesCompile.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';

const SNIPPET_MAX = 200;

function stripMarkdownForSnippet(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SNIPPET_MAX);
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
): Promise<DashboardSessionSummary | null> {
  const now = new Date();
  const row = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now },
      timelinePoint: { campaignId },
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
  let row = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { lt: now },
      timelinePoint: { campaignId },
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

  if (!row) {
    const fallbackTimeline = await prisma.campaignSessionTimeline.findFirst({
      where: { campaignId },
      orderBy: { sequenceOrder: 'desc' },
      include: {
        wikiPage: { select: { title: true, id: true, blocks: true } },
        schedule: true,
      },
    });
    if (!fallbackTimeline) return null;
    const playedAt =
      fallbackTimeline.schedule?.plannedStartAt?.toISOString() ??
      fallbackTimeline.schedule?.publishedAt?.toISOString() ??
      null;
    const snippet = stripMarkdownForSnippet(
      extractCompileMarkdown(fallbackTimeline.wikiPage.blocks),
    );
    return {
      timelinePointId: fallbackTimeline.id,
      title: fallbackTimeline.wikiPage.title,
      plannedStartAt: fallbackTimeline.schedule?.plannedStartAt?.toISOString() ?? null,
      sequenceOrder: fallbackTimeline.sequenceOrder,
      playedAt,
      snippet: snippet || null,
    };
  }

  const canManage =
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;

  let snippet: string | null = stripMarkdownForSnippet(
    extractCompileMarkdown(row.timelinePoint.wikiPage.blocks),
  );

  if (!snippet) {
    try {
      const compiled = await compileSessionNotesForCampaign(campaignId, canManage, {
        sessionPageId: row.timelinePoint.wikiPage.id,
        orderBy: 'timeline',
      });
      snippet = stripMarkdownForSnippet(compiled.compiledMarkdown) || null;
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
