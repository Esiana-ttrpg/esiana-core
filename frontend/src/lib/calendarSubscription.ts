import { apiFetch } from '@/lib/api';
import type {
  CalendarSubscriptionIssuedResponse,
  CalendarSubscriptionStatusResponse,
} from '@/types/calendarSubscription';

export const SESSION_CALENDAR_DOWNLOAD_PATH = '/api/calendar/sessions.ics';

export function fetchCalendarSubscription(): Promise<CalendarSubscriptionStatusResponse> {
  return apiFetch('/calendar/subscription');
}

export function createCalendarSubscription(): Promise<CalendarSubscriptionIssuedResponse> {
  return apiFetch('/calendar/subscription', { method: 'POST' });
}

export function regenerateCalendarSubscription(): Promise<CalendarSubscriptionIssuedResponse> {
  return apiFetch('/calendar/subscription/regenerate', { method: 'POST' });
}

export function revokeCalendarSubscription(): Promise<{ ok: boolean }> {
  return apiFetch('/calendar/subscription', { method: 'DELETE' });
}
