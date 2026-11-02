import { isActiveDay } from '../buildRollupHabits.js';
import {
  calendarDateKey,
  hourInTimeZone,
  previousCalendarDateKey,
} from './zonedTime.js';

export type ActivityPoint = {
  at: Date;
  wordsAdded: number;
  editsCount: number;
  sessionCount: number;
  sessionMinutes: number;
  substantialRevisions: number;
};

export type PeriodHabits = {
  wordsAdded: number;
  writingStreak: number;
  writingCadence: number;
  substantialRevisions: number;
  favoriteWritingHour: number | null;
  hasActivityData: boolean;
};

function computeCalendarStreak(activeKeys: Set<string>, todayKey: string): number {
  if (!activeKeys.has(todayKey)) return 0;
  let streak = 0;
  let cursor = todayKey;
  while (activeKeys.has(cursor)) {
    streak += 1;
    cursor = previousCalendarDateKey(cursor);
  }
  return streak;
}

function favoriteHourFromSessions(
  points: ActivityPoint[],
  timeZone: string,
): number | null {
  const hourWeights = new Map<number, number>();
  for (const point of points) {
    if (point.sessionMinutes <= 0 || point.sessionCount <= 0) continue;
    const hour = hourInTimeZone(point.at, timeZone);
    hourWeights.set(hour, (hourWeights.get(hour) ?? 0) + point.sessionMinutes);
  }
  if (hourWeights.size === 0) return null;
  let bestHour: number | null = null;
  let bestWeight = 0;
  for (const [hour, weight] of hourWeights) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestHour = hour;
    }
  }
  return bestHour;
}

function groupByCalendarDay(
  points: ActivityPoint[],
  timeZone: string,
): Map<string, { editsCount: number; wordsAdded: number; sessionCount: number; substantialRevisions: number }> {
  const days = new Map<
    string,
    { editsCount: number; wordsAdded: number; sessionCount: number; substantialRevisions: number }
  >();
  for (const point of points) {
    const key = calendarDateKey(point.at, timeZone);
    const current = days.get(key) ?? {
      editsCount: 0,
      wordsAdded: 0,
      sessionCount: 0,
      substantialRevisions: 0,
    };
    current.editsCount += point.editsCount;
    current.wordsAdded += point.wordsAdded;
    current.sessionCount += point.sessionCount;
    current.substantialRevisions += point.substantialRevisions;
    days.set(key, current);
  }
  return days;
}

export function assemblePeriodHabits(
  points: ActivityPoint[],
  input: {
    now: Date;
    timeZone: string;
    windowStart: Date;
    streakLookbackStart: Date;
  },
): PeriodHabits {
  if (points.length === 0) {
    return {
      wordsAdded: 0,
      writingStreak: 0,
      writingCadence: 0,
      substantialRevisions: 0,
      favoriteWritingHour: null,
      hasActivityData: false,
    };
  }

  const windowPoints = points.filter(
    (point) => point.at >= input.windowStart && point.at < input.now,
  );
  const lookbackPoints = points.filter(
    (point) => point.at >= input.streakLookbackStart && point.at < input.now,
  );
  const windowDays = groupByCalendarDay(windowPoints, input.timeZone);
  const lookbackDays = groupByCalendarDay(lookbackPoints, input.timeZone);
  const activeKeys = new Set(
    [...lookbackDays.entries()]
      .filter(([, day]) => isActiveDay(day))
      .map(([key]) => key),
  );
  const wordsAdded = windowPoints.reduce((sum, point) => sum + point.wordsAdded, 0);
  const substantialRevisions = windowPoints.reduce(
    (sum, point) => sum + point.substantialRevisions,
    0,
  );
  const activeDays30 = [...windowDays.values()].filter(isActiveDay).length;

  return {
    wordsAdded,
    writingStreak: computeCalendarStreak(activeKeys, calendarDateKey(input.now, input.timeZone)),
    writingCadence: Math.round((activeDays30 / 30) * 7 * 10) / 10,
    substantialRevisions,
    favoriteWritingHour: favoriteHourFromSessions(windowPoints, input.timeZone),
    hasActivityData: true,
  };
}

export function readNarrativeWordDelta(metadata: unknown): {
  wordsAdded: number;
  wordsRemoved: number;
  substantialRevision: boolean;
} {
  if (!metadata || typeof metadata !== 'object') {
    return { wordsAdded: 0, wordsRemoved: 0, substantialRevision: false };
  }
  const raw = metadata as Record<string, unknown>;
  const wordDelta = typeof raw.wordDelta === 'number' && Number.isFinite(raw.wordDelta)
    ? Math.trunc(raw.wordDelta)
    : 0;
  return {
    wordsAdded: Math.max(0, wordDelta),
    wordsRemoved: Math.abs(Math.min(0, wordDelta)),
    substantialRevision: raw.substantialRevision === true,
  };
}

export function readWritingSessionContext(parentContext: string | null): {
  wordDelta: number;
  durationMs: number;
} {
  if (!parentContext) return { wordDelta: 0, durationMs: 0 };
  try {
    const parsed = JSON.parse(parentContext) as Record<string, unknown>;
    return {
      wordDelta:
        typeof parsed.wordDelta === 'number' && Number.isFinite(parsed.wordDelta)
          ? Math.trunc(parsed.wordDelta)
          : 0,
      durationMs:
        typeof parsed.durationMs === 'number' && Number.isFinite(parsed.durationMs)
          ? Math.max(0, Math.trunc(parsed.durationMs))
          : 0,
    };
  } catch {
    return { wordDelta: 0, durationMs: 0 };
  }
}
