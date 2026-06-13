import { randomUUID } from 'node:crypto';
import type { ConflictPhase, EconomicSignalKind } from '../../../shared/worldAdvance.js';

export type WorldSignalRecord =
  | {
      id: string;
      kind: 'economic';
      signal: EconomicSignalKind;
      atEpochMinute: string;
      note: string | null;
      sourceEventIds: string[];
    }
  | {
      id: string;
      kind: 'conflict';
      label: string;
      phase: ConflictPhase;
      atEpochMinute: string;
      orgPageIds: string[];
      regionPageIds: string[];
      displacementNote: string | null;
      casualtyNote: string | null;
      sourceEventIds: string[];
    }
  | {
      id: string;
      kind: 'territory_pressure';
      pressureLevel: 'low' | 'moderate' | 'high';
      atEpochMinute: string;
      note: string | null;
      sourceEventIds: string[];
    };

const MAX_SIGNALS = 48;
const SIGNALS_KEY = 'worldSignals';

export function parseWorldSignals(metadata: unknown): WorldSignalRecord[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = (metadata as Record<string, unknown>)[SIGNALS_KEY];
  if (!Array.isArray(raw)) return [];
  const out: WorldSignalRecord[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.id !== 'string' || typeof obj.kind !== 'string') continue;
    if (obj.kind === 'economic' && typeof obj.signal === 'string') {
      out.push({
        id: obj.id,
        kind: 'economic',
        signal: obj.signal as EconomicSignalKind,
        atEpochMinute: String(obj.atEpochMinute ?? '0'),
        note: typeof obj.note === 'string' ? obj.note : null,
        sourceEventIds: Array.isArray(obj.sourceEventIds)
          ? obj.sourceEventIds.filter((x): x is string => typeof x === 'string')
          : [],
      });
    } else if (obj.kind === 'conflict' && typeof obj.label === 'string') {
      out.push({
        id: obj.id,
        kind: 'conflict',
        label: obj.label,
        phase: (obj.phase as ConflictPhase) ?? 'latent',
        atEpochMinute: String(obj.atEpochMinute ?? '0'),
        orgPageIds: Array.isArray(obj.orgPageIds)
          ? obj.orgPageIds.filter((x): x is string => typeof x === 'string')
          : [],
        regionPageIds: Array.isArray(obj.regionPageIds)
          ? obj.regionPageIds.filter((x): x is string => typeof x === 'string')
          : [],
        displacementNote: typeof obj.displacementNote === 'string' ? obj.displacementNote : null,
        casualtyNote: typeof obj.casualtyNote === 'string' ? obj.casualtyNote : null,
        sourceEventIds: Array.isArray(obj.sourceEventIds)
          ? obj.sourceEventIds.filter((x): x is string => typeof x === 'string')
          : [],
      });
    } else if (obj.kind === 'territory_pressure') {
      out.push({
        id: obj.id,
        kind: 'territory_pressure',
        pressureLevel:
          obj.pressureLevel === 'high' || obj.pressureLevel === 'moderate'
            ? obj.pressureLevel
            : 'low',
        atEpochMinute: String(obj.atEpochMinute ?? '0'),
        note: typeof obj.note === 'string' ? obj.note : null,
        sourceEventIds: Array.isArray(obj.sourceEventIds)
          ? obj.sourceEventIds.filter((x): x is string => typeof x === 'string')
          : [],
      });
    }
  }
  return out;
}

export function appendWorldSignal(
  metadata: Record<string, unknown>,
  signal: WorldSignalRecord,
): Record<string, unknown> {
  const existing = parseWorldSignals(metadata);
  const worldSignals = [...existing, signal].slice(-MAX_SIGNALS);
  return { ...metadata, [SIGNALS_KEY]: worldSignals };
}

export function createEconomicSignalRecord(input: {
  signal: EconomicSignalKind;
  atEpochMinute: string;
  note?: string;
  sourceEventIds?: string[];
}): WorldSignalRecord {
  return {
    id: randomUUID(),
    kind: 'economic',
    signal: input.signal,
    atEpochMinute: input.atEpochMinute,
    note: input.note ?? null,
    sourceEventIds: input.sourceEventIds ?? [],
  };
}

export function createConflictSignalRecord(input: {
  label: string;
  phase: ConflictPhase;
  atEpochMinute: string;
  orgPageIds?: string[];
  regionPageIds?: string[];
  displacementNote?: string;
  casualtyNote?: string;
  sourceEventIds?: string[];
}): WorldSignalRecord {
  return {
    id: randomUUID(),
    kind: 'conflict',
    label: input.label,
    phase: input.phase,
    atEpochMinute: input.atEpochMinute,
    orgPageIds: input.orgPageIds ?? [],
    regionPageIds: input.regionPageIds ?? [],
    displacementNote: input.displacementNote ?? null,
    casualtyNote: input.casualtyNote ?? null,
    sourceEventIds: input.sourceEventIds ?? [],
  };
}
