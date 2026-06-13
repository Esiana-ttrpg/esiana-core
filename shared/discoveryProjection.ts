/**
 * Phase 23 — discovery projection contract.
 * Single shape for browse, search, links, inspector, and future surfaces.
 */
import {
  ContentRevelationStates,
  type ContentRevelationState,
} from './contentPresence.js';
import {
  KnowledgeStates,
  LoreConfidences,
  type KnowledgeState,
  type LoreClaimRecord,
  type LoreInterpretationAccountRecord,
} from './loreKnowledge.js';

export const RevelationSourceTypes = {
  SESSION: 'SESSION',
  MANUAL: 'MANUAL',
  IMPORT: 'IMPORT',
  QUEST: 'QUEST',
  SCENE: 'SCENE',
  RUMOR: 'RUMOR',
} as const;

export type RevelationSourceType =
  (typeof RevelationSourceTypes)[keyof typeof RevelationSourceTypes];

export type RevelationSource =
  | { type: 'SESSION'; sessionId: string }
  | { type: 'MANUAL' }
  | { type: 'IMPORT' }
  | { type: 'QUEST'; questId?: string }
  | { type: 'SCENE'; sceneId?: string }
  | { type: 'RUMOR'; circulationId?: string };

export interface RevelationProvenance {
  discoveredAt: string | null;
  source: RevelationSource | null;
}

export const DiscoveryStates = {
  HIDDEN: 'hidden',
  RUMOR: 'rumor',
  PARTIAL: 'partial',
  CONTESTED: 'contested',
  KNOWN: 'known',
} as const;

export type DiscoveryState =
  (typeof DiscoveryStates)[keyof typeof DiscoveryStates];

export interface DiscoveryStateProjection {
  state: DiscoveryState;
  available: boolean;
  gatedUntil?: number;
}

export interface DiscoveryProjection {
  isDiscovered: boolean;
  presenceState: ContentRevelationState;
  isManagerView: boolean;
  visibleChildCount?: number;
  undiscoveredCount?: number;
  visibleKnowledgeStates?: KnowledgeState[];
  revelation?: RevelationProvenance;
  discovery?: DiscoveryStateProjection;
}

export type PartyKnowledgeGroup =
  | 'confirmed'
  | 'suspected'
  | 'disproven'
  | 'contested';

export type PartyKnowledgeGroups = Record<
  PartyKnowledgeGroup,
  LoreClaimRecord[]
>;

export interface PartyKnowledgeProjection extends DiscoveryProjection {
  groups: PartyKnowledgeGroups;
  isContested: boolean;
  discovery: DiscoveryStateProjection;
}

export interface DiscoveryBrowseSummary {
  discoveredCount: number;
  undiscoveredCount: number;
  visibleChildCount: number;
}

export type ClaimRevelationInput = {
  discoveredAt?: Date | string | null;
  discoveredViaType?: string | null;
  discoveredViaSessionId?: string | null;
  discoveredViaRef?: string | null;
};

export type PresenceRevelationInput = {
  revealedAt?: Date | string | null;
  workflowKey?: string | null;
  reason?: string | null;
};

const PARTY_VISIBLE_KNOWLEDGE_STATES: KnowledgeState[] = [
  KnowledgeStates.KNOWN,
  KnowledgeStates.SUSPECTED,
  KnowledgeStates.CONFIRMED,
  KnowledgeStates.DISPROVEN,
];

export function isEntityDiscovered(
  presenceState: ContentRevelationState,
  isManagerView: boolean,
): boolean {
  if (isManagerView) return true;
  return (
    presenceState !== ContentRevelationStates.HIDDEN &&
    presenceState !== ContentRevelationStates.DRAFT
  );
}

export function resolvePresenceState(
  presenceMap: Map<string, ContentRevelationState>,
  entityId: string,
): ContentRevelationState {
  return presenceMap.get(entityId) ?? ContentRevelationStates.REVEALED;
}

export function projectPageDiscovery(
  pageId: string,
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
  revelation?: RevelationProvenance,
): DiscoveryProjection {
  const presenceState = resolvePresenceState(presenceMap, pageId);
  return {
    isDiscovered: isEntityDiscovered(presenceState, isManagerView),
    presenceState,
    isManagerView,
    visibleKnowledgeStates: isManagerView
      ? Object.values(KnowledgeStates)
      : PARTY_VISIBLE_KNOWLEDGE_STATES,
    revelation,
  };
}

export function partitionByDiscovery<T extends { id: string }>(
  items: T[],
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
): { discovered: T[]; undiscoveredCount: number } {
  if (isManagerView) {
    return { discovered: items, undiscoveredCount: 0 };
  }
  const discovered: T[] = [];
  let undiscoveredCount = 0;
  for (const item of items) {
    const state = resolvePresenceState(presenceMap, item.id);
    if (isEntityDiscovered(state, false)) {
      discovered.push(item);
    } else {
      undiscoveredCount += 1;
    }
  }
  return { discovered, undiscoveredCount };
}

export function projectBrowseSummary<T extends { id: string }>(
  items: T[],
  presenceMap: Map<string, ContentRevelationState>,
  isManagerView: boolean,
): DiscoveryBrowseSummary {
  const { discovered, undiscoveredCount } = partitionByDiscovery(
    items,
    presenceMap,
    isManagerView,
  );
  return {
    discoveredCount: discovered.length,
    undiscoveredCount,
    visibleChildCount: discovered.length,
  };
}

export function filterClaimsForPartyKnowledge(
  claims: LoreClaimRecord[],
  isManagerView: boolean,
): LoreClaimRecord[] {
  if (isManagerView) return claims;
  return claims.filter(
    (claim) =>
      claim.knowledgeState !== KnowledgeStates.UNDISCOVERED &&
      claim.knowledgeState !== null &&
      claim.knowledgeState !== undefined,
  );
}

function primaryKnowledgeGroup(
  state: KnowledgeState | null | undefined,
): PartyKnowledgeGroup | null {
  if (!state || state === KnowledgeStates.UNDISCOVERED) return null;
  if (state === KnowledgeStates.SUSPECTED) return 'suspected';
  if (state === KnowledgeStates.DISPROVEN) return 'disproven';
  if (state === KnowledgeStates.CONFIRMED || state === KnowledgeStates.KNOWN) {
    return 'confirmed';
  }
  return null;
}

function hasConflictingClaimStates(claims: LoreClaimRecord[]): boolean {
  const states = new Set(
    claims
      .map((c) => c.knowledgeState)
      .filter(
        (s): s is KnowledgeState =>
          s != null && s !== KnowledgeStates.UNDISCOVERED,
      ),
  );
  if (states.has(KnowledgeStates.CONFIRMED) && states.has(KnowledgeStates.DISPROVEN)) {
    return true;
  }
  if (states.has(KnowledgeStates.KNOWN) && states.has(KnowledgeStates.DISPROVEN)) {
    return true;
  }
  if (states.size >= 2 && states.has(KnowledgeStates.SUSPECTED)) {
    const nonSuspected = [...states].filter((s) => s !== KnowledgeStates.SUSPECTED);
    if (nonSuspected.length >= 2) return true;
  }
  return false;
}

function hasConflictingInterpretations(
  accounts: LoreInterpretationAccountRecord[],
): boolean {
  const hasConfirmed = accounts.some(
    (a) => a.confidence === LoreConfidences.VERIFIED,
  );
  const hasContested = accounts.some(
    (a) => a.confidence === LoreConfidences.CONTESTED,
  );
  if (hasConfirmed && hasContested) return true;
  const kinds = new Set(accounts.map((a) => a.accountKind));
  return accounts.length >= 2 && kinds.size > 1;
}

export function computeIsContested(
  claims: LoreClaimRecord[],
  interpretations: LoreInterpretationAccountRecord[] = [],
): boolean {
  if (hasConflictingClaimStates(claims)) return true;
  if (hasConflictingInterpretations(interpretations)) return true;
  return false;
}

export function computePartyKnowledgeGroups(
  claims: LoreClaimRecord[],
  interpretations: LoreInterpretationAccountRecord[] = [],
): PartyKnowledgeGroups {
  const groups: PartyKnowledgeGroups = {
    confirmed: [],
    suspected: [],
    disproven: [],
    contested: [],
  };
  const contested = computeIsContested(claims, interpretations);

  for (const claim of claims) {
    const bucket = primaryKnowledgeGroup(claim.knowledgeState);
    if (!bucket) continue;
    if (contested) {
      groups.contested.push(claim);
    } else {
      groups[bucket].push(claim);
    }
  }

  return groups;
}

export function inferRevelationSource(input: {
  discoveredViaType?: string | null;
  discoveredViaSessionId?: string | null;
  discoveredViaRef?: string | null;
  workflowKey?: string | null;
  reason?: string | null;
}): RevelationSource | null {
  const type = input.discoveredViaType?.trim().toUpperCase();
  const sessionId = input.discoveredViaSessionId?.trim();
  const ref = input.discoveredViaRef?.trim();
  const workflowKey = input.workflowKey?.trim().toLowerCase();

  if (type === RevelationSourceTypes.SESSION || sessionId) {
    if (sessionId) return { type: 'SESSION', sessionId };
  }
  if (type === RevelationSourceTypes.QUEST || workflowKey === 'quest_unlock') {
    return { type: 'QUEST', questId: ref || undefined };
  }
  if (type === RevelationSourceTypes.SCENE || workflowKey === 'scene_reveal') {
    return { type: 'SCENE', sceneId: ref || undefined };
  }
  if (type === RevelationSourceTypes.RUMOR) {
    return { type: 'RUMOR', circulationId: ref || undefined };
  }
  if (type === RevelationSourceTypes.IMPORT || workflowKey === 'import') {
    return { type: 'IMPORT' };
  }
  if (
    type === RevelationSourceTypes.MANUAL ||
    workflowKey === 'manual_reveal' ||
    workflowKey === 'session_reveal'
  ) {
    if (workflowKey === 'session_reveal' && ref) {
      return { type: 'SESSION', sessionId: ref };
    }
    return { type: 'MANUAL' };
  }
  if (sessionId) return { type: 'SESSION', sessionId };
  if (workflowKey) return { type: 'MANUAL' };
  return null;
}

export function serializeClaimRevelation(
  claim: ClaimRevelationInput,
): RevelationProvenance | null {
  const discoveredAt =
    claim.discoveredAt instanceof Date
      ? claim.discoveredAt.toISOString()
      : typeof claim.discoveredAt === 'string'
        ? claim.discoveredAt
        : null;
  const source = inferRevelationSource(claim);
  if (!discoveredAt && !source) return null;
  return { discoveredAt, source };
}

export function serializePresenceRevelation(
  presence: PresenceRevelationInput,
): RevelationProvenance | null {
  const discoveredAt =
    presence.revealedAt instanceof Date
      ? presence.revealedAt.toISOString()
      : typeof presence.revealedAt === 'string'
        ? presence.revealedAt
        : null;
  const source = inferRevelationSource({
    workflowKey: presence.workflowKey,
    discoveredViaRef: presence.reason,
  });
  if (!discoveredAt && !source) return null;
  return { discoveredAt, source };
}

export function emptyPartyKnowledgeGroups(): PartyKnowledgeGroups {
  return {
    confirmed: [],
    suspected: [],
    disproven: [],
    contested: [],
  };
}

function normalizeEpochMinute(
  value: number | bigint | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function resolveEpistemicState(
  claims: LoreClaimRecord[],
  interpretations: LoreInterpretationAccountRecord[],
): DiscoveryState {
  if (computeIsContested(claims, interpretations)) {
    return DiscoveryStates.CONTESTED;
  }

  const visibleClaims = claims.filter(
    (claim) =>
      claim.knowledgeState != null &&
      claim.knowledgeState !== KnowledgeStates.UNDISCOVERED,
  );

  if (visibleClaims.length === 0) {
    return DiscoveryStates.KNOWN;
  }

  const hasConfirmed = visibleClaims.some(
    (claim) =>
      claim.knowledgeState === KnowledgeStates.KNOWN ||
      claim.knowledgeState === KnowledgeStates.CONFIRMED,
  );
  const allSuspected = visibleClaims.every(
    (claim) => claim.knowledgeState === KnowledgeStates.SUSPECTED,
  );
  if (!hasConfirmed && allSuspected) {
    return DiscoveryStates.RUMOR;
  }

  const hasPartialConfidence = visibleClaims.some(
    (claim) => claim.confidence === LoreConfidences.PARTIAL,
  );
  const hasVerified = visibleClaims.some(
    (claim) => claim.confidence === LoreConfidences.VERIFIED,
  );
  const hasUnverified = visibleClaims.some(
    (claim) =>
      claim.confidence === LoreConfidences.UNVERIFIED ||
      claim.confidence === LoreConfidences.PARTIAL,
  );
  if (
    hasPartialConfidence ||
    (hasVerified && hasUnverified && !hasConfirmed)
  ) {
    return DiscoveryStates.PARTIAL;
  }

  return DiscoveryStates.KNOWN;
}

export function projectDiscoveryState(input: {
  presenceState: ContentRevelationState;
  availableFromEpochMinute?: number | null;
  campaignNowEpochMinute?: number | null;
  claims: LoreClaimRecord[];
  interpretations?: LoreInterpretationAccountRecord[];
  isManagerView: boolean;
}): DiscoveryStateProjection {
  const gateFrom = normalizeEpochMinute(input.availableFromEpochMinute);
  const campaignNow = normalizeEpochMinute(input.campaignNowEpochMinute);
  const interpretations = input.interpretations ?? [];

  if (input.isManagerView) {
    const epistemicState = resolveEpistemicState(input.claims, interpretations);
    return {
      state: epistemicState,
      available: true,
    };
  }

  const hiddenByPresence =
    input.presenceState === ContentRevelationStates.HIDDEN ||
    input.presenceState === ContentRevelationStates.DRAFT;

  const hiddenBySchedule =
    gateFrom != null &&
    campaignNow != null &&
    campaignNow < gateFrom;

  if (hiddenByPresence || hiddenBySchedule) {
    return {
      state: DiscoveryStates.HIDDEN,
      available: false,
      ...(hiddenBySchedule && !hiddenByPresence && gateFrom != null
        ? { gatedUntil: gateFrom }
        : {}),
    };
  }

  return {
    state: resolveEpistemicState(input.claims, interpretations),
    available: true,
  };
}

export function isDiscoveryAvailable(
  projection: DiscoveryStateProjection,
): boolean {
  return projection.available;
}
