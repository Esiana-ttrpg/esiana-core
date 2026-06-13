/**
 * Layer 1 — party-to-faction reputation contracts (browser-safe).
 * Distinct from org-to-org diplomatic relations and adventure investigation ledger.
 * @see docs/architecture-internal/downtime-reputation.md
 */

export const CAMPAIGN_REPUTATION_SEMANTICS_VERSION = 'campaign-reputation-v1';

export const REPUTATION_AXES = ['trust', 'notoriety'] as const;

export type ReputationAxis = (typeof REPUTATION_AXES)[number];

export const REPUTATION_EVENT_KINDS = [
  'drift',
  'band_crossing',
  'investigation',
  'rumor_spread',
  'project_outcome',
] as const;

export type ReputationEventKind = (typeof REPUTATION_EVENT_KINDS)[number];

export const REPUTATION_SUGGESTION_KINDS = [
  'band_crossing',
  'investigation',
  'rumor_spread',
] as const;

export type ReputationSuggestionKind = (typeof REPUTATION_SUGGESTION_KINDS)[number];

export const REPUTATION_SUGGESTION_STATUSES = [
  'pending',
  'accepted',
  'dismissed',
] as const;

export type ReputationSuggestionStatus = (typeof REPUTATION_SUGGESTION_STATUSES)[number];

export const REPUTATION_DIRECTIONS = ['up', 'down', 'flat'] as const;

export type ReputationDirection = (typeof REPUTATION_DIRECTIONS)[number];

export const REPUTATION_SOURCE_TYPES = [
  'time_hook',
  'project_outcome',
  'haven_activity',
  'rumor_pressure',
  'creative_drift',
  'other',
] as const;

export type ReputationSourceType = (typeof REPUTATION_SOURCE_TYPES)[number];

export const REPUTATION_NARRATIVE_MAX_LENGTH = 200;

export type FactionReputationScores = {
  trust: number;
  notoriety: number;
  lastSimulatedAtEpochMinute: string | null;
};

export type CampaignReputationSimulationState = {
  version: typeof CAMPAIGN_REPUTATION_SEMANTICS_VERSION;
  factions: Record<string, FactionReputationScores>;
};

export type ReputationEventCore = {
  id: string;
  factionPageId: string;
  eventKind: ReputationEventKind;
  axis: ReputationAxis;
  direction: ReputationDirection;
  fromBand: string | null;
  toBand: string | null;
  title: string;
  narrative: string | null;
  occurredAtEpochMinute: string;
  sourceType: ReputationSourceType;
  sourceRef: string;
  projectId: string | null;
  havenWikiPageId: string | null;
  acceptedFromSuggestionId: string | null;
  createdAt: string;
};

export type ReputationSuggestionCore = {
  id: string;
  status: ReputationSuggestionStatus;
  kind: ReputationSuggestionKind;
  factionPageId: string;
  axis: ReputationAxis;
  direction: ReputationDirection;
  fromBand: string | null;
  toBand: string | null;
  title: string;
  narrative: string | null;
  occurredAtEpochMinute: string;
  sourceType: ReputationSourceType;
  sourceRef: string;
  idempotencyKey: string;
  projectId: string | null;
  havenWikiPageId: string | null;
  claimId: string | null;
  targetOrgPageId: string | null;
  proposedTrust: number | null;
  proposedNotoriety: number | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function normalizeReputationAxis(raw: unknown): ReputationAxis | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return REPUTATION_AXES.find((axis) => axis === lower) ?? null;
}

export function normalizeReputationEventKind(raw: unknown): ReputationEventKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return REPUTATION_EVENT_KINDS.find((kind) => kind === lower) ?? null;
}

export function normalizeReputationSuggestionKind(raw: unknown): ReputationSuggestionKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return REPUTATION_SUGGESTION_KINDS.find((kind) => kind === lower) ?? null;
}

export function normalizeReputationSuggestionStatus(
  raw: unknown,
): ReputationSuggestionStatus {
  if (typeof raw !== 'string') return 'pending';
  const lower = raw.trim().toLowerCase();
  return (
    REPUTATION_SUGGESTION_STATUSES.find((status) => status === lower) ?? 'pending'
  );
}

export function normalizeReputationDirection(raw: unknown): ReputationDirection {
  if (typeof raw !== 'string') return 'flat';
  const lower = raw.trim().toLowerCase();
  return REPUTATION_DIRECTIONS.find((direction) => direction === lower) ?? 'flat';
}

export function normalizeReputationSourceType(raw: unknown): ReputationSourceType {
  if (typeof raw !== 'string') return 'other';
  const lower = raw.trim().toLowerCase();
  return REPUTATION_SOURCE_TYPES.find((type) => type === lower) ?? 'other';
}

export function normalizeReputationNarrative(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, REPUTATION_NARRATIVE_MAX_LENGTH);
}

export function clampReputationScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function defaultFactionReputationScores(): FactionReputationScores {
  return {
    trust: 50,
    notoriety: 50,
    lastSimulatedAtEpochMinute: null,
  };
}

export function emptyCampaignReputationState(): CampaignReputationSimulationState {
  return {
    version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
    factions: {},
  };
}

function normalizeFactionScores(raw: unknown): FactionReputationScores {
  const defaults = defaultFactionReputationScores();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  const trust =
    typeof record.trust === 'number' && Number.isFinite(record.trust)
      ? clampReputationScore(record.trust)
      : defaults.trust;
  const notoriety =
    typeof record.notoriety === 'number' && Number.isFinite(record.notoriety)
      ? clampReputationScore(record.notoriety)
      : defaults.notoriety;
  const lastSimulatedAtEpochMinute =
    typeof record.lastSimulatedAtEpochMinute === 'string'
      ? record.lastSimulatedAtEpochMinute
      : null;
  return { trust, notoriety, lastSimulatedAtEpochMinute };
}

export function parseCampaignReputationState(
  raw: unknown,
): CampaignReputationSimulationState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyCampaignReputationState();
  }
  const record = raw as Record<string, unknown>;
  const factionsRaw = record.factions;
  const factions: Record<string, FactionReputationScores> = {};
  if (factionsRaw && typeof factionsRaw === 'object' && !Array.isArray(factionsRaw)) {
    for (const [factionPageId, scores] of Object.entries(factionsRaw)) {
      if (!factionPageId.trim()) continue;
      factions[factionPageId] = normalizeFactionScores(scores);
    }
  }
  return {
    version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
    factions,
  };
}

export function serializeCampaignReputationState(
  state: CampaignReputationSimulationState,
): Record<string, unknown> {
  return {
    version: state.version,
    factions: { ...state.factions },
  };
}

export function formatReputationDirectionArrow(direction: ReputationDirection): string {
  switch (direction) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
}
