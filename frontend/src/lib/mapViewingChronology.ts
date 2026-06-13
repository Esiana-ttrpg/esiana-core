import {
  calendarRowToLike,
  formatQuestDateLabel,
  resolveMasterCalendarLike,
} from '@/lib/chronologyCalendar';
import {
  nowFromCalendarState,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import {
  calendarEpochMinuteForDate,
  convertEpochToCalendarState,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';

export function isViewingCampaignPresent(
  viewEpochMinute: string | null,
  campaignEpochMinute: string | null,
): boolean {
  if (!campaignEpochMinute) return viewEpochMinute === null;
  if (viewEpochMinute === null) return true;
  return viewEpochMinute === campaignEpochMinute;
}

export function formatMapViewingLabel(
  viewEpochMinute: string | null,
  campaignEpochMinute: string | null,
  timeTracking: TimeTrackingBundle | null,
): string {
  if (isViewingCampaignPresent(viewEpochMinute, campaignEpochMinute)) {
    return 'Campaign present';
  }

  const master = resolveMasterCalendarLike(timeTracking);
  const epoch = viewEpochMinute ?? campaignEpochMinute;
  if (!master || !epoch) return 'Historical view';

  try {
    const state = convertEpochToCalendarState(BigInt(epoch), master);
    const parts = nowFromCalendarState(state);
    return formatQuestDateLabel(parts, master) ?? 'Historical view';
  } catch {
    return 'Historical view';
  }
}

export function datePartsForMapViewing(
  viewEpochMinute: string | null,
  campaignEpochMinute: string | null,
  timeTracking: TimeTrackingBundle | null,
): ChronologyDateParts {
  const master = resolveMasterCalendarLike(timeTracking);
  const epoch = viewEpochMinute ?? campaignEpochMinute;
  if (!master || !epoch) {
    return { year: 1, month: 0, day: 1 };
  }
  try {
    const state = convertEpochToCalendarState(BigInt(epoch), master);
    return nowFromCalendarState(state);
  } catch {
    return { year: 1, month: 0, day: 1 };
  }
}

export function epochMinuteFromDateParts(
  parts: ChronologyDateParts,
  timeTracking: TimeTrackingBundle | null,
): string | null {
  const master = resolveMasterCalendarLike(timeTracking);
  if (!master) return null;
  if (parts.year === null || parts.month === null || parts.day === null) {
    return null;
  }
  try {
    const epoch = calendarEpochMinuteForDate(
      master,
      parts.year,
      parts.month,
      parts.day,
    );
    return epoch.toString();
  } catch {
    return null;
  }
}

export function calendarLikeFromBundle(
  timeTracking: TimeTrackingBundle | null,
): FantasyCalendarLike | null {
  const row = timeTracking?.calendars?.find((c) => c.isMasterTime) ??
    timeTracking?.calendars?.[0];
  return row ? calendarRowToLike(row) : null;
}
