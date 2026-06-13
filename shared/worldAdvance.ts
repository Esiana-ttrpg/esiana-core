/**
 * Layer 3 — GM-triggered world advance batch (chronology-first event fabric).
 */
import type { ConsequenceEffect } from './narrativeConsequence.js';
import type { WorldConditionSurface } from './worldConditionSurfaces.js';
import type { WorldAdvanceNarrativeSynthesis } from './worldAdvanceSynthesis.js';
import type { ChronologyDateParts } from './chronologyTypes.js';
import type { TimeAdvanceUnit } from './timeAdvanceUnits.js';
import { isTimeAdvanceUnit } from './timeAdvanceUnits.js';

export type { TimeAdvanceUnit };

export const WORLD_ADVANCE_VERSION = 'world-advance-v1';
export const WORLD_ADVANCE_CATEGORY = 'World advance';

export const WorldAdvanceProjectionDomains = {
  FACTION: 'faction',
  TERRITORIAL: 'territorial',
  ECONOMIC: 'economic',
  CONFLICT: 'conflict',
  SEASONAL: 'seasonal',
  NPC_MOBILITY: 'npc_mobility',
} as const;

export type WorldAdvanceProjectionDomain =
  (typeof WorldAdvanceProjectionDomains)[keyof typeof WorldAdvanceProjectionDomains];

export type WorldAdvanceTimeStep = {
  amount: number;
  unit: TimeAdvanceUnit;
};

export type EconomicSignalKind =
  | 'scarcity'
  | 'surplus'
  | 'trade_disruption'
  | 'prosperity_growth'
  | 'prosperity_decline';

export type ConflictPhase = 'latent' | 'escalating' | 'active' | 'de_escalating' | 'resolved';

export type LocationEventKind =
  | 'residency'
  | 'travel'
  | 'displacement'
  | 'intent';

export type WorldAdvanceEffectBase = {
  id: string;
  domain: WorldAdvanceProjectionDomain;
  sourceEventIds?: string[];
  sourcePageIds?: string[];
};

export type AppendOrgRelationEventEffect = WorldAdvanceEffectBase & {
  type: 'append_org_relation_event';
  domain: typeof WorldAdvanceProjectionDomains.FACTION;
  orgPageId: string;
  targetOrgId: string;
  relationType: string;
  stance: string;
  visibility?: string;
  note?: string;
  effectiveDate?: ChronologyDateParts;
};

export type TerritoryPressureEffect = WorldAdvanceEffectBase & {
  type: 'territory_pressure';
  domain: typeof WorldAdvanceProjectionDomains.TERRITORIAL;
  orgPageId?: string;
  regionPageId?: string;
  pressureLevel: 'low' | 'moderate' | 'high';
  note?: string;
};

export type SuggestBorderKeyframeEffect = WorldAdvanceEffectBase & {
  type: 'suggest_border_keyframe';
  domain: typeof WorldAdvanceProjectionDomains.TERRITORIAL;
  sceneObjectId: string;
  orgPageId?: string;
  stance?: string;
  note?: string;
};

export type EconomicSignalEffect = WorldAdvanceEffectBase & {
  type: 'economic_signal';
  domain: typeof WorldAdvanceProjectionDomains.ECONOMIC;
  targetKind: 'org' | 'location';
  pageId: string;
  signal: EconomicSignalKind;
  note?: string;
};

export type ConflictFrontEffect = WorldAdvanceEffectBase & {
  type: 'conflict_front';
  domain: typeof WorldAdvanceProjectionDomains.CONFLICT;
  label: string;
  phase: ConflictPhase;
  orgPageIds?: string[];
  regionPageIds?: string[];
  displacementNote?: string;
  casualtyNote?: string;
};

export type RecordSeasonContextEffect = WorldAdvanceEffectBase & {
  type: 'record_season_context';
  domain: typeof WorldAdvanceProjectionDomains.SEASONAL;
  regionPageId?: string;
  note?: string;
};

export type AppendLocationEventEffect = WorldAdvanceEffectBase & {
  type: 'append_location_event';
  domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
  characterPageId: string;
  locationPageId: string;
  kind: LocationEventKind;
  note?: string;
  effectiveDate?: ChronologyDateParts;
};

export type SetCurrentLocationEffect = WorldAdvanceEffectBase & {
  type: 'set_current_location';
  domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
  characterPageId: string;
  locationPageId: string | null;
};

export type DisplacementEffect = WorldAdvanceEffectBase & {
  type: 'displacement';
  domain: typeof WorldAdvanceProjectionDomains.NPC_MOBILITY;
  characterPageId: string;
  fromLocationPageId?: string;
  toLocationPageId?: string;
  note?: string;
};

/** Layer-2 consequence effects reusable in world-advance batches. */
export type ConsequenceBridgeEffect = WorldAdvanceEffectBase & {
  type: 'consequence_bridge';
  domain: WorldAdvanceProjectionDomain;
  consequence: ConsequenceEffect;
};

export type WorldAdvanceEffect =
  | AppendOrgRelationEventEffect
  | TerritoryPressureEffect
  | SuggestBorderKeyframeEffect
  | EconomicSignalEffect
  | ConflictFrontEffect
  | RecordSeasonContextEffect
  | AppendLocationEventEffect
  | SetCurrentLocationEffect
  | DisplacementEffect
  | ConsequenceBridgeEffect;

export type WorldAdvanceBatchRequest = {
  version?: typeof WORLD_ADVANCE_VERSION;
  advanceTime?: WorldAdvanceTimeStep;
  effects: WorldAdvanceEffect[];
  note?: string;
  /** Client-supplied idempotency for safe retries of the whole batch. */
  batchIdempotencyKey?: string;
};

export type WorldAdvanceEffectPreview = {
  effectId: string;
  domain: WorldAdvanceProjectionDomain;
  type: string;
  summary: string;
  warnings: string[];
  pendingConfirmations: string[];
};

export type WorldAdvancePreview = {
  version: typeof WORLD_ADVANCE_VERSION;
  asOfEpochMinute: string;
  asOfLabel: string | null;
  projectedEpochMinute: string;
  effectPreviews: WorldAdvanceEffectPreview[];
  conditionSurfaces: WorldConditionSurface[];
  narrativeSynthesis: WorldAdvanceNarrativeSynthesis;
  warnings: string[];
};

export type WorldAdvanceApplyResult = WorldAdvancePreview & {
  batchId: string;
  chronologyEventId: string;
  appliedCount: number;
  skippedCount: number;
  receiptKeys: string[];
};

export type WorldAdvanceBatchPayload = {
  version: typeof WORLD_ADVANCE_VERSION;
  batchId: string;
  actorUserId: string;
  effects: WorldAdvanceEffect[];
  note?: string;
  advanceTime?: WorldAdvanceTimeStep;
  previousEpochMinute: string;
  nextEpochMinute: string;
  appliedCount: number;
  skippedCount: number;
  synthesisProjection?: WorldAdvanceNarrativeSynthesis;
};

export type WorldAdvanceBatchSummary = {
  chronologyEventId: string;
  batchId: string;
  title: string;
  targetEpochMinute: string;
  appliedCount: number;
  effectCount: number;
  headline: string | null;
  createdAt: string;
};

const DOMAIN_VALUES = new Set(Object.values(WorldAdvanceProjectionDomains));

function isObject(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw);
}

function parseBase(raw: Record<string, unknown>): WorldAdvanceEffectBase | null {
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const domain = raw.domain;
  if (typeof domain !== 'string' || !DOMAIN_VALUES.has(domain as WorldAdvanceProjectionDomain)) {
    return null;
  }
  return {
    id: raw.id.trim(),
    domain: domain as WorldAdvanceProjectionDomain,
    sourceEventIds: Array.isArray(raw.sourceEventIds)
      ? raw.sourceEventIds.filter((x): x is string => typeof x === 'string')
      : undefined,
    sourcePageIds: Array.isArray(raw.sourcePageIds)
      ? raw.sourcePageIds.filter((x): x is string => typeof x === 'string')
      : undefined,
  };
}

export function parseWorldAdvanceEffect(raw: unknown): WorldAdvanceEffect | null {
  if (!isObject(raw)) return null;
  const base = parseBase(raw);
  if (!base) return null;
  const type = raw.type;
  if (typeof type !== 'string') return null;

  switch (type) {
    case 'append_org_relation_event':
      if (
        typeof raw.orgPageId !== 'string' ||
        typeof raw.targetOrgId !== 'string' ||
        typeof raw.relationType !== 'string' ||
        typeof raw.stance !== 'string'
      ) {
        return null;
      }
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.FACTION,
        type,
        orgPageId: raw.orgPageId,
        targetOrgId: raw.targetOrgId,
        relationType: raw.relationType,
        stance: raw.stance,
        visibility: typeof raw.visibility === 'string' ? raw.visibility : undefined,
        note: typeof raw.note === 'string' ? raw.note : undefined,
        effectiveDate: raw.effectiveDate as ChronologyDateParts | undefined,
      };
    case 'territory_pressure':
      if (raw.pressureLevel !== 'low' && raw.pressureLevel !== 'moderate' && raw.pressureLevel !== 'high') {
        return null;
      }
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.TERRITORIAL,
        type,
        orgPageId: typeof raw.orgPageId === 'string' ? raw.orgPageId : undefined,
        regionPageId: typeof raw.regionPageId === 'string' ? raw.regionPageId : undefined,
        pressureLevel: raw.pressureLevel,
        note: typeof raw.note === 'string' ? raw.note : undefined,
      };
    case 'suggest_border_keyframe':
      if (typeof raw.sceneObjectId !== 'string') return null;
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.TERRITORIAL,
        type,
        sceneObjectId: raw.sceneObjectId,
        orgPageId: typeof raw.orgPageId === 'string' ? raw.orgPageId : undefined,
        stance: typeof raw.stance === 'string' ? raw.stance : undefined,
        note: typeof raw.note === 'string' ? raw.note : undefined,
      };
    case 'economic_signal':
      if (
        (raw.targetKind !== 'org' && raw.targetKind !== 'location') ||
        typeof raw.pageId !== 'string' ||
        typeof raw.signal !== 'string'
      ) {
        return null;
      }
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.ECONOMIC,
        type,
        targetKind: raw.targetKind,
        pageId: raw.pageId,
        signal: raw.signal as EconomicSignalKind,
        note: typeof raw.note === 'string' ? raw.note : undefined,
      };
    case 'conflict_front':
      if (typeof raw.label !== 'string' || typeof raw.phase !== 'string') return null;
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.CONFLICT,
        type,
        label: raw.label,
        phase: raw.phase as ConflictPhase,
        orgPageIds: Array.isArray(raw.orgPageIds)
          ? raw.orgPageIds.filter((x): x is string => typeof x === 'string')
          : undefined,
        regionPageIds: Array.isArray(raw.regionPageIds)
          ? raw.regionPageIds.filter((x): x is string => typeof x === 'string')
          : undefined,
        displacementNote:
          typeof raw.displacementNote === 'string' ? raw.displacementNote : undefined,
        casualtyNote: typeof raw.casualtyNote === 'string' ? raw.casualtyNote : undefined,
      };
    case 'record_season_context':
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.SEASONAL,
        type,
        regionPageId: typeof raw.regionPageId === 'string' ? raw.regionPageId : undefined,
        note: typeof raw.note === 'string' ? raw.note : undefined,
      };
    case 'append_location_event':
      if (
        typeof raw.characterPageId !== 'string' ||
        typeof raw.locationPageId !== 'string' ||
        typeof raw.kind !== 'string'
      ) {
        return null;
      }
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.NPC_MOBILITY,
        type,
        characterPageId: raw.characterPageId,
        locationPageId: raw.locationPageId,
        kind: raw.kind as LocationEventKind,
        note: typeof raw.note === 'string' ? raw.note : undefined,
        effectiveDate: raw.effectiveDate as ChronologyDateParts | undefined,
      };
    case 'set_current_location':
      if (typeof raw.characterPageId !== 'string') return null;
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.NPC_MOBILITY,
        type,
        characterPageId: raw.characterPageId,
        locationPageId:
          raw.locationPageId === null
            ? null
            : typeof raw.locationPageId === 'string'
              ? raw.locationPageId
              : null,
      };
    case 'displacement':
      if (typeof raw.characterPageId !== 'string') return null;
      return {
        ...base,
        domain: WorldAdvanceProjectionDomains.NPC_MOBILITY,
        type,
        characterPageId: raw.characterPageId,
        fromLocationPageId:
          typeof raw.fromLocationPageId === 'string' ? raw.fromLocationPageId : undefined,
        toLocationPageId:
          typeof raw.toLocationPageId === 'string' ? raw.toLocationPageId : undefined,
        note: typeof raw.note === 'string' ? raw.note : undefined,
      };
    case 'consequence_bridge':
      if (!isObject(raw.consequence)) return null;
      return {
        ...base,
        type,
        domain: base.domain,
        consequence: raw.consequence as ConsequenceEffect,
      };
    default:
      return null;
  }
}

export function parseWorldAdvanceBatchRequest(raw: unknown): WorldAdvanceBatchRequest | null {
  if (!isObject(raw)) return null;
  if (raw.version !== undefined && raw.version !== WORLD_ADVANCE_VERSION) return null;
  if (!Array.isArray(raw.effects)) return null;
  const effects: WorldAdvanceEffect[] = [];
  for (const entry of raw.effects) {
    const parsed = parseWorldAdvanceEffect(entry);
    if (parsed) effects.push(parsed);
  }
  if (effects.length === 0) return null;

  let advanceTime: WorldAdvanceTimeStep | undefined;
  if (isObject(raw.advanceTime)) {
    const unit = raw.advanceTime.unit;
    const amount = raw.advanceTime.amount;
    if (isTimeAdvanceUnit(unit) && typeof amount === 'number' && amount > 0) {
      advanceTime = { amount: Math.trunc(amount), unit };
    }
  }

  return {
    version: WORLD_ADVANCE_VERSION,
    advanceTime,
    effects,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    batchIdempotencyKey:
      typeof raw.batchIdempotencyKey === 'string' ? raw.batchIdempotencyKey : undefined,
  };
}

export function parseWorldAdvanceBatchPayload(raw: unknown): WorldAdvanceBatchPayload | null {
  if (!isObject(raw)) return null;
  if (raw.version !== WORLD_ADVANCE_VERSION) return null;
  if (typeof raw.batchId !== 'string' || typeof raw.actorUserId !== 'string') return null;
  if (!Array.isArray(raw.effects)) return null;
  const effects: WorldAdvanceEffect[] = [];
  for (const entry of raw.effects) {
    const parsed = parseWorldAdvanceEffect(entry);
    if (parsed) effects.push(parsed);
  }
  return {
    version: WORLD_ADVANCE_VERSION,
    batchId: raw.batchId,
    actorUserId: raw.actorUserId,
    effects,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    advanceTime: raw.advanceTime as WorldAdvanceTimeStep | undefined,
    previousEpochMinute: String(raw.previousEpochMinute ?? '0'),
    nextEpochMinute: String(raw.nextEpochMinute ?? '0'),
    appliedCount: typeof raw.appliedCount === 'number' ? raw.appliedCount : 0,
    skippedCount: typeof raw.skippedCount === 'number' ? raw.skippedCount : 0,
    synthesisProjection: raw.synthesisProjection as WorldAdvanceNarrativeSynthesis | undefined,
  };
}
