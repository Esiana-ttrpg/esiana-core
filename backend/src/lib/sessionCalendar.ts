import { DEFAULT_TIMEZONE, sanitizeTimezone } from './timezone.js';

export const SESSION_CALENDAR_STATUSES = [
  'PUBLISHED',
  'CANCELLED',
  'COMPLETED',
] as const;

export interface SessionCalendarEvent {
  id: string;
  kind: 'session';
  title: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  campaign: { id: string; name: string; handle: string };
  href: string;
  venue: {
    type: string | null;
    label: string | null;
    url: string | null;
    locationPageId: string | null;
  } | null;
  sequenceOrder: number;
  updatedAt: string;
}

export function normalizeCalendarTimezone(
  scheduleTimezone: string | null,
  campaignTimezone: string | null,
): string {
  return (
    sanitizeTimezone(scheduleTimezone) ??
    sanitizeTimezone(campaignTimezone) ??
    DEFAULT_TIMEZONE
  );
}

export function projectSessionCalendarEvent(row: {
  timelinePointId: string;
  status: string;
  plannedStartAt: Date;
  plannedEndAt: Date | null;
  timezone: string | null;
  venueType: string | null;
  venueLabel: string | null;
  venueUrl: string | null;
  locationPageId: string | null;
  updatedAt: Date;
  timelinePoint: {
    sequenceOrder: number;
    updatedAt: Date;
    wikiPage: { title: string; updatedAt: Date };
    campaign: {
      id: string;
      name: string;
      handle: string;
      scheduleTimezone: string | null;
      updatedAt: Date;
    };
  };
}): SessionCalendarEvent {
  const campaign = row.timelinePoint.campaign;
  const hasVenue = Boolean(
    row.venueType || row.venueLabel || row.venueUrl || row.locationPageId,
  );
  return {
    id: row.timelinePointId,
    kind: 'session',
    title: row.timelinePoint.wikiPage.title,
    status: row.status,
    startsAt: row.plannedStartAt.toISOString(),
    endsAt: row.plannedEndAt?.toISOString() ?? null,
    timezone: normalizeCalendarTimezone(row.timezone, campaign.scheduleTimezone),
    campaign: {
      id: campaign.id,
      name: campaign.name,
      handle: campaign.handle,
    },
    href: `/campaigns/${encodeURIComponent(campaign.handle)}/sessions/${encodeURIComponent(row.timelinePointId)}`,
    venue: hasVenue
      ? {
          type: row.venueType,
          label: row.venueLabel,
          url: row.venueUrl,
          locationPageId: row.locationPageId,
        }
      : null,
    sequenceOrder: row.timelinePoint.sequenceOrder,
    updatedAt: new Date(
      Math.max(
        row.updatedAt.getTime(),
        row.timelinePoint.updatedAt.getTime(),
        row.timelinePoint.wikiPage.updatedAt.getTime(),
        campaign.updatedAt.getTime(),
      ),
    ).toISOString(),
  };
}
