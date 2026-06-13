/**
 * Layer 1 — world event prompts from pressure (browser-safe contracts).
 * Advisory only; canon enters via GM accept → CalendarEvent.
 * @see docs/architecture-internal/faction-momentum.md
 */
import type { AdvanceMagnitude } from './globalTimeHooks.js';
import type { FactionMomentumState } from './factionMomentumMetadata.js';
import { FACTION_MOMENTUM_STATE_LABELS } from './factionMomentumMetadata.js';
import type { FactionPressureLine, WorldPressureProjection } from './worldPressureProjection.js';

export const WORLD_EVENT_SUGGESTION_SEMANTICS_VERSION = 'world-event-suggestion-v1';

export const WORLD_PRESSURE_EVENT_METADATA_VERSION = 'world-pressure-event-v1';

export const RECENT_SIMILAR_SUGGESTION_WINDOW_MINUTES = 14 * 24 * 60; // 14 days

export const WORLD_EVENT_SUGGESTION_STATUSES = [
  'pending',
  'accepted',
  'dismissed',
  'archived',
  'obsolete',
] as const;

export const WORLD_EVENT_SUGGESTION_TERMINAL_STATUSES = [
  'accepted',
  'dismissed',
  'archived',
  'obsolete',
] as const;

export type WorldEventSuggestionTerminalStatus =
  (typeof WORLD_EVENT_SUGGESTION_TERMINAL_STATUSES)[number];

/** UI History filter labels (dismissed → Rejected). */
export const HISTORY_STATUS_FILTER_LABELS: Record<WorldEventSuggestionTerminalStatus, string> = {
  accepted: 'Accepted',
  dismissed: 'Rejected',
  archived: 'Archived',
  obsolete: 'Obsolete',
};

export type WorldEventSuggestionStatus = (typeof WORLD_EVENT_SUGGESTION_STATUSES)[number];

export const WORLD_EVENT_SUGGESTION_KINDS = ['faction_pressure', 'era_trend'] as const;

export type WorldEventSuggestionKind = (typeof WORLD_EVENT_SUGGESTION_KINDS)[number];

export const WORLD_EVENT_SUGGESTION_SOURCE_TYPES = [
  'time_hook',
  'scheduled_effect',
  'other',
] as const;

export type WorldEventSuggestionSourceType = (typeof WORLD_EVENT_SUGGESTION_SOURCE_TYPES)[number];

export const WORLD_EVENT_NARRATIVE_MAX_LENGTH = 500;

export type TrendDirection = 'growth' | 'decline' | 'destabilizing';

export const MOMENTUM_TO_TREND_DIRECTION: Record<FactionMomentumState, TrendDirection | null> = {
  rising: 'growth',
  expanding: 'growth',
  resurgent: 'growth',
  declining: 'decline',
  dormant: 'decline',
  fragmenting: 'destabilizing',
  desperate: 'destabilizing',
  stable: null,
};

export type WorldPressureEventMetadata = {
  version: typeof WORLD_PRESSURE_EVENT_METADATA_VERSION;
  source: 'world_pressure';
  suggestionId: string;
  hookVersion: string;
  projectionEpoch: string;
  primaryOrgPageId?: string | null;
  eraId?: string | null;
  momentumState?: string | null;
  trendDirection?: TrendDirection | null;
};

export type WorldEventSuggestionCore = {
  id: string;
  status: WorldEventSuggestionStatus;
  kind: WorldEventSuggestionKind;
  title: string;
  narrative: string | null;
  occurredAtEpochMinute: string;
  sourceType: WorldEventSuggestionSourceType;
  sourceRef: string;
  idempotencyKey: string;
  primaryOrgPageId: string | null;
  eraId: string | null;
  momentumState: string | null;
  trendDirection: TrendDirection | null;
  acceptedCalendarEventId: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorldEventPromptDraft = {
  kind: WorldEventSuggestionKind;
  title: string;
  narrative: string | null;
  idempotencyKey: string;
  primaryOrgPageId: string | null;
  eraId: string | null;
  momentumState: string | null;
  trendDirection: TrendDirection | null;
};

export function normalizeWorldEventSuggestionStatus(raw: unknown): WorldEventSuggestionStatus {
  if (typeof raw !== 'string') return 'pending';
  const lower = raw.trim().toLowerCase();
  return WORLD_EVENT_SUGGESTION_STATUSES.find((s) => s === lower) ?? 'pending';
}

export function normalizeWorldEventSuggestionKind(raw: unknown): WorldEventSuggestionKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return WORLD_EVENT_SUGGESTION_KINDS.find((k) => k === lower) ?? null;
}

export function normalizeWorldEventSuggestionSourceType(
  raw: unknown,
): WorldEventSuggestionSourceType {
  if (typeof raw !== 'string') return 'other';
  const lower = raw.trim().toLowerCase();
  return WORLD_EVENT_SUGGESTION_SOURCE_TYPES.find((t) => t === lower) ?? 'other';
}

export function normalizeWorldEventNarrative(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, WORLD_EVENT_NARRATIVE_MAX_LENGTH);
}

export function isEligibleAdvanceMagnitudeForPrompts(magnitude: AdvanceMagnitude): boolean {
  return magnitude === 'medium' || magnitude === 'large' || magnitude === 'massive';
}

function factionPromptTitle(line: FactionPressureLine): string {
  const label = line.momentumLabel;
  return `${line.orgTitle} — ${label}`;
}

function factionIdempotencyKey(
  nextEpochMinute: string,
  orgPageId: string,
  momentumState: string,
): string {
  return `world-pressure:${nextEpochMinute}:${orgPageId}:${momentumState}`;
}

function eraTrendIdempotencyKey(
  nextEpochMinute: string,
  eraId: string,
  trendDirection: TrendDirection,
): string {
  return `world-pressure:${nextEpochMinute}:era-trend:${eraId}:${trendDirection}`;
}

function dominantTrendDirection(lines: FactionPressureLine[]): TrendDirection | null {
  const counts: Record<TrendDirection, number> = {
    growth: 0,
    decline: 0,
    destabilizing: 0,
  };
  for (const line of lines) {
    const state = line.momentumState;
    if (!state) continue;
    const direction = MOMENTUM_TO_TREND_DIRECTION[state];
    if (direction) counts[direction] += 1;
  }
  let best: TrendDirection | null = null;
  let bestCount = 0;
  for (const [direction, count] of Object.entries(counts) as Array<[TrendDirection, number]>) {
    if (count >= 2 && count > bestCount) {
      best = direction;
      bestCount = count;
    }
  }
  return best;
}

const ERA_TREND_TITLES: Record<TrendDirection, string> = {
  growth: 'Expansion across multiple factions',
  decline: 'Waning influence across the region',
  destabilizing: 'Instability spreading between factions',
};

export function deriveWorldEventPromptCandidates(
  projection: WorldPressureProjection,
  context: {
    advanceMagnitude: AdvanceMagnitude;
    nextEpochMinute: string;
    batchId?: string;
  },
): WorldEventPromptDraft[] {
  if (!isEligibleAdvanceMagnitudeForPrompts(context.advanceMagnitude)) {
    return [];
  }

  const drafts: WorldEventPromptDraft[] = [];
  const eraId = projection.currentEra.id;

  for (const line of projection.risingTensions.slice(0, 2)) {
    const momentumState = line.momentumState;
    if (!momentumState) continue;
    const narrative = line.bullets[0] ?? null;
    drafts.push({
      kind: 'faction_pressure',
      title: factionPromptTitle(line),
      narrative,
      idempotencyKey: factionIdempotencyKey(
        context.nextEpochMinute,
        line.orgPageId,
        momentumState,
      ),
      primaryOrgPageId: line.orgPageId,
      eraId,
      momentumState,
      trendDirection: MOMENTUM_TO_TREND_DIRECTION[momentumState],
    });
  }

  const trendDirection = dominantTrendDirection(projection.risingTensions);
  if (trendDirection && projection.eraTrends.length > 0) {
    drafts.push({
      kind: 'era_trend',
      title: ERA_TREND_TITLES[trendDirection],
      narrative: projection.eraTrends[0] ?? null,
      idempotencyKey: eraTrendIdempotencyKey(context.nextEpochMinute, eraId, trendDirection),
      primaryOrgPageId: null,
      eraId,
      momentumState: null,
      trendDirection,
    });
  }

  return drafts;
}

export function buildWorldPressureEventMetadata(input: {
  suggestionId: string;
  hookVersion: string;
  projectionEpoch: string;
  primaryOrgPageId?: string | null;
  eraId?: string | null;
  momentumState?: string | null;
  trendDirection?: TrendDirection | null;
}): WorldPressureEventMetadata {
  return {
    version: WORLD_PRESSURE_EVENT_METADATA_VERSION,
    source: 'world_pressure',
    suggestionId: input.suggestionId,
    hookVersion: input.hookVersion,
    projectionEpoch: input.projectionEpoch,
    primaryOrgPageId: input.primaryOrgPageId ?? null,
    eraId: input.eraId ?? null,
    momentumState: input.momentumState ?? null,
    trendDirection: input.trendDirection ?? null,
  };
}

export function formatWorldEventSuggestionKindLabel(kind: WorldEventSuggestionKind): string {
  if (kind === 'faction_pressure') return 'Faction development';
  return 'Regional shift';
}

export function formatMomentumStateLabel(state: string | null): string | null {
  if (!state) return null;
  const key = state as FactionMomentumState;
  return FACTION_MOMENTUM_STATE_LABELS[key] ?? state;
}
