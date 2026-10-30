import type { TimelineOccurrenceRecord } from './chronologyApi';
import type { ChronologyDateParts } from './chronologyDates';
import { historicalMinute, historicalNativeState, type HistoricalAxis, type HistoricalInterval } from './historicalTimeline';

export type ChronologyDestination = 'calendar' | 'timeline' | 'eras' | 'feed';
const targetKeys = ['event', 'occurrence', 'at', 'date', 'era'];

/** Only identifiers and small navigation coordinates belong in the URL. */
export function chronologyViewParams(params: URLSearchParams, view: ChronologyDestination,
  target?: { calendarId: string; date?: ChronologyDateParts; occurrence?: TimelineOccurrenceRecord; eraId?: string }) {
  const next = new URLSearchParams(params);
  next.set('view', view);
  if (!target) { next.delete('focus'); return next; }
  next.set('focus', view);
  for (const key of targetKeys) next.delete(key);
  next.set('track', target.calendarId);
  if (target.eraId) next.set('era', target.eraId);
  if (target.date) next.set('date', `${target.date.year}:${target.date.month}:${target.date.day}`);
  if (target.occurrence) {
    const row = target.occurrence;
    next.set('event', row.baseEventId);
    next.set('occurrence', String(row.occurrenceIndex));
    if (row.start.epochMinute !== null) next.set('at', row.start.epochMinute);
  }
  return next;
}

export function chronologyTargetSignature(params: URLSearchParams) {
  return JSON.stringify(['track', ...targetKeys].map(key => params.get(key)));
}

export function linkedNativeDate(params: URLSearchParams, axis: HistoricalAxis): ChronologyDateParts | null {
  const raw = params.get('date');
  if (!raw || !/^\d+:\d+:\d+$/.test(raw)) return null;
  const [year, month, day] = raw.split(':').map(Number);
  const date = { year: year!, month: month!, day: day! };
  return axis.date(date) === null ? null : date;
}

/** Match all authoritative identity fields. Never fall back to another recurrence. */
export function linkedInterval(params: URLSearchParams, intervals: HistoricalInterval[]) {
  const index = params.get('occurrence'), at = params.get('at');
  if (index === null || !/^\d+$/.test(index) || at === null || !/^-?\d+$/.test(at)) return undefined;
  return intervals.find(row => row.calendarId === params.get('track') && row.baseEventId === params.get('event') &&
    row.recurrenceIndex === Number(index) && row.start === BigInt(at));
}

/** Normalize a daily projection back to its full, inclusive native occurrence. */
export function intervalOccurrence(row: HistoricalInterval, axis: HistoricalAxis): TimelineOccurrenceRecord | null {
  const start = historicalNativeState(axis, row.start), end = historicalNativeState(axis, row.end - 1440n);
  if (!start || !end) return null;
  return { ...row.representative, dayOffset: 0, isStart: true, isContinuation: false,
    start: { year: start.year, month: start.monthIndex, day: start.day, monthName: start.monthName, epochMinute: String(row.start) },
    end: { year: end.year, month: end.monthIndex, day: end.day, monthName: end.monthName, epochMinute: String(row.end - 1440n) } };
}

export function nativeDateMinute(axis: HistoricalAxis, date: ChronologyDateParts) {
  const day = axis.date(date);
  return day === null ? null : historicalMinute(axis, day);
}
