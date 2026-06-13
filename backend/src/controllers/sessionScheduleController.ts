import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  notifyUsersAsync,
  getCampaignMemberUserIds,
  getOperationalManagerUserIds,
} from '../lib/notifications/notificationService.js';
import {
  NotificationType,
  SessionAttendanceStatus,
  SessionScheduleStatus,
} from '../lib/notifications/types.js';
import {
  campaignDashboardPath,
  campaignNotePath,
} from '../lib/notifications/deepLinks.js';
import { resolveUserDisplayName } from '../lib/userDisplay.js';

const RSVP_DEBOUNCE_MS = 5 * 60 * 1000;
const rsvpDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function serializeSchedule(row: {
  timelinePointId: string;
  status: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  timezone: string | null;
  venueType: string | null;
  venueLabel: string | null;
  venueUrl: string | null;
  locationPageId: string | null;
  reminderSentAt: Date | null;
  publishedAt: Date | null;
}) {
  return {
    timelinePointId: row.timelinePointId,
    status: row.status,
    plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: row.plannedEndAt?.toISOString() ?? null,
    timezone: row.timezone,
    venueType: row.venueType,
    venueLabel: row.venueLabel,
    venueUrl: row.venueUrl,
    locationPageId: row.locationPageId,
    reminderSentAt: row.reminderSentAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

async function getTimelineInCampaign(
  campaignId: string,
  timelinePointId: string,
) {
  return prisma.campaignSessionTimeline.findFirst({
    where: { id: timelinePointId, campaignId },
    include: {
      wikiPage: { select: { title: true } },
      schedule: true,
    },
  });
}

export async function getSessionSchedule(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const timeline = await getTimelineInCampaign(
    req.campaign!.campaignId,
    timelinePointId,
  );
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({
    schedule: timeline.schedule ? serializeSchedule(timeline.schedule) : null,
    sessionTitle: timeline.wikiPage.title,
    sequenceOrder: timeline.sequenceOrder,
  });
}

export async function patchSessionSchedule(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const timeline = await getTimelineInCampaign(campaignId, timelinePointId);
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const previous = timeline.schedule;

  const data: Record<string, unknown> = {};
  if (body.plannedStartAt !== undefined) {
    data.plannedStartAt =
      body.plannedStartAt === null || body.plannedStartAt === ''
        ? null
        : new Date(String(body.plannedStartAt));
  }
  if (body.plannedEndAt !== undefined) {
    data.plannedEndAt =
      body.plannedEndAt === null || body.plannedEndAt === ''
        ? null
        : new Date(String(body.plannedEndAt));
  }
  if (body.timezone !== undefined) {
    data.timezone =
      body.timezone === null || body.timezone === ''
        ? null
        : String(body.timezone).trim();
  }
  if (body.venueType !== undefined) {
    data.venueType =
      body.venueType === null || body.venueType === ''
        ? null
        : String(body.venueType).trim();
  }
  if (body.venueLabel !== undefined) {
    data.venueLabel =
      body.venueLabel === null || body.venueLabel === ''
        ? null
        : String(body.venueLabel).trim();
  }
  if (body.venueUrl !== undefined) {
    data.venueUrl =
      body.venueUrl === null || body.venueUrl === ''
        ? null
        : String(body.venueUrl).trim();
  }
  if (body.locationPageId !== undefined) {
    data.locationPageId =
      body.locationPageId === null || body.locationPageId === ''
        ? null
        : String(body.locationPageId).trim();
  }
  if (body.status !== undefined) {
    data.status = String(body.status).trim();
  }

  const schedule = await prisma.campaignSessionSchedule.upsert({
    where: { timelinePointId },
    create: {
      timelinePointId,
      status: SessionScheduleStatus.DRAFT,
      ...data,
    } as any,
    update: data,
  });

  const wasPublished =
    previous?.status === SessionScheduleStatus.PUBLISHED ||
    schedule.status === SessionScheduleStatus.PUBLISHED;

  if (
    wasPublished &&
    previous &&
    schedule.status !== SessionScheduleStatus.CANCELLED &&
    (previous.plannedStartAt?.getTime() !== schedule.plannedStartAt?.getTime() ||
      previous.plannedEndAt?.getTime() !== schedule.plannedEndAt?.getTime() ||
      previous.timezone !== schedule.timezone ||
      previous.venueType !== schedule.venueType ||
      previous.venueLabel !== schedule.venueLabel ||
      previous.venueUrl !== schedule.venueUrl ||
      previous.locationPageId !== schedule.locationPageId)
  ) {
    const memberIds = await getCampaignMemberUserIds(campaignId);
    notifyUsersAsync({
      userIds: memberIds,
      type: NotificationType.SESSION_CHANGED,
      title: `${timeline.wikiPage.title} details updated`,
      body: 'The date, time, or location for an upcoming session has changed.',
      linkUrl: campaignNotePath(slug ?? '', timelinePointId),
      campaignId,
    });
  }

  if (
    previous?.status !== SessionScheduleStatus.CANCELLED &&
    schedule.status === SessionScheduleStatus.CANCELLED
  ) {
    const memberIds = await getCampaignMemberUserIds(campaignId);
    notifyUsersAsync({
      userIds: memberIds,
      type: NotificationType.SESSION_CANCELLED,
      title: `${timeline.wikiPage.title} cancelled`,
      body: 'A scheduled session has been cancelled.',
      linkUrl: campaignNotePath(slug ?? '', timelinePointId),
      campaignId,
    });
  }

  res.json({ schedule: serializeSchedule(schedule) });
}

export async function publishSessionSchedule(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const timeline = await getTimelineInCampaign(campaignId, timelinePointId);
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const now = new Date();
  const schedule = await prisma.campaignSessionSchedule.upsert({
    where: { timelinePointId },
    create: {
      timelinePointId,
      status: SessionScheduleStatus.PUBLISHED,
      publishedAt: now,
    },
    update: {
      status: SessionScheduleStatus.PUBLISHED,
      publishedAt: now,
    },
  });

  const memberIds = await getCampaignMemberUserIds(campaignId);
  notifyUsersAsync({
    userIds: memberIds,
    type: NotificationType.SESSION_PUBLISHED,
    title: `${timeline.wikiPage.title} is scheduled`,
    body: schedule.plannedStartAt
      ? `Session planned for ${schedule.plannedStartAt.toLocaleString()}`
      : 'Check the session page for details.',
    linkUrl: campaignNotePath(slug ?? '', timelinePointId),
    campaignId,
  });

  res.json({ schedule: serializeSchedule(schedule) });
}

export async function getNextPublishedSession(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const now = new Date();
  const rows = await prisma.campaignSessionSchedule.findMany({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now },
      timelinePoint: { campaignId },
    },
    orderBy: { plannedStartAt: 'asc' },
    take: 1,
    include: {
      timelinePoint: {
        include: { wikiPage: { select: { title: true } } },
      },
    },
  });
  const next = rows[0];
  if (!next) {
    res.json({ session: null });
    return;
  }
  res.json({
    session: {
      ...serializeSchedule(next),
      sessionTitle: next.timelinePoint.wikiPage.title,
      sequenceOrder: next.timelinePoint.sequenceOrder,
    },
  });
}

export async function getMySessionAttendance(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const timeline = await getTimelineInCampaign(
    req.campaign!.campaignId,
    timelinePointId,
  );
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const row = await prisma.sessionAttendance.findUnique({
    where: {
      timelinePointId_userId: { timelinePointId, userId },
    },
  });
  res.json({
    attendance: row
      ? {
          status: row.status,
          note: row.note,
          updatedAt: row.updatedAt.toISOString(),
        }
      : null,
  });
}

export async function patchMySessionAttendance(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const userId = req.user!.id;
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const { status, note } = req.body as { status?: string; note?: string | null };

  const validStatuses = Object.values(SessionAttendanceStatus) as string[];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({
      error: `status must be one of: ${validStatuses.join(', ')}`,
    });
    return;
  }

  const timeline = await getTimelineInCampaign(campaignId, timelinePointId);
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, email: true },
  });

  const attendance = await prisma.sessionAttendance.upsert({
    where: {
      timelinePointId_userId: { timelinePointId, userId },
    },
    create: {
      timelinePointId,
      userId,
      status,
      note: note?.trim() || null,
    },
    update: {
      status,
      note: note?.trim() || null,
    },
  });

  scheduleRsvpDigest({
    campaignId,
    handle: slug ?? '',
    timelinePointId,
    sessionTitle: timeline.wikiPage.title,
    actorLabel: resolveUserDisplayName(user ?? { displayName: null, email: 'Player' }),
  });

  res.json({
    attendance: {
      status: attendance.status,
      note: attendance.note,
      updatedAt: attendance.updatedAt.toISOString(),
    },
  });
}

function scheduleRsvpDigest(input: {
  campaignId: string;
  handle: string;
  timelinePointId: string;
  sessionTitle: string;
  actorLabel: string;
}): void {
  const key = `${input.campaignId}:${input.timelinePointId}`;
  const existing = rsvpDebounceTimers.get(key);
  if (existing) clearTimeout(existing);

  rsvpDebounceTimers.set(
    key,
    setTimeout(() => {
      rsvpDebounceTimers.delete(key);
      void sendRsvpDigest(input);
    }, RSVP_DEBOUNCE_MS),
  );
}

async function sendRsvpDigest(input: {
  campaignId: string;
  handle: string;
  timelinePointId: string;
  sessionTitle: string;
  actorLabel: string;
}): Promise<void> {
  const rows = await prisma.sessionAttendance.findMany({
    where: { timelinePointId: input.timelinePointId },
  });
  const attending = rows.filter((r) => r.status === SessionAttendanceStatus.ATTENDING).length;
  const absent = rows.filter((r) => r.status === SessionAttendanceStatus.ABSENT).length;
  const late = rows.filter((r) => r.status === SessionAttendanceStatus.LATE).length;
  const maybe = rows.filter((r) => r.status === SessionAttendanceStatus.MAYBE).length;
  const totalMembers = await prisma.campaignMember.count({
    where: { campaignId: input.campaignId },
  });

  const managerIds = await getOperationalManagerUserIds(input.campaignId);
  notifyUsersAsync({
    userIds: managerIds,
    type: NotificationType.RSVP_UPDATED,
    title: `RSVP update: ${input.sessionTitle}`,
    body: `${attending} attending, ${absent} absent, ${late} late, ${maybe} maybe (${rows.length}/${totalMembers} responded). Latest: ${input.actorLabel}.`,
    linkUrl: campaignNotePath(input.handle, input.timelinePointId),
    campaignId: input.campaignId,
  });
}

export async function listSessionAttendance(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const timelinePointId = String(req.params.timelinePointId ?? '');
  const timeline = await getTimelineInCampaign(
    req.campaign!.campaignId,
    timelinePointId,
  );
  if (!timeline) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const [attendance, members] = await Promise.all([
    prisma.sessionAttendance.findMany({
      where: { timelinePointId },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
    }),
    prisma.campaignMember.findMany({
      where: { campaignId: req.campaign!.campaignId },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
    }),
  ]);

  const attendanceByUser = new Map(attendance.map((row) => [row.userId, row]));
  const roster = members.map((member) => {
    const row = attendanceByUser.get(member.userId);
    return {
      userId: member.userId,
      name: resolveUserDisplayName(member.user),
      role: member.role,
      avatarUrl: member.user.avatarUrl,
      status: row?.status ?? null,
      note: row?.note ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });

  const summary = {
    attending: roster.filter((r) => r.status === SessionAttendanceStatus.ATTENDING).length,
    absent: roster.filter((r) => r.status === SessionAttendanceStatus.ABSENT).length,
    late: roster.filter((r) => r.status === SessionAttendanceStatus.LATE).length,
    maybe: roster.filter((r) => r.status === SessionAttendanceStatus.MAYBE).length,
    noResponse: roster.filter((r) => !r.status).length,
    total: roster.length,
  };

  res.json({ roster, summary });
}
