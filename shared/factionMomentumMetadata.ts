/**
 * Layer 1 — campaign era + faction trajectory contracts (browser-safe).
 * Advisory pressure layer; does not mutate canon (events, relations, territory).
 * @see docs/architecture-internal/faction-momentum.md
 * @see docs/architecture-internal/world-development.md
 */
import type { WorldDevelopmentSettings } from './worldDevelopmentMetadata.js';
import { parseWorldDevelopmentSettings } from './worldDevelopmentMetadata.js';

export const CAMPAIGN_MOMENTUM_SEMANTICS_VERSION = 'campaign-momentum-v1';

export const FACTION_MOMENTUM_STATES = [
  'rising',
  'stable',
  'fragmenting',
  'declining',
  'dormant',
  'expanding',
  'desperate',
  'resurgent',
] as const;

export type FactionMomentumState = (typeof FACTION_MOMENTUM_STATES)[number];

export const FACTION_MOMENTUM_STATE_LABELS: Record<FactionMomentumState, string> = {
  rising: 'Rising',
  stable: 'Stable',
  fragmenting: 'Fragmenting',
  declining: 'Declining',
  dormant: 'Dormant',
  expanding: 'Expanding',
  desperate: 'Desperate',
  resurgent: 'Resurgent',
};

/** States that surface as "rising tension" in world pressure projection. */
export const RISING_TENSION_MOMENTUM_STATES: readonly FactionMomentumState[] = [
  'rising',
  'expanding',
  'fragmenting',
  'desperate',
  'resurgent',
  'declining',
];

/** Legacy organization world-state labels → era trajectory momentum (advisory fallback). */
const ORGANIZATION_WORLD_STATE_TO_MOMENTUM: Record<string, FactionMomentumState> = {
  rising: 'rising',
  fragmented: 'fragmenting',
  dormant: 'dormant',
  expanding: 'expanding',
  schismatic: 'fragmenting',
  occupied: 'declining',
  exiled: 'declining',
  corrupt: 'desperate',
  reforming: 'resurgent',
  declining: 'declining',
};

export function organizationWorldStateToMomentum(
  worldState: string | null | undefined,
): FactionMomentumState | null {
  if (!worldState || typeof worldState !== 'string') return null;
  const key = worldState.trim().toLowerCase();
  return ORGANIZATION_WORLD_STATE_TO_MOMENTUM[key] ?? null;
}

/** Prefer explicit era trajectory; fall back to organization world state for current era. */
export function resolveFactionTrajectoryForEra(input: {
  eraTrajectories: FactionEraTrajectory[];
  eraId: string;
  worldState: string | null;
}): FactionEraTrajectory | null {
  const explicit = input.eraTrajectories.find((t) => t.eraId === input.eraId);
  if (explicit) return explicit;
  const momentumState = organizationWorldStateToMomentum(input.worldState);
  if (!momentumState) return null;
  return {
    eraId: input.eraId,
    momentumState,
    pressure: null,
    gmNote: null,
  };
}

export type CampaignEra = {
  id: string;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  epochStartMinute: string | null;
  epochEndMinute: string | null;
  narrativeNote: string | null;
};

export type CampaignMomentumState = {
  version: typeof CAMPAIGN_MOMENTUM_SEMANTICS_VERSION;
  eras: CampaignEra[];
  worldPressurePaused?: boolean;
  worldDevelopment?: WorldDevelopmentSettings;
};

export type FactionEraTrajectory = {
  eraId: string;
  momentumState: FactionMomentumState;
  /** 0–100 internal weighting only; not player-facing. */
  pressure: number | null;
  gmNote: string | null;
  desiredDirection?: 'rising' | 'stable' | 'declining' | null;
  desiredNarrative?: string[] | null;
  allowedCauses?: string[] | null;
  activityLevel?: 'dormant' | 'low' | 'medium' | 'high' | null;
  developmentTypes?: string[] | null;
  isKeyFaction?: boolean | null;
};

export const DEFAULT_PRESENT_ERA_ID = 'era-present';

export function createDefaultPresentEra(): CampaignEra {
  return {
    id: DEFAULT_PRESENT_ERA_ID,
    name: 'Present',
    sortOrder: 0,
    isCurrent: true,
    epochStartMinute: null,
    epochEndMinute: null,
    narrativeNote: null,
  };
}

export function createDefaultCampaignMomentumState(): CampaignMomentumState {
  return {
    version: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    eras: [createDefaultPresentEra()],
    worldPressurePaused: false,
  };
}

function normalizeEpochMinute(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'bigint') return raw.toString();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  return null;
}

function normalizeMomentumState(raw: unknown): FactionMomentumState | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return (FACTION_MOMENTUM_STATES as readonly string[]).includes(lower)
    ? (lower as FactionMomentumState)
    : null;
}

function normalizePressure(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeEraId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEraName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
}

function normalizeNarrativeNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

export function normalizeCampaignEra(raw: unknown, index: number): CampaignEra | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = normalizeEraId(obj.id);
  if (!id) return null;
  return {
    id,
    name: normalizeEraName(obj.name, `Era ${index + 1}`),
    sortOrder:
      typeof obj.sortOrder === 'number' && Number.isFinite(obj.sortOrder)
        ? Math.trunc(obj.sortOrder)
        : index,
    isCurrent: obj.isCurrent === true,
    epochStartMinute: normalizeEpochMinute(obj.epochStartMinute),
    epochEndMinute: normalizeEpochMinute(obj.epochEndMinute),
    narrativeNote: normalizeNarrativeNote(obj.narrativeNote),
  };
}

export function parseCampaignMomentumState(raw: unknown): CampaignMomentumState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createDefaultCampaignMomentumState();
  }
  const obj = raw as Record<string, unknown>;
  const erasRaw = Array.isArray(obj.eras) ? obj.eras : [];
  const eras = erasRaw
    .map((era, index) => normalizeCampaignEra(era, index))
    .filter((era): era is CampaignEra => era !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (eras.length === 0) {
    return createDefaultCampaignMomentumState();
  }

  const currentCount = eras.filter((e) => e.isCurrent).length;
  const normalizedEras =
    currentCount === 1
      ? eras
      : eras.map((era, index) => ({
          ...era,
          isCurrent: index === 0,
        }));

  const worldDevelopment =
    obj.worldDevelopment != null ? parseWorldDevelopmentSettings(obj.worldDevelopment) : undefined;

  return {
    version: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    eras: normalizedEras,
    worldPressurePaused: obj.worldPressurePaused === true,
    worldDevelopment,
  };
}

export function serializeCampaignMomentumState(
  state: CampaignMomentumState,
): Record<string, unknown> {
  return {
    version: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    eras: state.eras.map((era) => ({
      id: era.id,
      name: era.name,
      sortOrder: era.sortOrder,
      isCurrent: era.isCurrent,
      epochStartMinute: era.epochStartMinute,
      epochEndMinute: era.epochEndMinute,
      narrativeNote: era.narrativeNote,
    })),
    worldPressurePaused: state.worldPressurePaused === true,
    ...(state.worldDevelopment ? { worldDevelopment: state.worldDevelopment } : {}),
  };
}

export function getCurrentCampaignEra(state: CampaignMomentumState): CampaignEra {
  return state.eras.find((e) => e.isCurrent) ?? state.eras[0] ?? createDefaultPresentEra();
}

function eraContainsEpochMinute(era: CampaignEra, target: bigint): boolean {
  const startRaw = era.epochStartMinute;
  const endRaw = era.epochEndMinute;
  if (startRaw == null && endRaw == null) return false;

  const start = startRaw != null ? BigInt(startRaw) : null;
  const end = endRaw != null ? BigInt(endRaw) : null;

  if (start != null && target < start) return false;
  if (end != null && target > end) return false;
  return true;
}

function eraSpanWidth(era: CampaignEra): bigint | null {
  const startRaw = era.epochStartMinute;
  const endRaw = era.epochEndMinute;
  if (startRaw == null || endRaw == null) return null;
  const width = BigInt(endRaw) - BigInt(startRaw);
  return width >= 0n ? width : null;
}

/** Resolve which authored era applies at a target epoch (bounds-based; falls back to current). */
export function resolveCampaignEraAtEpoch(
  state: CampaignMomentumState,
  targetEpochMinute: string,
): CampaignEra {
  let target: bigint;
  try {
    target = BigInt(targetEpochMinute);
    if (target < 0n) return getCurrentCampaignEra(state);
  } catch {
    return getCurrentCampaignEra(state);
  }

  const matches = state.eras.filter((era) => eraContainsEpochMinute(era, target));
  if (matches.length === 0) {
    return getCurrentCampaignEra(state);
  }

  matches.sort((a, b) => {
    const widthA = eraSpanWidth(a);
    const widthB = eraSpanWidth(b);
    if (widthA != null && widthB != null && widthA !== widthB) {
      return widthA < widthB ? -1 : 1;
    }
    if (widthA != null && widthB == null) return -1;
    if (widthA == null && widthB != null) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return matches[0] ?? getCurrentCampaignEra(state);
}

export function normalizeFactionEraTrajectory(raw: unknown): FactionEraTrajectory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const eraId = normalizeEraId(obj.eraId);
  const momentumState = normalizeMomentumState(obj.momentumState);
  if (!eraId || !momentumState) return null;
  return {
    eraId,
    momentumState,
    pressure: normalizePressure(obj.pressure),
    gmNote: normalizeNarrativeNote(obj.gmNote),
  };
}

export function normalizeFactionEraTrajectories(raw: unknown): FactionEraTrajectory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: FactionEraTrajectory[] = [];
  for (const item of raw) {
    const trajectory = normalizeFactionEraTrajectory(item);
    if (!trajectory || seen.has(trajectory.eraId)) continue;
    seen.add(trajectory.eraId);
    result.push(trajectory);
  }
  return result;
}
