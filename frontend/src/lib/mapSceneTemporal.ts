import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import type { ChronologyDateParts } from '@/lib/chronologyDates';
import {
  datePartsForMapViewing,
  epochMinuteFromDateParts,
  formatMapViewingLabel,
  isViewingCampaignPresent,
} from '@/lib/mapViewingChronology';

export {
  calendarLikeFromBundle,
  datePartsForMapViewing,
  epochMinuteFromDateParts,
  formatMapViewingLabel,
  isViewingCampaignPresent,
} from '@/lib/mapViewingChronology';

export function isWithinTemporalWindow(
  viewEpochMinute: string | null,
  visibleFrom: string | null,
  visibleUntil: string | null,
): boolean {
  if (!viewEpochMinute) return true;
  const view = BigInt(viewEpochMinute);
  if (visibleFrom) {
    const from = BigInt(visibleFrom);
    if (view < from) return false;
  }
  if (visibleUntil) {
    const until = BigInt(visibleUntil);
    if (view > until) return false;
  }
  return true;
}

export function temporalWindowHint(
  viewEpochMinute: string | null,
  visibleFrom: string | null,
  visibleUntil: string | null,
  timeTracking: TimeTrackingBundle | null,
  campaignEpochMinute: string | null,
): string {
  if (!viewEpochMinute) return 'Visible at campaign present (default).';
  if (!isWithinTemporalWindow(viewEpochMinute, visibleFrom, visibleUntil)) {
    return 'Hidden at the map viewing date (outside visible window).';
  }
  return `Visible at ${formatMapViewingLabel(viewEpochMinute, campaignEpochMinute, timeTracking)}.`;
}

export function datePartsFromEpochMinute(
  epochMinute: string | null,
  timeTracking: TimeTrackingBundle | null,
  campaignEpochMinute: string | null,
): ChronologyDateParts {
  return datePartsForMapViewing(epochMinute, campaignEpochMinute, timeTracking);
}

export function epochFromDateParts(
  parts: ChronologyDateParts,
  timeTracking: TimeTrackingBundle | null,
): string | null {
  return epochMinuteFromDateParts(parts, timeTracking);
}
