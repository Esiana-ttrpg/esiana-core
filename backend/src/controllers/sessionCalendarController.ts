import type { Response } from 'express';
import type { Prisma } from '../lib/prismaClient.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { prisma } from '../lib/prisma.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import {
  projectSessionCalendarEvent,
  SESSION_CALENDAR_STATUSES,
} from '../lib/sessionCalendar.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const PRIVILEGED_ROLES = new Set<string>([
  CampaignMemberRoles.GAMEMASTER,
  CampaignMemberRoles.WRITER,
]);

type CalendarQuery = {
  from: Date | null;
  to: Date | null;
  limit: number;
  cursor: string | null;
};

type VisibleCampaignClause = {
  campaignId: string;
  wikiPage?: { visibility: { in: string[] } };
};

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseSessionCalendarQuery(
  query: Record<string, unknown>,
  defaultFrom: Date | null,
): CalendarQuery | { error: string } {
  const parsedFrom = parseDate(query.from);
  const parsedTo = parseDate(query.to);
  if (parsedFrom === undefined) return { error: 'from must be a valid ISO 8601 date-time' };
  if (parsedTo === undefined) return { error: 'to must be a valid ISO 8601 date-time' };
  const from = query.from === undefined ? defaultFrom : parsedFrom;
  const to = parsedTo;
  if (from && to && from > to) return { error: 'from must be before or equal to to' };

  const rawLimit = Number.parseInt(String(query.limit ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(rawLimit) || rawLimit < 1) {
    return { error: 'limit must be a positive integer' };
  }
  return {
    from,
    to,
    limit: Math.min(rawLimit, MAX_LIMIT),
    cursor:
      typeof query.cursor === 'string' && query.cursor.trim()
        ? query.cursor.trim()
        : null,
  };
}

const calendarInclude = {
  timelinePoint: {
    include: {
      wikiPage: { select: { title: true, updatedAt: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          handle: true,
          scheduleTimezone: true,
          updatedAt: true,
        },
      },
    },
  },
} as const;

async function sendCalendarEvents(
  res: Response,
  query: CalendarQuery,
  scopeWhere: Prisma.CampaignSessionScheduleWhereInput,
): Promise<void> {
  const rows = await prisma.campaignSessionSchedule.findMany({
    where: {
      ...scopeWhere,
      status: { in: [...SESSION_CALENDAR_STATUSES] },
      plannedStartAt: {
        not: null,
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      },
    },
    orderBy: [{ plannedStartAt: 'asc' }, { timelinePointId: 'asc' }],
    take: query.limit + 1,
    ...(query.cursor
      ? { cursor: { timelinePointId: query.cursor }, skip: 1 }
      : {}),
    include: calendarInclude,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  res.json({
    events: page.map((row) => projectSessionCalendarEvent({ ...row, plannedStartAt: row.plannedStartAt! })),
    nextCursor: hasMore ? page.at(-1)?.timelinePointId ?? null : null,
  });
}

async function getVisibleCampaignClauses(
  userId: string,
): Promise<VisibleCampaignClause[]> {
  const memberships = await prisma.campaignMember.findMany({
    where: { userId },
    select: { campaignId: true, role: true },
  });
  return memberships.map((membership) => ({
    campaignId: membership.campaignId,
    ...(!PRIVILEGED_ROLES.has(membership.role)
      ? {
          wikiPage: {
            visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] },
          },
        }
      : {}),
  }));
}

/** Live aggregate projection used by both authenticated downloads and token feeds. */
export async function loadVisibleUserCalendarEvents(
  userId: string,
  from: Date = new Date(),
) {
  const visibleCampaigns = await getVisibleCampaignClauses(userId);
  if (visibleCampaigns.length === 0) return [];
  const rows = await prisma.campaignSessionSchedule.findMany({
    where: {
      status: { in: [...SESSION_CALENDAR_STATUSES] },
      plannedStartAt: { not: null, gte: from },
      timelinePoint: { OR: visibleCampaigns },
    },
    orderBy: [{ plannedStartAt: 'asc' }, { timelinePointId: 'asc' }],
    include: calendarInclude,
  });
  return rows.map((row) =>
    projectSessionCalendarEvent({ ...row, plannedStartAt: row.plannedStartAt! }),
  );
}

export async function listMySessionCalendar(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const query = parseSessionCalendarQuery(req.query as Record<string, unknown>, new Date());
  if ('error' in query) {
    res.status(400).json({ error: query.error });
    return;
  }
  const visibleCampaigns = await getVisibleCampaignClauses(req.user!.id);
  if (visibleCampaigns.length === 0) {
    res.json({ events: [], nextCursor: null });
    return;
  }
  await sendCalendarEvents(res, query, {
    timelinePoint: { OR: visibleCampaigns },
  });
}

export async function listCampaignSessionCalendar(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const query = parseSessionCalendarQuery(req.query as Record<string, unknown>, null);
  if ('error' in query) {
    res.status(400).json({ error: query.error });
    return;
  }
  const privileged = PRIVILEGED_ROLES.has(req.campaign!.role ?? '');
  await sendCalendarEvents(res, query, {
    timelinePoint: {
      campaignId: req.campaign!.campaignId,
      ...(!privileged
        ? {
            wikiPage: {
              visibility: { in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY] },
            },
          }
        : {}),
    },
  });
}
