import type { CampaignEra, Prisma } from './prismaClient.js';
import { nextEraOccurrence } from './eraRecurrence.js';
import { resolveEventStartCoordinates, type CalendarRowForResolve } from './chronologyOccurrences.js';
import { calendarEpochMinuteForDate } from './timeEngine.js';

export type EraHistoryEntry = { through: string; starts: Record<string, string> };
export type EraHistory = Record<string, EraHistoryEntry>;
type Event = { id: string; calendarId: string; targetYear: number | null; targetMonth: number | null; targetDay: number | null; targetEpochMinute: bigint | null; repeatInterval: number | null; limitRepetitions: number | null };

/** Stable ordinal slots preserve occurrence IDs even when authored order is nonchronological. */
export function eraOccurrenceSchedule(event: Event, calendar: CalendarRowForResolve, now: bigint | null, eras: CampaignEra[], history: EraHistoryEntry | undefined): Array<bigint | null> {
  const resolved = resolveEventStartCoordinates(event, calendar, now);
  const origin = resolved.epochMinute != null ? BigInt(resolved.epochMinute)
    : resolved.year != null && resolved.month != null && resolved.day != null ? calendarEpochMinuteForDate(calendar, resolved.year, resolved.month, resolved.day) : null;
  const preserved = new Set(Object.values(history?.starts ?? {}));
  return Array.from({ length: Math.min(event.limitRepetitions ?? 100, 100) }, (_, index) => {
    const saved = history?.starts[String(index)];
    if (saved != null) return BigInt(saved);
    const candidate = index === 0 ? origin : origin == null ? null : nextEraOccurrence(eras, event.calendarId, origin, index, event.repeatInterval ?? 1);
    // Changes to eras cannot invent or move an occurrence into the frozen past.
    if (candidate != null && history && (candidate <= BigInt(history.through) || preserved.has(candidate.toString()))) return null;
    return candidate;
  });
}

/** Called inside the era mutation transaction, before any structural changes, with no viewer filter. */
export async function preserveHistoricalEraOccurrences(db: Prisma.TransactionClient, campaignId: string): Promise<void> {
  const [campaign, momentum, eras, events] = await Promise.all([
    db.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    db.campaignMomentum.findUniqueOrThrow({ where: { campaignId }, select: { eraRecurrenceHistory: true } }),
    db.campaignEra.findMany({ where: { campaignId } }),
    db.calendarEvent.findMany({ where: { calendar: { campaignId }, isRepeating: true, repeatUnit: 'ERAS' }, include: { calendar: true } }),
  ]);
  const history = (momentum.eraRecurrenceHistory ?? {}) as EraHistory;
  for (const event of events) {
    const previous = history[event.id];
    const starts = { ...previous?.starts };
    for (const [index, minute] of eraOccurrenceSchedule(event, event.calendar, campaign.currentEpochMinute, eras, previous).entries()) {
      if (minute != null && minute <= campaign.currentEpochMinute) starts[String(index)] = minute.toString();
    }
    history[event.id] = { through: previous && BigInt(previous.through) > campaign.currentEpochMinute ? previous.through : campaign.currentEpochMinute.toString(), starts };
  }
  await db.campaignMomentum.update({ where: { campaignId }, data: { eraRecurrenceHistory: history as Prisma.InputJsonValue } });
}
