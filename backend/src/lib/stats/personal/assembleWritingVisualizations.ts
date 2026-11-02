import type {
  WritingAddedRemovedPoint,
  WritingDayCompleteness,
  WritingHeatmapDay,
  WritingHourlyBucket,
  WritingVisualizationDocument,
  WritingVisualizationSession,
  WritingVisualizations,
  WritingWeeklyRhythmBucket,
} from '../../../../../shared/statsTypes.js';
import { uniqueDocumentIds } from '../../../../../shared/writingSession.js';
import { enumerateCalendarDateKeys } from './reportingRange.js';
import {
  calendarDateKey,
  hourInTimeZone,
  weekdayMondayIndex,
} from './zonedTime.js';

export type VisualizationContribution = {
  occurredAt: Date;
  wordsAdded: number;
  wordsRemoved: number;
  availability: string;
  origin: string;
};

export type VisualizationSessionRow = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  activeDurationMs: number;
  completeness: string;
  documentIds: unknown;
};

type DayBucket = {
  wordsAdded: number;
  wordsRemoved: number;
  sessionCount: number;
  sessionMinutes: number;
  reconstructed: boolean;
  measured: boolean;
};

function emptyDay(): DayBucket {
  return {
    wordsAdded: 0,
    wordsRemoved: 0,
    sessionCount: 0,
    sessionMinutes: 0,
    reconstructed: false,
    measured: false,
  };
}

function completenessOf(day: DayBucket): WritingDayCompleteness {
  if (day.reconstructed) return 'partial';
  if (day.measured || day.sessionCount > 0 || day.wordsAdded > 0 || day.wordsRemoved > 0) {
    return 'measured';
  }
  return 'none';
}

function emptyWeekly(): WritingWeeklyRhythmBucket[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    wordsAdded: 0,
    sessionMinutes: 0,
  }));
}

function emptyHourly(): WritingHourlyBucket[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    wordsAdded: 0,
    sessionMinutes: 0,
  }));
}

export function emptyWritingVisualizations(
  timeZone: string,
  window: { gte: Date; lt: Date },
): WritingVisualizations {
  return {
    timeZone,
    window: { start: window.gte.toISOString(), end: window.lt.toISOString() },
    heatmap: [],
    weeklyRhythm: emptyWeekly(),
    hourly: emptyHourly(),
    addedRemovedTrend: [],
    sessions: [],
  };
}

export function assembleWritingVisualizations(input: {
  timeZone: string;
  window: { gte: Date; lt: Date };
  contributions: VisualizationContribution[];
  sessions: VisualizationSessionRow[];
  documentsById: Map<string, WritingVisualizationDocument>;
}): WritingVisualizations {
  const { timeZone, window } = input;
  const inWindow = (at: Date) => at >= window.gte && at < window.lt;
  const days = new Map<string, DayBucket>();
  const weekly = emptyWeekly();
  const hourly = emptyHourly();

  for (const row of input.contributions) {
    if (row.origin !== 'human' || !inWindow(row.occurredAt)) continue;
    const key = calendarDateKey(row.occurredAt, timeZone);
    const day = days.get(key) ?? emptyDay();
    day.wordsAdded += row.wordsAdded;
    day.wordsRemoved += row.wordsRemoved;
    if (row.availability === 'measured') day.measured = true;
    else day.reconstructed = true;
    days.set(key, day);

    const weekday = weekdayMondayIndex(row.occurredAt, timeZone);
    weekly[weekday].wordsAdded += row.wordsAdded;
    hourly[hourInTimeZone(row.occurredAt, timeZone)].wordsAdded += row.wordsAdded;
  }

  const sessions: WritingVisualizationSession[] = [];
  for (const session of input.sessions) {
    if (!inWindow(session.startedAt)) continue;
    const minutes = Math.max(0, Math.round(session.activeDurationMs / 60_000));
    const key = calendarDateKey(session.startedAt, timeZone);
    const day = days.get(key) ?? emptyDay();
    day.sessionCount += 1;
    day.sessionMinutes += minutes;
    if (session.completeness !== 'measured') day.reconstructed = true;
    else day.measured = true;
    days.set(key, day);

    const weekday = weekdayMondayIndex(session.startedAt, timeZone);
    weekly[weekday].sessionMinutes += minutes;
    hourly[hourInTimeZone(session.startedAt, timeZone)].sessionMinutes += minutes;

    const documents = uniqueDocumentIds(session.documentIds)
      .map((id) => input.documentsById.get(id))
      .filter((doc): doc is WritingVisualizationDocument => Boolean(doc));
    sessions.push({
      id: session.id,
      date: key,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      activeDurationMs: session.activeDurationMs,
      completeness: session.completeness,
      documents,
    });
  }

  const heatmap: WritingHeatmapDay[] = [];
  const addedRemovedTrend: WritingAddedRemovedPoint[] = [];
  for (const date of enumerateCalendarDateKeys(window.gte, window.lt, timeZone)) {
    const day = days.get(date) ?? emptyDay();
    const completeness = completenessOf(day);
    const [year, month, dayNum] = date.split('-').map(Number);
    const weekday = weekdayMondayIndex(
      new Date(Date.UTC(year, month - 1, dayNum, 12)),
      'UTC',
    );
    heatmap.push({
      date,
      weekday,
      wordsAdded: day.wordsAdded,
      wordsRemoved: day.wordsRemoved,
      sessionCount: day.sessionCount,
      sessionMinutes: day.sessionMinutes,
      completeness,
    });
    addedRemovedTrend.push({
      date,
      wordsAdded: day.wordsAdded,
      wordsRemoved: day.wordsRemoved,
      completeness,
    });
  }

  return {
    timeZone,
    window: { start: window.gte.toISOString(), end: window.lt.toISOString() },
    heatmap,
    weeklyRhythm: weekly,
    hourly,
    addedRemovedTrend,
    sessions,
  };
}
