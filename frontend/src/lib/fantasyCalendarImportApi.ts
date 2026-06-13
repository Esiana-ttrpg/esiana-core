import { apiFetch } from '@/lib/api';

export interface FantasyCalendarImportPreview {
  ok: true;
  calendarName: string;
  monthCount: number;
  weekdayCount: number;
  moonCount: number;
  intercalaryCount: number;
  resolvedDate: {
    year: number;
    monthIndex: number;
    day: number;
    hour: number;
    minute: number;
  };
  currentEpochMinute: string;
  warnings: string[];
}

export async function previewFantasyCalendarImport(
  payload: unknown,
  campaignHandle?: string,
): Promise<FantasyCalendarImportPreview> {
  const path = campaignHandle
    ? `/campaigns/${campaignHandle}/chronology/import-preview`
    : '/campaigns/fantasy-calendar/import-preview';
  return apiFetch<FantasyCalendarImportPreview>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface FantasyCalendarImportResult extends FantasyCalendarImportPreview {
  calendarId: string;
  isMasterTime: boolean;
  createdNewTimeline: boolean;
  currentEpochMinute: string;
}

export async function importFantasyCalendarJson(
  campaignHandle: string,
  payload: unknown,
): Promise<FantasyCalendarImportResult> {
  return apiFetch(`/campaigns/${campaignHandle}/time-tracking/import-json`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
