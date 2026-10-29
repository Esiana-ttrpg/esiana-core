import type { TimelineOccurrenceRecord, ChronologyTimelineBundle } from './chronologyApi';
import type { ChronologyEra } from '@shared/chronologyEras';
import type { ChronologyDateParts } from './chronologyDates';
import {
  calendarEpochMinuteForDate, convertEpochToCalendarState, getMonthsForYear,
  parseMonths, parseLeapRules, type FantasyCalendarLike,
} from './timeEngine';

const DAY = 1440n;
export const TIMELINE_LANE_LIMIT = 12;
export interface TimelineViewport { origin: bigint; offset: number; span: number }
export interface HistoricalInterval {
  key: string;
  calendarId: string;
  baseEventId: string;
  recurrenceIndex: number;
  start: bigint;
  end: bigint; // Exclusive, independent of viewport clipping.
  representative: TimelineOccurrenceRecord;
}
export interface TimelineMark { interval: HistoricalInterval; x: number; endX: number; lane: number }
export interface TimelineCluster { key: string; x: number; endX: number; members: HistoricalInterval[] }

/** Calendar-local whole days retain epoch offsets without rounding global epoch minutes. */
export function createHistoricalAxis(calendar: FantasyCalendarLike) {
  const dates = new Map<string, bigint>();
  const yearStarts = new Map<number, bigint>();
  const months = parseMonths(calendar.months), rules = parseLeapRules(calendar.leapDays);
  const states = new Map<string, ReturnType<typeof convertEpochToCalendarState>>();
  const date = (parts: ChronologyDateParts): bigint | null => {
    if (parts.year == null || parts.month == null || parts.day == null ||
      !Number.isSafeInteger(parts.year) || parts.year < 1) return null;
    const key = `${parts.year}:${parts.month}:${parts.day}`;
    if (!dates.has(key)) {
      if (!yearStarts.has(parts.year)) yearStarts.set(parts.year,
        (calendarEpochMinuteForDate(calendar, parts.year, 0, 1) - calendar.epochOffset) / DAY);
      const segments = getMonthsForYear(parts.year, months, rules);
      if (!Number.isSafeInteger(parts.month) || !Number.isSafeInteger(parts.day) ||
        parts.month < 0 || parts.month >= segments.length || parts.day < 1 || parts.day > segments[parts.month]!.length) return null;
      dates.set(key, yearStarts.get(parts.year)! + BigInt(segments.slice(0, parts.month).reduce((sum, month) => sum + month.length, 0) + parts.day - 1));
    }
    return dates.get(key)!;
  };
  const state = (day: bigint) => {
    const safe = day < 0n ? 0n : day;
    const key = String(safe);
    if (!states.has(key)) states.set(key, convertEpochToCalendarState(calendar.epochOffset + safe * DAY, calendar));
    return states.get(key)!;
  };
  return { date, state, calendar };
}
export type HistoricalAxis = ReturnType<typeof createHistoricalAxis>;
export const relativeDay = (day: bigint, view: TimelineViewport) => Number(day - view.origin) - view.offset;
export const dayX = (day: bigint, view: TimelineViewport, width: number) => relativeDay(day, view) / view.span * width;
export function viewportDay(view: TimelineViewport, fraction = 0) {
  return view.origin + BigInt(Math.floor(view.offset + view.span * fraction));
}
export function moveViewport(view: TimelineViewport, delta: number, span = view.span): TimelineViewport {
  const raw = view.offset + delta;
  const whole = Math.floor(raw);
  const origin = view.origin + BigInt(whole);
  return origin < 0n ? { origin: 0n, offset: 0, span } : { origin, offset: raw - whole, span };
}
export function zoomViewport(view: TimelineViewport, factor: number, anchor = .5): TimelineViewport {
  const span = Math.min(4_000_000, Math.max(2, view.span * factor));
  return moveViewport(view, (view.span - span) * anchor, span);
}
export function fitTimeline(start: bigint, end: bigint): TimelineViewport {
  const span = Math.max(2, Number(end - start));
  return moveViewport({ origin: start, offset: 0, span: span * 1.2 }, -span * .1);
}

export function normalizeHistoricalOccurrences(rows: TimelineOccurrenceRecord[], axis: HistoricalAxis): HistoricalInterval[] {
  const intervals = new Map<string, HistoricalInterval>();
  for (const row of rows) {
    const rowDay = axis.date(row.start);
    if (rowDay == null) continue;
    const start = rowDay - BigInt(Math.max(0, row.dayOffset));
    if (start < 0n) continue;
    const key = JSON.stringify([row.calendarId, row.baseEventId, row.occurrenceIndex]);
    const end = start + BigInt(Math.max(1, row.duration));
    const previous = intervals.get(key);
    if (!previous || row.dayOffset < previous.representative.dayOffset ||
      (row.dayOffset === previous.representative.dayOffset && row.occurrenceId < previous.representative.occurrenceId)) {
      intervals.set(key, { key, calendarId: row.calendarId, baseEventId: row.baseEventId,
        recurrenceIndex: row.occurrenceIndex, start, end, representative: row });
    }
  }
  return [...intervals.values()].sort(compareHistoricalIntervals);
}
const priority = { MAJOR: 0, MINOR: 1, NOTICE: 2 };
export function compareHistoricalIntervals(a: HistoricalInterval, b: HistoricalInterval) {
  return priority[a.representative.importance] - priority[b.representative.importance] ||
    (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) ||
    (a.end < b.end ? -1 : a.end > b.end ? 1 : 0) ||
    a.calendarId.localeCompare(b.calendarId) || a.baseEventId.localeCompare(b.baseEventId) ||
    a.recurrenceIndex - b.recurrenceIndex;
}

export function packHistoricalIntervals(intervals: HistoricalInterval[], view: TimelineViewport, width: number) {
  const visible = intervals.filter(row => {
    const left = dayX(row.start, view, width), right = dayX(row.end, view, width);
    return right >= -80 && left <= width + 80;
  }).sort(compareHistoricalIntervals);
  const pack = (budget: number) => {
    const lanes: Array<Array<{ left: number; right: number }>> = Array.from({ length: budget }, () => []);
    const marks: TimelineMark[] = [], excess: TimelineMark[] = [];
    for (const interval of visible) {
      const x = dayX(interval.start, view, width), endX = dayX(interval.end, view, width);
      // Clip label footprints to the workspace; labels never extend over another mark.
      const left = Math.max(-40, x) - 20;
      const right = Math.min(width + 80, Math.max(endX, Math.max(0, x) + 176)) + 8;
      const lane = lanes.findIndex(items => items.every(item => right <= item.left || left >= item.right));
      const mark = { interval, x, endX, lane };
      if (lane < 0) excess.push(mark);
      else { lanes[lane]!.push({ left, right }); marks.push(mark); }
    }
    return { marks, excess };
  };
  let result = pack(TIMELINE_LANE_LIMIT);
  if (result.excess.length) result = pack(TIMELINE_LANE_LIMIT - 1);
  const clusters: TimelineCluster[] = [];
  for (const mark of result.excess.sort((a, b) => a.x - b.x || compareHistoricalIntervals(a.interval, b.interval))) {
    if (mark.endX < 0 || mark.x > width) continue;
    const x = Math.min(Math.max(0, width - 48), Math.max(0, mark.x - 20)), endX = Math.min(width, Math.max(mark.endX, x + 48));
    const previous = clusters.at(-1);
    if (previous && x <= previous.endX + 8) {
      previous.endX = Math.max(previous.endX, endX);
      previous.members.push(mark.interval);
    } else clusters.push({ key: mark.interval.key, x, endX, members: [mark.interval] });
  }
  for (const cluster of clusters) cluster.members.sort(compareHistoricalIntervals);
  return { marks: result.marks, clusters, laneCount: clusters.length ? TIMELINE_LANE_LIMIT : Math.max(1, ...result.marks.map(mark => mark.lane + 1)) };
}

export function historicalEraGeometry(era: ChronologyEra, axis: HistoricalAxis, view: TimelineViewport, width: number) {
  const start = era.startDate ? axis.date(era.startDate) : null;
  const end = era.endDate ? axis.date(era.endDate) : null;
  const x = start == null ? 0 : Math.max(0, dayX(start, view, width));
  const endX = end == null ? width : Math.min(width, dayX(end + 1n, view, width));
  return { era, start, end: end == null ? null : end + 1n, x, width: Math.max(0, endX - x), openStart: start == null, openEnd: end == null };
}

export function historicalTicks(axis: HistoricalAxis, view: TimelineViewport, width: number) {
  const target = Math.max(2, Math.floor(width / 110));
  const first = axis.state(viewportDay(view));
  const months = parseMonths(axis.calendar.months), rules = parseLeapRules(axis.calendar.leapDays);
  const yearLength = getMonthsForYear(first.year, months, rules).reduce((sum, month) => sum + month.length, 0);
  if (yearLength <= 0) return [];
  const desiredDays = view.span / target;
  const scale = desiredDays < 12 ? 'days' : desiredDays < yearLength / 2 ? 'months' : 'years';
  const nice = (value: number) => {
    const power = 10 ** Math.floor(Math.log10(Math.max(1, value)));
    return [1, 2, 5, 10].map(n => n * power).find(n => n >= value) ?? power * 10;
  };
  const step = nice(scale === 'years' ? desiredDays / yearLength : desiredDays);
  const monthStep = nice(desiredDays / (yearLength / Math.max(1, getMonthsForYear(first.year, months, rules).length)));
  let year = first.year, month = first.monthIndex;
  let day = viewportDay(view);
  if (scale === 'years') { year = Math.max(1, Math.floor(year / step) * step); month = 0; }
  if (scale !== 'days') day = axis.date({ year, month, day: 1 })!;
  else day = day / BigInt(step) * BigInt(step);
  const ticks: Array<{ day: bigint; x: number; label: string }> = [];
  for (let count = 0; count < 160; count++) {
    const x = dayX(day, view, width);
    if (x > width + 120) break;
    if (x >= -120 && (!ticks.length || x - ticks.at(-1)!.x >= 95)) {
      const state = axis.state(day);
      ticks.push({ day, x, label: scale === 'years' ? `Year ${state.year}` :
        scale === 'months' ? `${state.monthName} · ${state.year}` : `${state.monthName} ${state.day} · ${state.year}` });
    }
    if (scale === 'days') day += BigInt(step);
    else {
      if (scale === 'years') year += step;
      else {
        month += monthStep;
        let count = getMonthsForYear(year, months, rules).length;
        while (count > 0 && month >= count) { month -= count; year++; count = getMonthsForYear(year, months, rules).length; }
      }
      const next = axis.date({ year, month, day: 1 })!;
      if (next <= day) break;
      day = next;
    }
  }
  return ticks;
}

export function initialHistoricalViewport(axis: HistoricalAxis, now: ChronologyDateParts | null, events: HistoricalInterval[], eras: ChronologyEra[]): TimelineViewport {
  const today = now ? axis.date(now) : null;
  if (today != null && now?.year != null) {
    const start = axis.date({ year: now.year, month: 0, day: 1 })!;
    const end = axis.date({ year: now.year + 1, month: 0, day: 1 })!;
    return moveViewport({ origin: today, offset: 0, span: Math.max(2, Number(end - start)) }, -Number(end - start) / 2);
  }
  if (events.length) return fitTimeline(events.reduce((min, row) => row.start < min ? row.start : min, events[0]!.start), events.reduce((max, row) => row.end > max ? row.end : max, events[0]!.end));
  const era = eras.find(row => row.isCurrent) ?? eras.find(row => row.startDate && row.endDate);
  const start = era?.startDate ? axis.date(era.startDate) : null;
  const end = era?.endDate ? axis.date(era.endDate) : null;
  if (start != null && end != null) return fitTimeline(start, end + 1n);
  const fallback = { origin: start ?? end ?? 0n, offset: 0, span: Number(axis.date({ year: 2, month: 0, day: 1 })) || 365 };
  return start != null || end != null ? moveViewport(fallback, -fallback.span / 2) : fallback;
}

export function historicalCoverage(metadata: ChronologyTimelineBundle['expansionMetadata']) {
  const limited = metadata.generated.truncated || metadata.warnings.some(warning =>
    warning === 'UNBOUNDED_RULE_FORCED_CAP' || warning === 'CAP_APPLIED_TOTAL' || warning === 'CAP_APPLIED_PER_EVENT');
  // The existing endpoint reports but does not enforce its requested query window.
  return { incomplete: true, label: 'Fit to Loaded Events', message: limited
    ? 'Loaded history is incomplete: occurrence expansion limits apply.'
    : 'Loaded occurrences only; historical coverage is not guaranteed.', warnings: metadata.warnings };
}
