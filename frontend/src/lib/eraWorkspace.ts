import type { ChronologyEra, EraDate } from '../../../shared/chronologyEras';
import { eraContainsDate } from '../../../shared/chronologyEras';
import {
  comparisonEraGeometry, fitComparisonIntervals, initialComparisonViewport,
  type HistoricalAxis, type HistoricalInterval,
} from './historicalTimeline';

export function selectWorkspaceEra(eras: ChronologyEra[], explicit: string | null, today?: EraDate) {
  if (explicit !== null) return eras.find(era => era.id === explicit);
  return eras.find(era => era.isCurrent) ?? (today && eras.find(era => eraContainsDate(era, today))) ?? eras[0];
}

export function eraBounds(era: ChronologyEra, axis: HistoricalAxis) {
  return comparisonEraGeometry(era, axis, { origin: 0n, offset: 0, span: 1440 }, 1);
}

/** Sample the entire loaded matching history, retaining recurrence identity. */
export function selectedEraEvents(rows: HistoricalInterval[], era: ChronologyEra, axis: HistoricalAxis,
  importance: Record<'MAJOR' | 'MINOR' | 'NOTICE', boolean>) {
  const bounds = eraBounds(era, axis);
  if (!bounds) return [];
  const matching = rows.filter(row => row.calendarId === era.calendarId && importance[row.representative.importance]
    && (bounds.start === null || row.end > bounds.start) && (bounds.end === null || row.start < bounds.end))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) || a.key.localeCompare(b.key));
  return matching.length <= 5 ? matching : Array.from({ length: 5 }, (_, i) => matching[Math.round(i * (matching.length - 1) / 4)]!);
}

/** Frame real boundaries, not configured navigation order. Open ends stay open. */
export function eraContext(eras: ChronologyEra[], selected: ChronologyEra, axis: HistoricalAxis, today?: EraDate) {
  const bounded = eras.map(era => eraBounds(era, axis)).filter((row): row is NonNullable<typeof row> => !!row);
  const current = bounded.find(row => row.era.id === selected.id);
  if (!current) return null;
  const anchor = current.start ?? current.end;
  const preceding = anchor === null ? undefined : bounded.filter(row => row.era.id !== selected.id && row.end !== null && row.end <= anchor)
    .sort((a, b) => a.end! > b.end! ? -1 : a.end! < b.end! ? 1 : a.era.id.localeCompare(b.era.id))[0];
  const endAnchor = current.end ?? current.start;
  const following = endAnchor === null ? undefined : bounded.filter(row => row.era.id !== selected.id && row.start !== null && row.start >= endAnchor)
    .sort((a, b) => a.start! < b.start! ? -1 : a.start! > b.start! ? 1 : a.era.id.localeCompare(b.era.id))[0];
  const points = [current.start, current.end, preceding?.start, preceding?.end, following?.start, following?.end]
    .filter((value): value is bigint => value != null);
  const view = points.length ? fitComparisonIntervals(points.map(value => ({ start: value, end: value + 1440n })), axis.calendar.epochOffset)!
    : initialComparisonViewport(axis, today ?? null, [], []);
  return { view, preceding: preceding?.era, following: following?.era };
}
