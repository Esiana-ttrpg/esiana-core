import { prisma } from './prisma.js';
import {
  buildProjectedOccurrenceId,
  isOneShotCampaignFormat,
  mergeProjectedWithPersisted,
  projectCadenceOccurrencesInRange,
} from '../../../shared/campaignScheduleCadence.js';
import {
  SessionAttendanceStatus,
  SessionScheduleStatus,
} from './notifications/types.js';
import { campaignNotePath } from './notifications/deepLinks.js';
import { resolveUserDisplayName } from './userDisplay.js';
import { PageOwnerTypes } from '../../../shared/campaignPolicy/pageOwnership.js';
import { isCharacterWikiPage } from './memberIdentity.js';

export const AUTO_RSVP_ALLOWED_DAYS = [1, 3, 7, 14] as const;
export type AutoRsvpDaysBefore = (typeof AUTO_RSVP_ALLOWED_DAYS)[number];

const UPCOMING_LOOKAHEAD_MS = 56 * 24 * 60 * 60 * 1000; // ~8 weeks of care-about
const UPCOMING_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000; // recent skipped still relevant

export type UserSchedulePreferences = {
  vacationStartDate: string | null;
  vacationEndDate: string | null;
  autoRsvpEnabled: boolean;
  autoRsvpDaysBefore: number | null;
};

export type AttendanceAwaitingMember = {
  userId: string;
  label: string;
  away: boolean;
};

export type AttendanceSummary = {
  attending: number;
  notAttending: number;
  awaiting: number;
  total: number;
  awaitingMembers: AttendanceAwaitingMember[];
};

export type PreviousSessionRef = {
  sessionNumber: number;
  plannedStartAt: string | null;
  deepLinkPath: string;
};

export type MaterializedScheduleEntry = {
  kind: 'MATERIALIZED';
  id: string;
  campaignId: string;
  campaignHandle: string;
  campaignName: string;
  appearanceProfile: unknown;
  timelinePointId: string;
  sessionTitle: string;
  sessionNumber: number;
  status: string;
  skipReason: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  timezone: string | null;
  deepLinkPath: string;
  myAttendance: string | null;
  away: boolean;
  attendanceSummary: AttendanceSummary | null;
  previousSession: PreviousSessionRef | null;
};

export type ProjectedScheduleEntry = {
  kind: 'PROJECTED';
  id: string;
  campaignId: string;
  campaignHandle: string;
  campaignName: string;
  appearanceProfile: unknown;
  plannedStartAt: string;
  timezone: string | null;
};

export type UserScheduleEntry = MaterializedScheduleEntry | ProjectedScheduleEntry;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Parse YYYY-MM-DD (or ISO datetime) to UTC midnight date. */
export function parseVacationDateInput(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const dayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dayMatch) return null;
  const year = Number.parseInt(dayMatch[1]!, 10);
  const month = Number.parseInt(dayMatch[2]!, 10);
  const day = Number.parseInt(dayMatch[3]!, 10);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject Date.UTC normalization of impossible calendar dates (e.g. Feb 30 → Mar 2).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function toVacationDateIso(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const d = startOfUtcDay(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isDateInVacationRange(
  instant: Date,
  vacationStart: Date | null | undefined,
  vacationEnd: Date | null | undefined,
): boolean {
  if (!vacationStart || !vacationEnd) return false;
  const day = startOfUtcDay(instant).getTime();
  const start = startOfUtcDay(vacationStart).getTime();
  const end = startOfUtcDay(vacationEnd).getTime();
  return day >= start && day <= end;
}

export function serializeSchedulePreferences(user: {
  vacationStartDate: Date | null;
  vacationEndDate: Date | null;
  autoRsvpEnabled: boolean;
  autoRsvpDaysBefore: number | null;
}): UserSchedulePreferences {
  return {
    vacationStartDate: toVacationDateIso(user.vacationStartDate),
    vacationEndDate: toVacationDateIso(user.vacationEndDate),
    autoRsvpEnabled: user.autoRsvpEnabled,
    autoRsvpDaysBefore: user.autoRsvpDaysBefore,
  };
}

export function normalizeAutoRsvpDaysBefore(
  raw: unknown,
  enabled: boolean,
): number | null {
  if (!enabled) return null;
  if (raw === null || raw === undefined || raw === '') return 7;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!AUTO_RSVP_ALLOWED_DAYS.includes(n as AutoRsvpDaysBefore)) {
    throw new Error(`autoRsvpDaysBefore must be one of: ${AUTO_RSVP_ALLOWED_DAYS.join(', ')}`);
  }
  return n;
}

function accountLabel(user: { email: string; displayName?: string | null }): string {
  return resolveUserDisplayName(user);
}

/**
 * Character (this campaign) → Display name → Username.
 * Multi-PC in the same campaign falls back to account identity.
 */
export function resolveAttendanceMemberLabel(params: {
  user: { email: string; displayName?: string | null };
  identityPageTitle: string | null | undefined;
  ownedCharacterCount: number;
}): string {
  if (params.ownedCharacterCount > 1) {
    return accountLabel(params.user);
  }
  const character = params.identityPageTitle?.trim();
  if (character) return character;
  return accountLabel(params.user);
}

type MemberRow = {
  userId: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    vacationStartDate: Date | null;
    vacationEndDate: Date | null;
  };
  identityPage: { id: string; title: string } | null;
};

function buildAttendanceSummary(params: {
  members: MemberRow[];
  attendanceByUser: Map<string, { status: string }>;
  ownedCharacterCountByUser: Map<string, number>;
  sessionStart: Date | null;
}): AttendanceSummary {
  const total = params.members.length;
  let attending = 0;
  let notAttending = 0;
  const awaitingMembers: AttendanceAwaitingMember[] = [];

  for (const member of params.members) {
    const row = params.attendanceByUser.get(member.userId);
    if (!row) {
      const away =
        params.sessionStart != null &&
        isDateInVacationRange(
          params.sessionStart,
          member.user.vacationStartDate,
          member.user.vacationEndDate,
        );
      awaitingMembers.push({
        userId: member.userId,
        label: resolveAttendanceMemberLabel({
          user: member.user,
          identityPageTitle: member.identityPage?.title,
          ownedCharacterCount: params.ownedCharacterCountByUser.get(member.userId) ?? 0,
        }),
        away,
      });
      continue;
    }
    if (row.status === SessionAttendanceStatus.ABSENT) {
      notAttending += 1;
    } else {
      attending += 1;
    }
  }

  return {
    attending,
    notAttending,
    awaiting: awaitingMembers.length,
    total,
    awaitingMembers,
  };
}

async function loadOwnedCharacterCounts(
  campaignId: string,
  userIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      ownerType: PageOwnerTypes.USER,
      ownerUserId: { in: userIds },
    },
    select: {
      ownerUserId: true,
      templateType: true,
      metadata: true,
      title: true,
      parentId: true,
      id: true,
    },
  });

  for (const page of pages) {
    if (!page.ownerUserId) continue;
    if (!isCharacterWikiPage(page)) continue;
    counts.set(page.ownerUserId, (counts.get(page.ownerUserId) ?? 0) + 1);
  }
  return counts;
}

type PersistedScheduleRow = {
  timelinePointId: string;
  status: string;
  skipReason: string | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  timezone: string | null;
  timelinePoint: {
    id: string;
    sequenceOrder: number;
    campaignId: string;
    wikiPage: { title: string };
    campaign: {
      id: string;
      handle: string;
      name: string;
      appearanceProfile: unknown;
      scheduleFrequency: string | null;
      scheduleDay: string | null;
      scheduleTime: string | null;
      scheduleTimezone: string | null;
      schedulingEnabled: boolean;
      campaignFormat: string | null;
    };
  };
};

/**
 * Session identity (number + previous) is derived only from materialized rows.
 * Projection must never feed this function.
 */
export function resolveMaterializedSessionIdentity(params: {
  current: {
    timelinePointId: string;
    sequenceOrder: number;
    campaignId: string;
  };
  materializedHistory: Array<{
    timelinePointId: string;
    sequenceOrder: number;
    status: string;
    plannedStartAt: Date | null;
    campaignId: string;
    campaignHandle: string;
  }>;
}): { sessionNumber: number; previousSession: PreviousSessionRef | null } {
  const sessionNumber = params.current.sequenceOrder;
  const candidates = params.materializedHistory
    .filter(
      (row) =>
        row.campaignId === params.current.campaignId &&
        row.status !== SessionScheduleStatus.SKIPPED &&
        row.status !== SessionScheduleStatus.CANCELLED &&
        row.sequenceOrder < params.current.sequenceOrder,
    )
    .sort((a, b) => b.sequenceOrder - a.sequenceOrder);
  const prev = candidates[0];
  if (!prev) {
    return { sessionNumber, previousSession: null };
  }
  return {
    sessionNumber,
    previousSession: {
      sessionNumber: prev.sequenceOrder,
      plannedStartAt: prev.plannedStartAt?.toISOString() ?? null,
      deepLinkPath: campaignNotePath(prev.campaignHandle, prev.timelinePointId),
    },
  };
}

export async function getUserSchedulePreferences(userId: string): Promise<UserSchedulePreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      vacationStartDate: true,
      vacationEndDate: true,
      autoRsvpEnabled: true,
      autoRsvpDaysBefore: true,
    },
  });
  if (!user) {
    return {
      vacationStartDate: null,
      vacationEndDate: null,
      autoRsvpEnabled: false,
      autoRsvpDaysBefore: null,
    };
  }
  return serializeSchedulePreferences(user);
}

export async function patchUserSchedulePreferences(
  userId: string,
  body: {
    vacationStartDate?: string | null;
    vacationEndDate?: string | null;
    autoRsvpEnabled?: boolean;
    autoRsvpDaysBefore?: number | null;
  },
): Promise<UserSchedulePreferences> {
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      vacationStartDate: true,
      vacationEndDate: true,
      autoRsvpEnabled: true,
      autoRsvpDaysBefore: true,
    },
  });

  let vacationStartDate = current.vacationStartDate;
  let vacationEndDate = current.vacationEndDate;

  if ('vacationStartDate' in body || 'vacationEndDate' in body) {
    const startRaw =
      'vacationStartDate' in body ? body.vacationStartDate : toVacationDateIso(current.vacationStartDate);
    const endRaw =
      'vacationEndDate' in body ? body.vacationEndDate : toVacationDateIso(current.vacationEndDate);

    if (
      (startRaw === null || startRaw === '') &&
      (endRaw === null || endRaw === '')
    ) {
      vacationStartDate = null;
      vacationEndDate = null;
    } else {
      const start = parseVacationDateInput(startRaw);
      const end = parseVacationDateInput(endRaw);
      if (!start || !end) {
        throw new Error('Both vacationStartDate and vacationEndDate are required (YYYY-MM-DD).');
      }
      if (start.getTime() > end.getTime()) {
        throw new Error('vacationStartDate must be on or before vacationEndDate.');
      }
      vacationStartDate = start;
      vacationEndDate = end;
    }
  }

  const autoRsvpEnabled =
    typeof body.autoRsvpEnabled === 'boolean' ? body.autoRsvpEnabled : current.autoRsvpEnabled;
  let autoRsvpDaysBefore = current.autoRsvpDaysBefore;
  if ('autoRsvpDaysBefore' in body || 'autoRsvpEnabled' in body) {
    autoRsvpDaysBefore = normalizeAutoRsvpDaysBefore(
      'autoRsvpDaysBefore' in body ? body.autoRsvpDaysBefore : current.autoRsvpDaysBefore,
      autoRsvpEnabled,
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      vacationStartDate,
      vacationEndDate,
      autoRsvpEnabled,
      autoRsvpDaysBefore,
    },
    select: {
      vacationStartDate: true,
      vacationEndDate: true,
      autoRsvpEnabled: true,
      autoRsvpDaysBefore: true,
    },
  });

  return serializeSchedulePreferences(updated);
}

export async function buildUserSchedule(params: {
  userId: string;
  from: Date;
  to: Date;
  now?: Date;
}): Promise<{
  preferences: UserSchedulePreferences;
  entries: UserScheduleEntry[];
  upcoming: MaterializedScheduleEntry[];
}> {
  const now = params.now ?? new Date();
  const viewer = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: {
      vacationStartDate: true,
      vacationEndDate: true,
      autoRsvpEnabled: true,
      autoRsvpDaysBefore: true,
    },
  });

  const memberships = await prisma.campaignMember.findMany({
    where: { userId: params.userId },
    select: {
      campaignId: true,
      campaign: {
        select: {
          id: true,
          handle: true,
          name: true,
          appearanceProfile: true,
          scheduleFrequency: true,
          scheduleDay: true,
          scheduleTime: true,
          scheduleTimezone: true,
          schedulingEnabled: true,
          campaignFormat: true,
          archivedAt: true,
        },
      },
    },
  });

  const activeCampaigns = memberships
    .map((m) => m.campaign)
    .filter((c) => !c.archivedAt);
  const campaignIds = activeCampaigns.map((c) => c.id);
  const preferences = serializeSchedulePreferences(viewer);

  if (campaignIds.length === 0) {
    return { preferences, entries: [], upcoming: [] };
  }

  const upcomingStart = new Date(now.getTime() - UPCOMING_LOOKBACK_MS);
  const upcomingEnd = new Date(now.getTime() + UPCOMING_LOOKAHEAD_MS);
  const loadStart =
    params.from.getTime() < upcomingStart.getTime() ? params.from : upcomingStart;
  const loadEnd = params.to.getTime() > upcomingEnd.getTime() ? params.to : upcomingEnd;

  const persisted = (await prisma.campaignSessionSchedule.findMany({
    where: {
      timelinePoint: { campaignId: { in: campaignIds } },
      status: {
        in: [
          SessionScheduleStatus.PUBLISHED,
          SessionScheduleStatus.SKIPPED,
          SessionScheduleStatus.COMPLETED,
        ],
      },
      plannedStartAt: { gte: loadStart, lte: loadEnd },
    },
    include: {
      timelinePoint: {
        select: {
          id: true,
          sequenceOrder: true,
          campaignId: true,
          wikiPage: { select: { title: true } },
          campaign: {
            select: {
              id: true,
              handle: true,
              name: true,
              appearanceProfile: true,
              scheduleFrequency: true,
              scheduleDay: true,
              scheduleTime: true,
              scheduleTimezone: true,
              schedulingEnabled: true,
              campaignFormat: true,
            },
          },
        },
      },
    },
    orderBy: { plannedStartAt: 'asc' },
  })) as PersistedScheduleRow[];

  // Full materialized history for previousSession / identity (not limited to viewport).
  const historyRows = await prisma.campaignSessionSchedule.findMany({
    where: {
      timelinePoint: { campaignId: { in: campaignIds } },
      status: {
        in: [
          SessionScheduleStatus.PUBLISHED,
          SessionScheduleStatus.SKIPPED,
          SessionScheduleStatus.COMPLETED,
          SessionScheduleStatus.CANCELLED,
        ],
      },
    },
    select: {
      timelinePointId: true,
      status: true,
      plannedStartAt: true,
      timelinePoint: {
        select: {
          sequenceOrder: true,
          campaignId: true,
          campaign: { select: { handle: true } },
        },
      },
    },
  });

  const materializedHistory = historyRows.map((row) => ({
    timelinePointId: row.timelinePointId,
    sequenceOrder: row.timelinePoint.sequenceOrder,
    status: row.status,
    plannedStartAt: row.plannedStartAt,
    campaignId: row.timelinePoint.campaignId,
    campaignHandle: row.timelinePoint.campaign.handle,
  }));

  // Also need previous anchors for projection grids (last non-draft past occurrence).
  const lastOccurrenceByCampaign = new Map<string, Date>();
  for (const row of historyRows) {
    if (!row.plannedStartAt) continue;
    if (
      row.status !== SessionScheduleStatus.COMPLETED &&
      row.status !== SessionScheduleStatus.SKIPPED &&
      row.status !== SessionScheduleStatus.PUBLISHED
    ) {
      continue;
    }
    if (row.plannedStartAt.getTime() > now.getTime()) continue;
    const campaignId = row.timelinePoint.campaignId;
    const existing = lastOccurrenceByCampaign.get(campaignId);
    if (!existing || row.plannedStartAt.getTime() > existing.getTime()) {
      lastOccurrenceByCampaign.set(campaignId, row.plannedStartAt);
    }
  }

  const membersByCampaign = new Map<string, MemberRow[]>();
  const characterCountsByCampaign = new Map<string, Map<string, number>>();

  await Promise.all(
    campaignIds.map(async (campaignId) => {
      const members = await prisma.campaignMember.findMany({
        where: { campaignId },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              vacationStartDate: true,
              vacationEndDate: true,
            },
          },
          identityPage: { select: { id: true, title: true } },
        },
      });
      membersByCampaign.set(campaignId, members);
      characterCountsByCampaign.set(
        campaignId,
        await loadOwnedCharacterCounts(
          campaignId,
          members.map((m) => m.userId),
        ),
      );
    }),
  );

  const timelineIds = persisted.map((p) => p.timelinePointId);
  const attendanceRows =
    timelineIds.length === 0
      ? []
      : await prisma.sessionAttendance.findMany({
          where: { timelinePointId: { in: timelineIds } },
          select: { timelinePointId: true, userId: true, status: true },
        });

  const attendanceByTimeline = new Map<string, Map<string, { status: string }>>();
  for (const row of attendanceRows) {
    let map = attendanceByTimeline.get(row.timelinePointId);
    if (!map) {
      map = new Map();
      attendanceByTimeline.set(row.timelinePointId, map);
    }
    map.set(row.userId, { status: row.status });
  }

  function enrichMaterialized(row: PersistedScheduleRow): MaterializedScheduleEntry {
    const campaign = row.timelinePoint.campaign;
    const identity = resolveMaterializedSessionIdentity({
      current: {
        timelinePointId: row.timelinePointId,
        sequenceOrder: row.timelinePoint.sequenceOrder,
        campaignId: campaign.id,
      },
      materializedHistory,
    });
    const sessionStart = row.plannedStartAt;
    const away =
      sessionStart != null &&
      isDateInVacationRange(sessionStart, viewer.vacationStartDate, viewer.vacationEndDate);
    const myAttendance =
      attendanceByTimeline.get(row.timelinePointId)?.get(params.userId)?.status ?? null;

    const rsvpAble = row.status === SessionScheduleStatus.PUBLISHED;
    let attendanceSummary: AttendanceSummary | null = null;
    if (rsvpAble) {
      attendanceSummary = buildAttendanceSummary({
        members: membersByCampaign.get(campaign.id) ?? [],
        attendanceByUser: attendanceByTimeline.get(row.timelinePointId) ?? new Map(),
        ownedCharacterCountByUser: characterCountsByCampaign.get(campaign.id) ?? new Map(),
        sessionStart,
      });
    }

    return {
      kind: 'MATERIALIZED',
      id: row.timelinePointId,
      campaignId: campaign.id,
      campaignHandle: campaign.handle,
      campaignName: campaign.name,
      appearanceProfile: campaign.appearanceProfile,
      timelinePointId: row.timelinePointId,
      sessionTitle: row.timelinePoint.wikiPage.title,
      sessionNumber: identity.sessionNumber,
      status: row.status,
      skipReason: row.skipReason,
      plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: row.plannedEndAt?.toISOString() ?? null,
      timezone: row.timezone ?? campaign.scheduleTimezone,
      deepLinkPath: campaignNotePath(campaign.handle, row.timelinePointId),
      myAttendance,
      away,
      attendanceSummary,
      previousSession: identity.previousSession,
    };
  }

  const entries: UserScheduleEntry[] = [];

  for (const row of persisted) {
    if (!row.plannedStartAt) continue;
    if (
      row.plannedStartAt.getTime() < params.from.getTime() ||
      row.plannedStartAt.getTime() > params.to.getTime()
    ) {
      continue;
    }
    entries.push(enrichMaterialized(row));
  }

  // Viewport projections — never affect session identity.
  for (const campaign of activeCampaigns) {
    if (!campaign.schedulingEnabled) continue;
    if (isOneShotCampaignFormat(campaign.campaignFormat)) continue;
    if (!campaign.scheduleDay || !campaign.scheduleTime || !campaign.scheduleFrequency) {
      continue;
    }

    const campaignPersisted = persisted.filter(
      (row) =>
        row.timelinePoint.campaignId === campaign.id && row.plannedStartAt != null,
    );
    const projected = projectCadenceOccurrencesInRange({
      scheduleFrequency: campaign.scheduleFrequency,
      scheduleDay: campaign.scheduleDay,
      scheduleTime: campaign.scheduleTime,
      scheduleTimezone: campaign.scheduleTimezone,
      rangeStart: params.from,
      rangeEnd: params.to,
      previousPlannedStartAt: lastOccurrenceByCampaign.get(campaign.id) ?? null,
    });
    const remaining = mergeProjectedWithPersisted({
      projected,
      persisted: campaignPersisted.map((row) => ({
        plannedStartAt: row.plannedStartAt!,
      })),
    });

    // Also suppress against any published upcoming outside the load window that
    // might still match (canonical upcoming beyond lookback).
    for (const slot of remaining) {
      // Skip if a materialized occurrence in full history matches (e.g. future published).
      const matchesHistory = historyRows.some(
        (row) =>
          row.timelinePoint.campaignId === campaign.id &&
          row.plannedStartAt &&
          Math.abs(row.plannedStartAt.getTime() - slot.getTime()) <= 15 * 60 * 1000,
      );
      if (matchesHistory) continue;

      entries.push({
        kind: 'PROJECTED',
        id: buildProjectedOccurrenceId(campaign.id, slot),
        campaignId: campaign.id,
        campaignHandle: campaign.handle,
        campaignName: campaign.name,
        appearanceProfile: campaign.appearanceProfile,
        plannedStartAt: slot.toISOString(),
        timezone: campaign.scheduleTimezone,
      });
    }
  }

  entries.sort((a, b) => {
    const aTime = a.plannedStartAt ? new Date(a.plannedStartAt).getTime() : 0;
    const bTime = b.plannedStartAt ? new Date(b.plannedStartAt).getTime() : 0;
    return aTime - bTime;
  });

  const upcoming: MaterializedScheduleEntry[] = [];
  for (const row of persisted) {
    if (!row.plannedStartAt) continue;
    const t = row.plannedStartAt.getTime();
    if (t < upcomingStart.getTime() || t > upcomingEnd.getTime()) continue;
    // Care-about: future published/skipped, plus recent skipped/completed for context.
    if (
      row.status === SessionScheduleStatus.PUBLISHED ||
      row.status === SessionScheduleStatus.SKIPPED ||
      (row.status === SessionScheduleStatus.COMPLETED && t >= now.getTime() - UPCOMING_LOOKBACK_MS)
    ) {
      upcoming.push(enrichMaterialized(row));
    }
  }
  upcoming.sort((a, b) => {
    const aTime = a.plannedStartAt ? new Date(a.plannedStartAt).getTime() : 0;
    const bTime = b.plannedStartAt ? new Date(b.plannedStartAt).getTime() : 0;
    return aTime - bTime;
  });

  return { preferences, entries, upcoming };
}

/**
 * Auto-RSVP catch-up: for each enabled user, mark ATTENDING on PUBLISHED sessions
 * within [now, now + daysBefore] when no attendance row exists and vacation does not overlap.
 */
export async function runAutoRsvpSweep(now: Date = new Date()): Promise<number> {
  const users = await prisma.user.findMany({
    where: { autoRsvpEnabled: true },
    select: {
      id: true,
      autoRsvpDaysBefore: true,
      vacationStartDate: true,
      vacationEndDate: true,
    },
  });

  let applied = 0;
  for (const user of users) {
    const days = user.autoRsvpDaysBefore ?? 7;
    if (!AUTO_RSVP_ALLOWED_DAYS.includes(days as AutoRsvpDaysBefore)) continue;
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const memberships = await prisma.campaignMember.findMany({
      where: {
        userId: user.id,
        campaign: { archivedAt: null },
      },
      select: { campaignId: true },
    });
    const campaignIds = memberships.map((m) => m.campaignId);
    if (campaignIds.length === 0) continue;

    const schedules = await prisma.campaignSessionSchedule.findMany({
      where: {
        status: SessionScheduleStatus.PUBLISHED,
        plannedStartAt: { gte: now, lte: windowEnd },
        timelinePoint: {
          campaignId: { in: campaignIds },
          campaign: { archivedAt: null },
        },
      },
      select: {
        timelinePointId: true,
        plannedStartAt: true,
      },
    });

    for (const schedule of schedules) {
      if (!schedule.plannedStartAt) continue;
      if (
        isDateInVacationRange(
          schedule.plannedStartAt,
          user.vacationStartDate,
          user.vacationEndDate,
        )
      ) {
        continue;
      }
      const existing = await prisma.sessionAttendance.findUnique({
        where: {
          timelinePointId_userId: {
            timelinePointId: schedule.timelinePointId,
            userId: user.id,
          },
        },
        select: { userId: true },
      });
      if (existing) continue;

      try {
        await prisma.sessionAttendance.create({
          data: {
            timelinePointId: schedule.timelinePointId,
            userId: user.id,
            status: SessionAttendanceStatus.ATTENDING,
          },
        });
        applied += 1;
      } catch (err) {
        const code = (err as { code?: string }).code;
        // Concurrent manual RSVP won the unique constraint — treat as already applied.
        if (code === 'P2002') continue;
        throw err;
      }
    }
  }

  return applied;
}
