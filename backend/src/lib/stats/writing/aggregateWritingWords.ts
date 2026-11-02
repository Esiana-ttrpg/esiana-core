import { readNarrativeWordDelta } from '../personal/assemblePeriodHabits.js';
import { reconstructedWordChange } from './recordWritingContribution.js';

export type ContributionWordRow = {
  narrativeEventId: string | null;
  occurredAt: Date;
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
  availability: string;
  origin: string;
};

export type NarrativeWordEvent = {
  id: string;
  type: string;
  createdAt: Date;
  metadata: unknown;
};

export type AggregatedWritingWords = {
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
  measuredCount: number;
  reconstructedCount: number;
  completeness: 'measured' | 'partial' | 'reconstructed' | 'none';
};

const WORD_EVENT_TYPES = new Set(['PAGE_CREATED', 'PAGE_EDITED']);

export function aggregateWritingWords(input: {
  contributions: ContributionWordRow[];
  events: NarrativeWordEvent[];
  start: Date;
  end: Date;
}): AggregatedWritingWords {
  const inWindow = (at: Date) => at >= input.start && at < input.end;
  const contributionByEvent = new Map<string, ContributionWordRow>();
  const unmatched: ContributionWordRow[] = [];
  for (const row of input.contributions) {
    if (row.origin !== 'human') continue;
    if (!inWindow(row.occurredAt)) continue;
    if (row.narrativeEventId) contributionByEvent.set(row.narrativeEventId, row);
    else unmatched.push(row);
  }

  let wordsAdded = 0;
  let wordsRemoved = 0;
  let measuredCount = 0;
  let reconstructedCount = 0;
  const seenEvents = new Set<string>();

  const addRow = (row: {
    wordsAdded: number;
    wordsRemoved: number;
    availability: string;
  }) => {
    wordsAdded += row.wordsAdded;
    wordsRemoved += row.wordsRemoved;
    if (row.availability === 'measured') measuredCount += 1;
    else reconstructedCount += 1;
  };

  for (const event of input.events) {
    if (!WORD_EVENT_TYPES.has(event.type) || !inWindow(event.createdAt)) continue;
    seenEvents.add(event.id);
    const contribution = contributionByEvent.get(event.id);
    if (contribution) {
      addRow(contribution);
      continue;
    }
    const delta = readNarrativeWordDelta(event.metadata);
    addRow(reconstructedWordChange(delta.wordsAdded - delta.wordsRemoved));
  }

  for (const row of unmatched) addRow(row);
  for (const [eventId, row] of contributionByEvent) {
    if (!seenEvents.has(eventId)) addRow(row);
  }

  const netChange = wordsAdded - wordsRemoved;
  let completeness: AggregatedWritingWords['completeness'] = 'none';
  if (measuredCount > 0 && reconstructedCount === 0) completeness = 'measured';
  else if (measuredCount > 0) completeness = 'partial';
  else if (reconstructedCount > 0) completeness = 'reconstructed';

  return {
    wordsAdded,
    wordsRemoved,
    netChange,
    measuredCount,
    reconstructedCount,
    completeness,
  };
}

export function writingSessionRollupFields(input: {
  durationMs: number;
  linksAdded: number;
  at: Date;
}): {
  linksCreated: number;
  sessionCount: number;
  sessionMinutes: number;
  sessionHourUtc: number;
} {
  return {
    linksCreated: Math.max(0, input.linksAdded),
    sessionCount: 1,
    sessionMinutes: Math.max(1, Math.round(input.durationMs / 60_000)),
    sessionHourUtc: input.at.getUTCHours(),
  };
}
