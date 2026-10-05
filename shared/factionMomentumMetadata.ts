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
  return Object.hasOwn(ORGANIZATION_WORLD_STATE_TO_MOMENTUM, key)
    ? ORGANIZATION_WORLD_STATE_TO_MOMENTUM[key] ?? null
    : null;
}

/**
 * Engine default for new trajectories — least directional existing state.
 * Not inferred from GM-authored `direction` text.
 */
export const DEFAULT_TRAJECTORY_MOMENTUM_STATE: FactionMomentumState = 'stable';

/** Shared planning fields for Organizations · Characters · Locations. */
export type EraTrajectory = {
  /** From — era when this direction begins/applies. */
  eraId: string | null;
  eraSnapshot?: { id?: string; name: string; calendarName: string; visibility?: string };
  byEraSnapshot?: { id?: string; name: string; calendarName: string; visibility?: string };
  /** Optional inclusive upper bound; null = open-ended from From onward. */
  byEraId: string | null;
  /** GM-authored freeform direction. */
  direction: string | null;
  /** GM-authored intended outcome. */
  outcome: string | null;
  gmNote: string | null;
};

function trajectoryAppliesToEra(
  trajectory: Pick<EraTrajectory, 'eraId' | 'byEraId'>,
  currentEra: CampaignEra,
  eras: CampaignEra[],
): boolean {
  if (!trajectory.eraId) return false;
  const fromEra = eras.find((era) => era.id === trajectory.eraId);
  if (!fromEra) {
    return trajectory.eraId === currentEra.id;
  }
  if (fromEra.calendarId && currentEra.calendarId !== fromEra.calendarId) return false;
  if (currentEra.sortOrder < fromEra.sortOrder) return false;
  if (trajectory.byEraId == null) return true;
  const byEra = eras.find((era) => era.id === trajectory.byEraId);
  if (!byEra) return true;
  return currentEra.sortOrder <= byEra.sortOrder;
}

/** Stable editor identity also preserves multiple detached trajectories on one page. */
export function trajectoryKey(trajectory: EraTrajectory): string {
  return trajectory.eraId ?? `deleted:${trajectory.eraSnapshot?.id ?? trajectory.eraSnapshot?.name ?? ''}`;
}

function pickExplicitTrajectoryMatch<T extends Pick<EraTrajectory, 'eraId' | 'byEraId'>>(
  eraTrajectories: T[],
  eraId: string,
  eras: CampaignEra[],
): T | null {
  const currentEra = eras.find((era) => era.id === eraId);

  if (eras.length > 0 && currentEra) {
    const matches = eraTrajectories.filter((trajectory) =>
      trajectoryAppliesToEra(trajectory, currentEra, eras),
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => {
      const aExact = a.eraId === eraId ? 1 : 0;
      const bExact = b.eraId === eraId ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      const aFrom = eras.find((era) => era.id === a.eraId)?.sortOrder ?? -1;
      const bFrom = eras.find((era) => era.id === b.eraId)?.sortOrder ?? -1;
      return bFrom - aFrom;
    });
    return matches[0] ?? null;
  }

  return eraTrajectories.find((t) => t.eraId === eraId) ?? null;
}

/**
 * Explicit From/By resolution for any subject — no world-state fallback.
 * Characters and Locations use this path only.
 */
export function resolveExplicitTrajectoryForEra<T extends Pick<EraTrajectory, 'eraId' | 'byEraId'>>(input: {
  eraTrajectories: T[];
  eraId: string;
  /** When provided, From/By matching uses era sortOrder (By null = open-ended). */
  eras?: CampaignEra[];
}): T | null {
  return pickExplicitTrajectoryMatch(input.eraTrajectories, input.eraId, input.eras ?? []);
}

/**
 * Prefer explicit era trajectory (From/By range when eras provided);
 * fall back to organization world state for the target era.
 * Organization-only compatibility path — do not use for Characters/Locations.
 */
export function resolveFactionTrajectoryForEra(input: {
  eraTrajectories: FactionEraTrajectory[];
  eraId: string;
  worldState: string | null;
  /** When provided, From/By matching uses era sortOrder (By null = open-ended). */
  eras?: CampaignEra[];
}): FactionEraTrajectory | null {
  const explicit = resolveExplicitTrajectoryForEra({
    eraTrajectories: input.eraTrajectories,
    eraId: input.eraId,
    eras: input.eras,
  });
  if (explicit) return explicit;

  const momentumState = organizationWorldStateToMomentum(input.worldState);
  if (!momentumState) return null;
  return {
    eraId: input.eraId,
    byEraId: null,
    direction: null,
    outcome: null,
    momentumState,
    pressure: null,
    gmNote: null,
  };
}

export type CampaignEra = {
  calendarId?: string;
  calendarName?: string;
  isMasterTime?: boolean;
  visibility?: string;
  id: string;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  epochStartMinute: string | null;
  epochEndMinute: string | null;
  narrativeNote: string | null;
};

export type CampaignMomentumState = {
  chronologyOwned?: boolean;
  version: typeof CAMPAIGN_MOMENTUM_SEMANTICS_VERSION;
  eras: CampaignEra[];
  worldPressurePaused?: boolean;
  worldDevelopment?: WorldDevelopmentSettings;
};

/** Organization trajectory = shared planning fields + faction engine state. */
export type FactionEraTrajectory = EraTrajectory & {
  /** Engine development signal — not semantic direction text. */
  momentumState: FactionMomentumState;
  /** 0–100 internal weighting only; not player-facing. */
  pressure: number | null;
  desiredDirection?: 'rising' | 'stable' | 'declining' | null;
  desiredNarrative?: string[] | null;
  allowedCauses?: string[] | null;
  activityLevel?: 'dormant' | 'low' | 'medium' | 'high' | null;
  developmentTypes?: string[] | null;
  isKeyFaction?: boolean | null;
};

/** Create a planning-only trajectory (Characters / Locations). */
export function createEraTrajectory(
  patch: Partial<EraTrajectory> & Pick<EraTrajectory, 'eraId'>,
): EraTrajectory {
  return {
    eraId: patch.eraId,
    byEraId: patch.byEraId ?? null,
    direction: patch.direction ?? null,
    outcome: patch.outcome ?? null,
    gmNote: patch.gmNote ?? null,
    ...(patch.eraSnapshot ? { eraSnapshot: patch.eraSnapshot } : {}),
    ...(patch.byEraSnapshot ? { byEraSnapshot: patch.byEraSnapshot } : {}),
  };
}

export function createFactionEraTrajectory(
  patch: Partial<FactionEraTrajectory> & Pick<FactionEraTrajectory, 'eraId'>,
): FactionEraTrajectory {
  return {
    ...createEraTrajectory(patch),
    momentumState: patch.momentumState ?? DEFAULT_TRAJECTORY_MOMENTUM_STATE,
    pressure: patch.pressure ?? null,
  };
}

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

function normalizeShortText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLen) : null;
}

export function normalizeCampaignEra(raw: unknown, index: number): CampaignEra | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = normalizeEraId(obj.id);
  if (!id) return null;
  return {
    id,
    ...(typeof obj.calendarId === 'string' ? { calendarId: obj.calendarId, calendarName: String(obj.calendarName ?? ''), isMasterTime: obj.isMasterTime === true, visibility: String(obj.visibility ?? 'PARTY') } : {}),
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

  if (eras.length === 0 && obj.chronologyOwned !== true) {
    return createDefaultCampaignMomentumState();
  }

  const currentCount = eras.filter((e) => e.isCurrent).length;
  const normalizedEras =
    obj.chronologyOwned === true || currentCount === 1
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
    chronologyOwned: obj.chronologyOwned === true,
    worldPressurePaused: obj.worldPressurePaused === true,
    worldDevelopment,
  };
}

export function serializeCampaignMomentumState(
  state: CampaignMomentumState,
): Record<string, unknown> {
  return {
    version: CAMPAIGN_MOMENTUM_SEMANTICS_VERSION,
    chronologyOwned: state.chronologyOwned,
    eras: state.eras.map((era) => ({
      ...era,
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
  if (state.chronologyOwned) return state.eras.find(e => e.isCurrent && e.isMasterTime)
    ?? { id: '', name: 'No current era', isCurrent: false, sortOrder: -1, epochStartMinute: null, epochEndMinute: null, narrativeNote: null };
  return state.eras.find((e) => e.isCurrent) ?? state.eras[0] ?? createDefaultPresentEra();
}

function eraContainsEpochMinute(era: CampaignEra, target: bigint, exclusiveEnd = false): boolean {
  const startRaw = era.epochStartMinute;
  const endRaw = era.epochEndMinute;
  if (startRaw == null && endRaw == null) return false;

  const start = startRaw != null ? BigInt(startRaw) : null;
  const end = endRaw != null ? BigInt(endRaw) : null;

  if (start != null && target < start) return false;
  if (end != null && (exclusiveEnd ? target >= end : target > end)) return false;
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

  if (state.chronologyOwned && !getCurrentCampaignEra(state).id) return getCurrentCampaignEra(state);
  const matches = state.eras.filter((era) => (!state.chronologyOwned || era.isMasterTime) && eraContainsEpochMinute(era, target, state.chronologyOwned));
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

/** Normalize shared planning fields (Characters / Locations). Requires eraId only. */
export function normalizeEraTrajectory(raw: unknown): EraTrajectory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const eraId = normalizeEraId(obj.eraId);
  if (!eraId && !(obj.eraSnapshot && typeof obj.eraSnapshot === 'object')) return null;
  return {
    eraId,
    ...(obj.eraSnapshot && typeof obj.eraSnapshot === 'object' ? { eraSnapshot: obj.eraSnapshot as EraTrajectory['eraSnapshot'] } : {}),
    ...(obj.byEraSnapshot && typeof obj.byEraSnapshot === 'object' ? { byEraSnapshot: obj.byEraSnapshot as EraTrajectory['byEraSnapshot'] } : {}),
    byEraId: normalizeEraId(obj.byEraId),
    direction: normalizeShortText(obj.direction, 120),
    outcome: normalizeShortText(obj.outcome, 200),
    gmNote: normalizeNarrativeNote(obj.gmNote),
  };
}

export function normalizeEraTrajectories(raw: unknown): EraTrajectory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: EraTrajectory[] = [];
  for (const item of raw) {
    const trajectory = normalizeEraTrajectory(item);
    if (!trajectory || (trajectory.eraId && seen.has(trajectory.eraId))) continue;
    if (trajectory.eraId) seen.add(trajectory.eraId);
    result.push(trajectory);
  }
  return result;
}

export function normalizeFactionEraTrajectory(raw: unknown): FactionEraTrajectory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const base = normalizeEraTrajectory(raw);
  const momentumState = normalizeMomentumState(obj.momentumState);
  if (!base || !momentumState) return null;
  return {
    ...base,
    momentumState,
    pressure: normalizePressure(obj.pressure),
  };
}

export function normalizeFactionEraTrajectories(raw: unknown): FactionEraTrajectory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: FactionEraTrajectory[] = [];
  for (const item of raw) {
    const trajectory = normalizeFactionEraTrajectory(item);
    if (!trajectory || (trajectory.eraId && seen.has(trajectory.eraId))) continue;
    if (trajectory.eraId) seen.add(trajectory.eraId);
    result.push(trajectory);
  }
  return result;
}
