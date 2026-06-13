import { apiFetch } from './api';

export interface CalendarEventRecord {
  id: string;
  calendarId: string;
  categoryId: string | null;
  prerequisiteId: string | null;
  visibility: 'PUBLIC' | 'PARTY' | 'DM_ONLY';
  duration: number;
  isRepeating: boolean;
  repeatInterval: number | null;
  repeatUnit: 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS' | null;
  limitRepetitions: number | null;
  conditions: unknown;
  moonOverrides: unknown;
  title: string;
  description: string | null;
  isRecurring: boolean;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  targetEpochMinute: string | null;
  recurrenceRule: unknown;
  createdAt: string;
  updatedAt: string;
}

export async function listCalendarEvents(
  campaignHandle: string,
  calendarId: string,
): Promise<CalendarEventRecord[]> {
  const data = await apiFetch<{ events: CalendarEventRecord[] }>(
    `/campaigns/${campaignHandle}/calendars/${calendarId}/events`,
  );
  return data.events ?? [];
}

export async function createCalendarEvent(
  campaignHandle: string,
  calendarId: string,
  payload: {
    title: string;
    description?: string;
    isRecurring?: boolean;
    targetYear?: number | null;
    targetMonth?: number | null;
    targetDay?: number | null;
    targetEpochMinute?: string | null;
    recurrenceRule?: unknown;
    categoryId?: string | null;
    prerequisiteId?: string | null;
    visibility?: 'PUBLIC' | 'PARTY' | 'DM_ONLY';
    duration?: number;
    isRepeating?: boolean;
    repeatInterval?: number | null;
    repeatUnit?: 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS' | null;
    limitRepetitions?: number | null;
    conditions?: unknown;
    moonOverrides?: unknown;
  },
): Promise<CalendarEventRecord> {
  const data = await apiFetch<{ event: CalendarEventRecord }>(
    `/campaigns/${campaignHandle}/calendars/${calendarId}/events`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data.event;
}

export async function updateCalendarEvent(
  campaignHandle: string,
  calendarId: string,
  eventId: string,
  payload: Partial<{
    title: string;
    description: string;
    isRecurring: boolean;
    targetYear: number | null;
    targetMonth: number | null;
    targetDay: number | null;
    targetEpochMinute: string | null;
    recurrenceRule: unknown;
    categoryId: string | null;
    prerequisiteId: string | null;
    visibility: 'PUBLIC' | 'PARTY' | 'DM_ONLY';
    duration: number;
    isRepeating: boolean;
    repeatInterval: number | null;
    repeatUnit: 'DAYS' | 'MONTHS' | 'YEARS' | 'ERAS' | null;
    limitRepetitions: number | null;
    conditions: unknown;
    moonOverrides: unknown;
  }>,
): Promise<CalendarEventRecord> {
  const data = await apiFetch<{ event: CalendarEventRecord }>(
    `/campaigns/${campaignHandle}/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return data.event;
}

export async function deleteCalendarEvent(
  campaignHandle: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/campaigns/${campaignHandle}/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'DELETE',
    },
  );
}
