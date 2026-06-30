import { prisma } from '../prisma.js';
import { utcDateBucket } from './userWritingDailyRollup.js';

export type RollupHabits = {
  wordsAdded30d: number;
  writingStreak: number;
  writingCadence: number;
  substantialRevisions30d: number;
  favoriteWritingHour: number | null;
  hasRollupData: boolean;
};

function isActiveDay(row: {
  editsCount: number;
  wordsAdded: number;
  sessionCount: number;
}): boolean {
  return row.editsCount > 0 || row.wordsAdded > 0 || row.sessionCount > 0;
}

function computeStreak(
  rows: Array<{ date: Date; editsCount: number; wordsAdded: number; sessionCount: number }>,
  today: Date,
): number {
  const activeDates = new Set(
    rows
      .filter(isActiveDay)
      .map((r) => utcDateBucket(r.date).toISOString()),
  );
  if (activeDates.size === 0) return 0;

  let streak = 0;
  const cursor = utcDateBucket(today);
  while (activeDates.has(cursor.toISOString())) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function computeFavoriteHour(
  rows: Array<{ peakHourUtc: number | null; sessionMinutes: number }>,
): number | null {
  const hourWeights = new Map<number, number>();
  for (const row of rows) {
    if (row.peakHourUtc == null || row.sessionMinutes <= 0) continue;
    hourWeights.set(
      row.peakHourUtc,
      (hourWeights.get(row.peakHourUtc) ?? 0) + row.sessionMinutes,
    );
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

export async function buildRollupHabits(userId: string): Promise<RollupHabits> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const streakLookback = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  const rows = await prisma.userWritingDailyRollup.findMany({
    where: {
      userId,
      date: { gte: streakLookback },
    },
    orderBy: { date: 'desc' },
  });

  if (rows.length === 0) {
    return {
      wordsAdded30d: 0,
      writingStreak: 0,
      writingCadence: 0,
      substantialRevisions30d: 0,
      favoriteWritingHour: null,
      hasRollupData: false,
    };
  }

  const rows30 = rows.filter((r) => r.date >= utcDateBucket(since30));
  const wordsAdded30d = rows30.reduce((sum: number, r) => sum + r.wordsAdded, 0);
  const substantialRevisions30d = rows30.reduce(
    (sum: number, r) => sum + r.substantialRevisions,
    0,
  );
  const activeDays30 = rows30.filter(isActiveDay).length;
  const writingCadence = Math.round((activeDays30 / 30) * 7 * 10) / 10;
  const favoriteWritingHour = computeFavoriteHour(rows30);

  return {
    wordsAdded30d,
    writingStreak: computeStreak(rows, now),
    writingCadence,
    substantialRevisions30d,
    favoriteWritingHour,
    hasRollupData: true,
  };
}
