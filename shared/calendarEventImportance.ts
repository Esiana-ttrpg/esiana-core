export const CALENDAR_EVENT_IMPORTANCES = ['NOTICE', 'MINOR', 'MAJOR'] as const;
export type CalendarEventImportance = (typeof CALENDAR_EVENT_IMPORTANCES)[number];

export function isCalendarEventImportance(value: unknown): value is CalendarEventImportance {
  return typeof value === 'string' &&
    (CALENDAR_EVENT_IMPORTANCES as readonly string[]).includes(value);
}
