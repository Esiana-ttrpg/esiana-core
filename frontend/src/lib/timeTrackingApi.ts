import { apiFetch } from './api';
import type { CalendarState } from './timeEngine';
import type { TimeAdvanceUnit } from '@shared/timeAdvanceUnits';
import type { GlobalTimeSimulationReceipt } from '@shared/globalTimeHooks';

export type { TimeAdvanceUnit };

export interface FantasyCalendarApiRow {
  id: string;
  name: string;
  isMasterTime: boolean;
  epochOffset: string;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
  state: CalendarState;
}

export interface TimeTrackingBundle {
  currentEpochMinute: string;
  calendars: FantasyCalendarApiRow[];
}

export interface AdvanceTimeResponse extends TimeTrackingBundle {
  advancedBy: {
    amount: string;
    unit: TimeAdvanceUnit;
  };
  clampedDay?: boolean;
  simulationReceipt?: GlobalTimeSimulationReceipt;
}

export function masterCalendarFromBundle(
  bundle: TimeTrackingBundle | null | undefined,
): FantasyCalendarApiRow | null {
  if (!bundle?.calendars?.length) return null;
  return bundle.calendars.find((calendar) => calendar.isMasterTime) ?? null;
}

export function formatCampaignDateLabel(
  calendar: FantasyCalendarApiRow | null | undefined,
): string | null {
  if (!calendar?.state) return null;
  const { year, monthName, day } = calendar.state;
  return `Year ${year}, ${monthName} ${day}`;
}

export async function fetchTimeTracking(
  campaignHandle: string,
): Promise<TimeTrackingBundle> {
  return apiFetch<TimeTrackingBundle>(`/campaigns/${campaignHandle}/time-tracking`);
}

export async function advanceCampaignTime(
  campaignHandle: string,
  amount: number,
  unit: TimeAdvanceUnit,
): Promise<AdvanceTimeResponse> {
  return apiFetch<AdvanceTimeResponse>(`/campaigns/${campaignHandle}/time-tracking/advance`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, unit }),
  });
}
