import { randomUUID } from 'node:crypto';
import {
  compareDateParts,
  dateSortKey,
  normalizeChronologyDate,
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeRecordId,
  normalizeStringArray,
  type ChronologyDateParts,
} from './entityRelationTypes.js';
import type { LocationEventKind } from '../../../shared/worldAdvance.js';

export interface CharacterLocationEvent {
  id: string;
  effectiveDate: ChronologyDateParts;
  locationPageId: string;
  kind: LocationEventKind;
  note: string | null;
  sourceEventIds: string[];
}

export interface CharacterLocationHistoryFields {
  locationHistory: CharacterLocationEvent[];
}

const MAX_LOCATION_HISTORY = 64;

function normalizeLocationEvent(raw: unknown): CharacterLocationEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const effectiveDate = normalizeChronologyDate(obj.effectiveDate);
  const locationPageId = normalizeNullablePageId(obj.locationPageId);
  if (!effectiveDate || !locationPageId) return null;
  const kind = obj.kind;
  if (
    kind !== 'residency' &&
    kind !== 'travel' &&
    kind !== 'displacement' &&
    kind !== 'intent'
  ) {
    return null;
  }
  return {
    id: normalizeRecordId(obj.id),
    effectiveDate,
    locationPageId,
    kind,
    note: normalizeNullableText(obj.note),
    sourceEventIds: normalizeStringArray(obj.sourceEventIds),
  };
}

export function parseCharacterLocationHistory(
  metadata: unknown,
): CharacterLocationHistoryFields {
  if (!metadata || typeof metadata !== 'object') {
    return { locationHistory: [] };
  }
  const raw = metadata as Record<string, unknown>;
  const historyRaw = Array.isArray(raw.locationHistory) ? raw.locationHistory : [];
  const locationHistory = historyRaw
    .map(normalizeLocationEvent)
    .filter((e): e is CharacterLocationEvent => e !== null)
    .sort((a, b) => compareDateParts(a.effectiveDate, b.effectiveDate));
  return { locationHistory };
}

export function resolveCharacterLocationAt(
  history: CharacterLocationEvent[],
  date: ChronologyDateParts,
): CharacterLocationEvent | null {
  const queryKey = dateSortKey(date);
  let best: CharacterLocationEvent | null = null;
  let bestKey = Number.NEGATIVE_INFINITY;
  for (const event of history) {
    const eventKey = dateSortKey(event.effectiveDate);
    if (eventKey <= queryKey && eventKey >= bestKey) {
      best = event;
      bestKey = eventKey;
    }
  }
  return best;
}

export function appendCharacterLocationEvent(
  metadata: Record<string, unknown>,
  input: {
    locationPageId: string;
    kind: LocationEventKind;
    effectiveDate: ChronologyDateParts;
    note?: string;
    sourceEventIds?: string[];
  },
): Record<string, unknown> {
  const parsed = parseCharacterLocationHistory(metadata);
  const next: CharacterLocationEvent = {
    id: randomUUID(),
    effectiveDate: input.effectiveDate,
    locationPageId: input.locationPageId,
    kind: input.kind,
    note: input.note ?? null,
    sourceEventIds: input.sourceEventIds ?? [],
  };
  const locationHistory = [...parsed.locationHistory, next].slice(-MAX_LOCATION_HISTORY);
  return { ...metadata, locationHistory };
}
