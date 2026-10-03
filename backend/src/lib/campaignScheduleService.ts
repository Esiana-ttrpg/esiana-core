import { prisma } from './prisma.js';
import { PLAYER_SESSION_NOTES_TITLE } from './seedWiki.js';
import {
  anchorMetadataForTimeline,
  authorMetadataForSession,
} from './sessionNotesCombined.js';
import {
  SessionScheduleOrigin,
  SessionScheduleStatus,
  type SessionScheduleOriginValue,
} from './notifications/types.js';
import {
  computeNextCadenceOccurrence,
  isOneShotCampaignFormat,
} from '../../../shared/campaignScheduleCadence.js';
import { WikiVisibility } from '../types/domain.js';

const SKIP_REASON_MAX = 200;

export type CampaignScheduleFields = {
  id: string;
  scheduleFrequency: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  scheduleTimezone: string | null;
  schedulingEnabled: boolean;
  autoScheduleUpcomingSession: boolean;
  campaignFormat: string | null;
};

export type UpcomingScheduleRow = {
  timelinePointId: string;
  status: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  timezone: string | null;
  origin: string;
  skipReason: string | null;
  plannedWorldEpochMinute: bigint | null;
  publishedAt: Date | null;
  sessionTitle: string;
  sequenceOrder: number;
};

function buildSessionNoteBlocks(markdown = ''): Array<Record<string, unknown>> {
  return [
    {
      id: 'session-note-body',
      type: 'text-tiptap',
      x: 0,
      y: 0,
      w: 12,
      h: 10,
      isPrivate: false,
      visibility: WikiVisibility.PARTY,
      content: { markdown },
    },
  ];
}

export function serializeScheduleRow(row: {
  timelinePointId: string;
  status: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  timezone: string | null;
  venueType?: string | null;
  venueLabel?: string | null;
  venueUrl?: string | null;
  locationPageId?: string | null;
  reminderSentAt?: Date | null;
  publishedAt: Date | null;
  origin: string;
  skipReason: string | null;
  plannedWorldEpochMinute: bigint | null;
}) {
  return {
    timelinePointId: row.timelinePointId,
    status: row.status,
    plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: row.plannedEndAt?.toISOString() ?? null,
    timezone: row.timezone ?? null,
    venueType: row.venueType ?? null,
    venueLabel: row.venueLabel ?? null,
    venueUrl: row.venueUrl ?? null,
    locationPageId: row.locationPageId ?? null,
    reminderSentAt: row.reminderSentAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    origin: row.origin,
    skipReason: row.skipReason,
    plannedWorldEpochMinute:
      row.plannedWorldEpochMinute != null ? row.plannedWorldEpochMinute.toString() : null,
  };
}

export async function findCanonicalUpcomingSession(
  campaignId: string,
  now: Date = new Date(),
): Promise<UpcomingScheduleRow | null> {
  const row = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: now },
      timelinePoint: { campaignId },
    },
    orderBy: { plannedStartAt: 'asc' },
    include: {
      timelinePoint: {
        select: {
          sequenceOrder: true,
          wikiPage: { select: { title: true } },
        },
      },
    },
  });
  if (!row) return null;
  return {
    timelinePointId: row.timelinePointId,
    status: row.status,
    plannedStartAt: row.plannedStartAt,
    plannedEndAt: row.plannedEndAt,
    timezone: row.timezone,
    origin: row.origin,
    skipReason: row.skipReason,
    plannedWorldEpochMinute: row.plannedWorldEpochMinute,
    publishedAt: row.publishedAt,
    sessionTitle: row.timelinePoint.wikiPage.title,
    sequenceOrder: row.timelinePoint.sequenceOrder,
  };
}

function canAutoSchedule(campaign: CampaignScheduleFields): boolean {
  if (!campaign.schedulingEnabled) return false;
  if (!campaign.autoScheduleUpcomingSession) return false;
  if (isOneShotCampaignFormat(campaign.campaignFormat)) return false;
  return true;
}

function hasEnoughCadence(campaign: CampaignScheduleFields): boolean {
  return Boolean(
    campaign.scheduleDay?.trim() &&
      campaign.scheduleTime?.trim() &&
      campaign.scheduleFrequency?.trim(),
  );
}

async function loadCampaignSchedule(campaignId: string): Promise<CampaignScheduleFields | null> {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      scheduleFrequency: true,
      scheduleDay: true,
      scheduleTime: true,
      scheduleTimezone: true,
      schedulingEnabled: true,
      autoScheduleUpcomingSession: true,
      campaignFormat: true,
    },
  });
}

async function createCadenceTimelineSession(params: {
  campaignId: string;
  authorId: string;
  plannedStartAt: Date;
  timezone: string | null;
  plannedWorldEpochMinute?: bigint | null;
}): Promise<UpcomingScheduleRow> {
  const sessionRoot = await prisma.wikiPage.findFirst({
    where: {
      campaignId: params.campaignId,
      title: PLAYER_SESSION_NOTES_TITLE,
    },
    select: { id: true },
  });
  if (!sessionRoot) {
    throw new Error('Player Session Notes folder not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.campaignSessionTimeline.count({
      where: { campaignId: params.campaignId },
    });
    const sequenceOrder = existingCount + 1;
    const title = `Session ${sequenceOrder}`;

    const anchorPage = await tx.wikiPage.create({
      data: {
        campaignId: params.campaignId,
        parentId: sessionRoot.id,
        title,
        visibility: WikiVisibility.PARTY,
        templateType: 'SESSION_NOTE',
        metadata: {
          sessionNoteAuthorId: params.authorId,
          isSessionAnchor: true,
        } as object,
        blocks: buildSessionNoteBlocks() as object,
      },
      select: { id: true, title: true },
    });

    const timelinePoint = await tx.campaignSessionTimeline.create({
      data: {
        campaignId: params.campaignId,
        wikiPageId: anchorPage.id,
        authorId: params.authorId,
        sequenceOrder,
      },
      select: { id: true, wikiPageId: true, sequenceOrder: true },
    });

    const campaign = await tx.campaign.findUnique({
      where: { id: params.campaignId },
      select: { currentEpochMinute: true },
    });
    const fantasyEpochMinute = campaign?.currentEpochMinute?.toString() ?? null;

    const anchorMeta = anchorMetadataForTimeline(
      timelinePoint.id,
      params.authorId,
      fantasyEpochMinute,
    );
    await tx.wikiPage.update({
      where: { id: anchorPage.id },
      data: { metadata: anchorMeta as object },
    });

    const authorTitle = `${title} — Notes`;
    const authorMeta = authorMetadataForSession(
      timelinePoint.id,
      timelinePoint.id,
      params.authorId,
      fantasyEpochMinute,
    );
    await tx.wikiPage.create({
      data: {
        campaignId: params.campaignId,
        parentId: sessionRoot.id,
        title: authorTitle.slice(0, 120),
        visibility: WikiVisibility.PARTY,
        templateType: 'SESSION_NOTE',
        metadata: authorMeta as object,
        blocks: buildSessionNoteBlocks() as object,
      },
    });

    const now = new Date();
    const schedule = await tx.campaignSessionSchedule.create({
      data: {
        timelinePointId: timelinePoint.id,
        status: SessionScheduleStatus.PUBLISHED,
        plannedStartAt: params.plannedStartAt,
        timezone: params.timezone,
        origin: SessionScheduleOrigin.CADENCE,
        publishedAt: now,
        plannedWorldEpochMinute: params.plannedWorldEpochMinute ?? null,
      },
    });

    return {
      timelinePointId: schedule.timelinePointId,
      status: schedule.status,
      plannedStartAt: schedule.plannedStartAt,
      plannedEndAt: schedule.plannedEndAt,
      timezone: schedule.timezone,
      origin: schedule.origin,
      skipReason: schedule.skipReason,
      plannedWorldEpochMinute: schedule.plannedWorldEpochMinute,
      publishedAt: schedule.publishedAt,
      sessionTitle: anchorPage.title,
      sequenceOrder: timelinePoint.sequenceOrder,
    };
  });

  return result;
}

export type UpdateCampaignRecurrenceInput = {
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  scheduleTimezone?: string | null;
  schedulingEnabled?: boolean;
  autoScheduleUpcomingSession?: boolean;
};

export async function updateCampaignRecurrence(
  campaignId: string,
  input: UpdateCampaignRecurrenceInput,
  options?: { authorIdForEnsure?: string },
): Promise<{
  campaign: CampaignScheduleFields;
  ensuredUpcoming: UpcomingScheduleRow | null;
}> {
  const previous = await loadCampaignSchedule(campaignId);
  if (!previous) {
    throw new Error('Campaign not found');
  }

  const data: Record<string, unknown> = {};
  if (input.scheduleFrequency !== undefined) {
    data.scheduleFrequency = input.scheduleFrequency?.trim() || null;
  }
  if (input.scheduleDay !== undefined) {
    data.scheduleDay = input.scheduleDay?.trim() || null;
  }
  if (input.scheduleTime !== undefined) {
    data.scheduleTime = input.scheduleTime?.trim() || null;
  }
  if (input.scheduleTimezone !== undefined) {
    data.scheduleTimezone = input.scheduleTimezone?.trim() || null;
  }
  if (input.schedulingEnabled !== undefined) {
    data.schedulingEnabled = Boolean(input.schedulingEnabled);
  }
  if (input.autoScheduleUpcomingSession !== undefined) {
    data.autoScheduleUpcomingSession = Boolean(input.autoScheduleUpcomingSession);
  }

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data,
    select: {
      id: true,
      scheduleFrequency: true,
      scheduleDay: true,
      scheduleTime: true,
      scheduleTimezone: true,
      schedulingEnabled: true,
      autoScheduleUpcomingSession: true,
      campaignFormat: true,
    },
  });

  let ensuredUpcoming: UpcomingScheduleRow | null = null;
  const turnedAutoOn =
    previous.autoScheduleUpcomingSession === false &&
    campaign.autoScheduleUpcomingSession === true;

  if (turnedAutoOn && options?.authorIdForEnsure) {
    ensuredUpcoming = await ensureUpcomingSession(campaignId, options.authorIdForEnsure);
  }

  return { campaign, ensuredUpcoming };
}

export async function disableScheduling(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { schedulingEnabled: false },
  });
}

export type ScheduleUpcomingInput = {
  campaignId: string;
  authorId: string;
  plannedStartAt: Date;
  plannedEndAt?: Date | null;
  timezone?: string | null;
  /** When true, also write recurrence fields on the campaign. */
  applyRecurrenceChange?: boolean;
  scheduleFrequency?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  scheduleTimezone?: string | null;
  /** Explicitly reschedule an existing MANUAL upcoming session. */
  rescheduleExisting?: boolean;
  timelinePointId?: string;
  plannedWorldEpochMinute?: bigint | null;
  clearPlannedWorldEpochMinute?: boolean;
};

export class ScheduleConflictError extends Error {
  readonly code = 'MANUAL_UPCOMING_EXISTS';
  readonly upcoming: UpcomingScheduleRow;

  constructor(upcoming: UpcomingScheduleRow) {
    super(
      'A manually scheduled upcoming session already exists. Pass rescheduleExisting to update it.',
    );
    this.name = 'ScheduleConflictError';
    this.upcoming = upcoming;
  }
}

export async function scheduleUpcomingSession(
  input: ScheduleUpcomingInput,
): Promise<UpcomingScheduleRow> {
  const campaign = await loadCampaignSchedule(input.campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (input.applyRecurrenceChange) {
    await updateCampaignRecurrence(input.campaignId, {
      scheduleFrequency: input.scheduleFrequency,
      scheduleDay: input.scheduleDay,
      scheduleTime: input.scheduleTime,
      scheduleTimezone: input.scheduleTimezone ?? input.timezone,
      schedulingEnabled: true,
    });
  } else if (!campaign.schedulingEnabled && input.scheduleFrequency) {
    await updateCampaignRecurrence(input.campaignId, {
      schedulingEnabled: true,
      scheduleFrequency: input.scheduleFrequency,
      scheduleDay: input.scheduleDay,
      scheduleTime: input.scheduleTime,
      scheduleTimezone: input.scheduleTimezone ?? input.timezone,
    });
  }

  const upcoming = await findCanonicalUpcomingSession(input.campaignId);

  if (upcoming) {
    const isCadence = upcoming.origin === SessionScheduleOrigin.CADENCE;
    const explicitManual =
      input.rescheduleExisting === true &&
      (input.timelinePointId == null || input.timelinePointId === upcoming.timelinePointId);

    if (isCadence || explicitManual) {
      const worldData: { plannedWorldEpochMinute?: bigint | null } = {};
      if (input.clearPlannedWorldEpochMinute) {
        worldData.plannedWorldEpochMinute = null;
      } else if (input.plannedWorldEpochMinute !== undefined) {
        worldData.plannedWorldEpochMinute = input.plannedWorldEpochMinute;
      }

      const updated = await prisma.campaignSessionSchedule.update({
        where: { timelinePointId: upcoming.timelinePointId },
        data: {
          plannedStartAt: input.plannedStartAt,
          plannedEndAt: input.plannedEndAt ?? null,
          timezone: input.timezone?.trim() || upcoming.timezone,
          status: SessionScheduleStatus.PUBLISHED,
          publishedAt: upcoming.publishedAt ?? new Date(),
          skipReason: null,
          ...worldData,
        },
      });

      return {
        ...upcoming,
        plannedStartAt: updated.plannedStartAt,
        plannedEndAt: updated.plannedEndAt,
        timezone: updated.timezone,
        status: updated.status,
        skipReason: updated.skipReason,
        plannedWorldEpochMinute: updated.plannedWorldEpochMinute,
        publishedAt: updated.publishedAt,
      };
    }

    // Future MANUAL without explicit reschedule → conflict
    throw new ScheduleConflictError(upcoming);
  }

  // No upcoming — create CADENCE-owned session
  const refreshed = (await loadCampaignSchedule(input.campaignId))!;
  return createCadenceTimelineSession({
    campaignId: input.campaignId,
    authorId: input.authorId,
    plannedStartAt: input.plannedStartAt,
    timezone: input.timezone?.trim() || refreshed.scheduleTimezone,
    plannedWorldEpochMinute: input.plannedWorldEpochMinute,
  });
}

/**
 * Ensure there is a future published session when auto-scheduling is active.
 * Never creates a second CADENCE future session; never overwrites MANUAL.
 */
export async function ensureUpcomingSession(
  campaignId: string,
  authorId: string,
): Promise<UpcomingScheduleRow | null> {
  const campaign = await loadCampaignSchedule(campaignId);
  if (!campaign || !canAutoSchedule(campaign)) return null;

  const upcoming = await findCanonicalUpcomingSession(campaignId);
  if (upcoming) {
    // CADENCE or MANUAL both satisfy "there is a next session"
    return upcoming;
  }

  if (!hasEnoughCadence(campaign)) return null;

  const after = new Date();
  const next = computeNextCadenceOccurrence({
    scheduleFrequency: campaign.scheduleFrequency,
    scheduleDay: campaign.scheduleDay,
    scheduleTime: campaign.scheduleTime,
    after,
  });
  if (!next) return null;

  // Re-check for race: another CADENCE may have been created
  const again = await findCanonicalUpcomingSession(campaignId);
  if (again) return again;

  const futureCadence = await prisma.campaignSessionSchedule.findFirst({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: after },
      origin: SessionScheduleOrigin.CADENCE,
      timelinePoint: { campaignId },
    },
  });
  if (futureCadence) {
    return findCanonicalUpcomingSession(campaignId);
  }

  return createCadenceTimelineSession({
    campaignId,
    authorId,
    plannedStartAt: next,
    timezone: campaign.scheduleTimezone,
  });
}

export type SkipSessionInput = {
  campaignId: string;
  timelinePointId: string;
  authorId: string;
  reason?: string | null;
  scheduleNextAutomatically?: boolean;
};

export async function skipSession(input: SkipSessionInput): Promise<{
  skipped: UpcomingScheduleRow;
  next: UpcomingScheduleRow | null;
}> {
  const campaign = await loadCampaignSchedule(input.campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const timeline = await prisma.campaignSessionTimeline.findFirst({
    where: { id: input.timelinePointId, campaignId: input.campaignId },
    include: {
      schedule: true,
      wikiPage: { select: { title: true } },
    },
  });
  if (!timeline?.schedule) {
    throw new Error('Session schedule not found');
  }
  if (timeline.schedule.status === SessionScheduleStatus.SKIPPED) {
    throw new Error('Session is already skipped');
  }

  const reason =
    input.reason == null || input.reason.trim() === ''
      ? null
      : input.reason.trim().slice(0, SKIP_REASON_MAX);

  const updated = await prisma.campaignSessionSchedule.update({
    where: { timelinePointId: input.timelinePointId },
    data: {
      status: SessionScheduleStatus.SKIPPED,
      skipReason: reason,
    },
  });

  const skipped: UpcomingScheduleRow = {
    timelinePointId: updated.timelinePointId,
    status: updated.status,
    plannedStartAt: updated.plannedStartAt,
    plannedEndAt: updated.plannedEndAt,
    timezone: updated.timezone,
    origin: updated.origin,
    skipReason: updated.skipReason,
    plannedWorldEpochMinute: updated.plannedWorldEpochMinute,
    publishedAt: updated.publishedAt,
    sessionTitle: timeline.wikiPage.title,
    sequenceOrder: timeline.sequenceOrder,
  };

  const oneShot = isOneShotCampaignFormat(campaign.campaignFormat);
  const wantNext =
    !oneShot &&
    (input.scheduleNextAutomatically === true ||
      (input.scheduleNextAutomatically !== false &&
        campaign.autoScheduleUpcomingSession &&
        campaign.schedulingEnabled));

  let next: UpcomingScheduleRow | null = null;
  if (wantNext) {
    // CADENCE or MANUAL: ensure creates from campaign recurrence when no future published remains
    next = await ensureUpcomingSession(input.campaignId, input.authorId);
  }

  return { skipped, next };
}

/** Sweep campaigns that need an upcoming cadence session. */
export async function runEnsureUpcomingSessionsSweep(): Promise<number> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      schedulingEnabled: true,
      autoScheduleUpcomingSession: true,
      archivedAt: null,
    },
    select: {
      id: true,
      campaignFormat: true,
      campaignOwnerUserId: true,
      members: {
        where: { role: 'GAMEMASTER' },
        select: { userId: true },
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
    take: 200,
  });

  let created = 0;
  for (const campaign of campaigns) {
    if (isOneShotCampaignFormat(campaign.campaignFormat)) continue;
    const authorId =
      campaign.members[0]?.userId ?? campaign.campaignOwnerUserId ?? null;
    if (!authorId) continue;
    try {
      const before = await findCanonicalUpcomingSession(campaign.id);
      const after = await ensureUpcomingSession(campaign.id, authorId);
      if (!before && after) created += 1;
    } catch {
      // Continue sweep for other campaigns
    }
  }
  return created;
}

export function isSessionScheduleOrigin(value: string): value is SessionScheduleOriginValue {
  return (
    value === SessionScheduleOrigin.MANUAL || value === SessionScheduleOrigin.CADENCE
  );
}
