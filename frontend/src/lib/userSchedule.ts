import { apiFetch } from '@/lib/api';
import type {
  UserSchedulePreferences,
  UserScheduleResponse,
} from '@/types/userSchedule';

export const AUTO_RSVP_DAY_OPTIONS = [1, 3, 7, 14] as const;

/** Inclusive month-grid range including leading/trailing days shown in a Sun–Sat calendar. */
export function monthGridRange(year: number, monthIndex: number): { from: string; to: string } {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = first.getDay();
  const endPad = 6 - last.getDay();
  const fromDate = new Date(year, monthIndex, 1 - startPad);
  const toDate = new Date(year, monthIndex + 1, endPad);
  const iso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { from: iso(fromDate), to: iso(toDate) };
}

export async function fetchUserSchedule(params: {
  from: string;
  to: string;
}): Promise<UserScheduleResponse> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  return apiFetch(`/user/schedule?${qs.toString()}`);
}

export async function patchUserSchedulePreferences(input: {
  vacationStartDate?: string | null;
  vacationEndDate?: string | null;
  autoRsvpEnabled?: boolean;
  autoRsvpDaysBefore?: number | null;
}): Promise<{ preferences: UserSchedulePreferences }> {
  return apiFetch('/user/schedule/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function isVacationDay(
  dayIso: string,
  preferences: Pick<UserSchedulePreferences, 'vacationStartDate' | 'vacationEndDate'>,
): boolean {
  const { vacationStartDate, vacationEndDate } = preferences;
  if (!vacationStartDate || !vacationEndDate) return false;
  return dayIso >= vacationStartDate && dayIso <= vacationEndDate;
}

export function formatVacationRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
      new Date(`${iso}T12:00:00.000Z`),
    );
  return `${fmt(start)} – ${fmt(end)}`;
}
