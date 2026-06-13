/**
 * Layer 1 — unified narrative projection semantics.
 * Centralizes viewer context, revelation, role visibility, and temporal policy.
 * @see docs/architecture-internal/narrative-projection-semantics.md
 */
import {
  ContentRevelationStates,
  type ContentRevelationState,
} from './contentPresence.js';
import {
  isEntityDiscovered,
  projectPageDiscovery,
  resolvePresenceState,
  type DiscoveryProjection,
  type RevelationProvenance,
} from './discoveryProjection.js';
import {
  clampViewEpochMinuteForParty,
  MapRevelationStates,
  WikiVisibilityTier,
  type PresenceContext,
} from './mapPresence.js';
import {
  isLifecyclePartyVisible,
  projectNarrativeLifecycle,
  type NarrativeLifecycleState,
} from './narrativeLifecycle.js';
import type { ChronologyDateParts } from './chronologyTypes.js';
import { normalizeChronologyDateParts } from './chronologyTypes.js';
import { isElevatedMembershipRole } from './campaignPolicy/membershipRoles.js';

export type NarrativePerspective = 'party' | 'elevated';

export const NarrativeVisibilityTier = {
  PUBLIC: 'PUBLIC',
  PARTY: 'PARTY',
  ELEVATED_ONLY: 'ELEVATED_ONLY',
  SECRET: 'SECRET',
} as const;

export type NarrativeVisibilityTierValue =
  (typeof NarrativeVisibilityTier)[keyof typeof NarrativeVisibilityTier];

export const TemporalProjectionSurface = {
  MAP_SCENE: 'map_scene',
  LORE_SUMMARY: 'lore_summary',
  CHRONOLOGY_TIMELINE: 'chronology_timeline',
  ENTITY_GRAPH: 'entity_graph',
  SESSION_CHRONICLE: 'session_chronicle',
} as const;

export type TemporalProjectionSurfaceValue =
  (typeof TemporalProjectionSurface)[keyof typeof TemporalProjectionSurface];

export const TemporalHistoricalMode = {
  EPOCH_VIEW: 'epoch_view',
  DATE_PARTS_VIEW: 'date_parts_view',
  PRESENT_ONLY: 'present_only',
} as const;

export type TemporalHistoricalModeValue =
  (typeof TemporalHistoricalMode)[keyof typeof TemporalHistoricalMode];

export interface TemporalProjectionPolicy {
  surface: TemporalProjectionSurfaceValue;
  historicalMode: TemporalHistoricalModeValue;
  partyClampsToCampaignPresent: boolean;
  elevatedAcceptsHistoricalInput: boolean;
}

export const TEMPORAL_PROJECTION_POLICIES: Record<
  TemporalProjectionSurfaceValue,
  TemporalProjectionPolicy
> = {
  [TemporalProjectionSurface.MAP_SCENE]: {
    surface: TemporalProjectionSurface.MAP_SCENE,
    historicalMode: TemporalHistoricalMode.EPOCH_VIEW,
    partyClampsToCampaignPresent: true,
    elevatedAcceptsHistoricalInput: true,
  },
  [TemporalProjectionSurface.LORE_SUMMARY]: {
    surface: TemporalProjectionSurface.LORE_SUMMARY,
    historicalMode: TemporalHistoricalMode.DATE_PARTS_VIEW,
    partyClampsToCampaignPresent: false,
    elevatedAcceptsHistoricalInput: true,
  },
  [TemporalProjectionSurface.CHRONOLOGY_TIMELINE]: {
    surface: TemporalProjectionSurface.CHRONOLOGY_TIMELINE,
    historicalMode: TemporalHistoricalMode.PRESENT_ONLY,
    partyClampsToCampaignPresent: true,
    elevatedAcceptsHistoricalInput: false,
  },
  [TemporalProjectionSurface.ENTITY_GRAPH]: {
    surface: TemporalProjectionSurface.ENTITY_GRAPH,
    historicalMode: TemporalHistoricalMode.PRESENT_ONLY,
    partyClampsToCampaignPresent: true,
    elevatedAcceptsHistoricalInput: false,
  },
  [TemporalProjectionSurface.SESSION_CHRONICLE]: {
    surface: TemporalProjectionSurface.SESSION_CHRONICLE,
    historicalMode: TemporalHistoricalMode.PRESENT_ONLY,
    partyClampsToCampaignPresent: true,
    elevatedAcceptsHistoricalInput: false,
  },
};

export interface NarrativeViewerCapabilities {
  canManageChronology: boolean;
  canRevealContent: boolean;
  canUseGhostMode: boolean;
  isElevatedWiki: boolean;
  isElevatedMap: boolean;
}

export interface CampaignChronologyNow {
  epochMinute: bigint;
  dateParts: ChronologyDateParts;
}

export interface NarrativeViewerContext {
  perspective: NarrativePerspective;
  role: string | null;
  capabilities: NarrativeViewerCapabilities;
  campaignNow: CampaignChronologyNow;
}

export type RevelationDenyReason = 'visible' | 'unrevealed' | 'draft';

export interface RevelationProjection {
  visible: boolean;
  presenceState: ContentRevelationState;
  denyReason?: RevelationDenyReason;
  revelation?: RevelationProvenance;
}

export type RoleVisibilityDenyReason = 'visible' | 'role_elevated_only' | 'role_secret';

export interface RoleVisibilityProjection {
  visible: boolean;
  tier: NarrativeVisibilityTierValue;
  denyReason?: RoleVisibilityDenyReason;
}

export interface TemporalViewResolution {
  policy: TemporalProjectionPolicy;
  effectiveEpochMinute: bigint;
  effectiveDateParts: ChronologyDateParts;
  isCampaignPresent: boolean;
  requestedEpochIgnored: boolean;
  requestedDateIgnored: boolean;
}

export interface WikiPageVisibilityProjection {
  visible: boolean;
  revelation: RevelationProjection;
  discovery: DiscoveryProjection;
}

export interface TimelineEventVisibilityProjection {
  visible: boolean;
  revelation: RevelationProjection;
  role: RoleVisibilityProjection;
}

export interface EntityRelationVisibilityProjection {
  visible: boolean;
  role: RoleVisibilityProjection;
  temporal: TemporalViewResolution;
}

export interface MapSceneProjectionContext {
  presenceContext: PresenceContext;
  temporal: TemporalViewResolution;
}

export type BuildNarrativeViewerContextInput = {
  role: string | null;
  campaignNow: CampaignChronologyNow;
  allowPlayerChronologyManagement?: boolean;
};

export function isElevatedRole(role: string | null | undefined): boolean {
  return Boolean(role && isElevatedMembershipRole(role));
}

export function derivePerspective(
  isElevated: boolean,
): NarrativePerspective {
  return isElevated ? 'elevated' : 'party';
}

export function buildNarrativeViewerCapabilities(
  role: string | null,
  allowPlayerChronologyManagement = false,
): NarrativeViewerCapabilities {
  const elevated = isElevatedRole(role);
  const canManageChronology =
    elevated ||
    (role === 'PARTICIPANT' && allowPlayerChronologyManagement) ||
    (role === 'Player' && allowPlayerChronologyManagement);
  return {
    canManageChronology,
    canRevealContent: elevated,
    canUseGhostMode: elevated,
    isElevatedWiki: elevated,
    isElevatedMap: elevated,
  };
}

export function buildNarrativeViewerContext(
  input: BuildNarrativeViewerContextInput,
): NarrativeViewerContext {
  const elevated = isElevatedRole(input.role);
  return {
    perspective: derivePerspective(elevated),
    role: input.role,
    capabilities: buildNarrativeViewerCapabilities(
      input.role,
      input.allowPlayerChronologyManagement,
    ),
    campaignNow: input.campaignNow,
  };
}

export function isManagerView(ctx: NarrativeViewerContext): boolean {
  return ctx.perspective === 'elevated';
}

export function fromChronologyVisibility(
  visibility: string | null | undefined,
): NarrativeVisibilityTierValue {
  const normalized = String(visibility ?? 'PUBLIC').trim().toUpperCase();
  if (normalized === 'DM_ONLY') return NarrativeVisibilityTier.ELEVATED_ONLY;
  if (normalized === 'PARTY') return NarrativeVisibilityTier.PARTY;
  return NarrativeVisibilityTier.PUBLIC;
}

export function fromWikiMapVisibility(
  visibility: string | null | undefined,
): NarrativeVisibilityTierValue {
  const normalized = String(visibility ?? WikiVisibilityTier.PUBLIC).trim();
  if (
    normalized === WikiVisibilityTier.DM_ONLY ||
    normalized.toUpperCase() === 'DM_ONLY'
  ) {
    return NarrativeVisibilityTier.ELEVATED_ONLY;
  }
  if (normalized === WikiVisibilityTier.PARTY) {
    return NarrativeVisibilityTier.PARTY;
  }
  return NarrativeVisibilityTier.PUBLIC;
}

export function fromRelationVisibility(
  visibility: string | null | undefined,
): NarrativeVisibilityTierValue {
  const normalized = String(visibility ?? 'GM_ONLY').trim().toUpperCase();
  if (normalized === 'SECRET') return NarrativeVisibilityTier.SECRET;
  if (normalized === 'GM_ONLY') return NarrativeVisibilityTier.ELEVATED_ONLY;
  if (normalized === 'PARTY') return NarrativeVisibilityTier.PARTY;
  return NarrativeVisibilityTier.PUBLIC;
}

export function projectRoleVisibility(
  tier: NarrativeVisibilityTierValue,
  ctx: NarrativeViewerContext,
): RoleVisibilityProjection {
  if (ctx.perspective === 'elevated') {
    return { visible: true, tier, denyReason: 'visible' };
  }
  if (
    tier === NarrativeVisibilityTier.ELEVATED_ONLY ||
    tier === NarrativeVisibilityTier.SECRET
  ) {
    return {
      visible: false,
      tier,
      denyReason:
        tier === NarrativeVisibilityTier.SECRET
          ? 'role_secret'
          : 'role_elevated_only',
    };
  }
  return { visible: true, tier, denyReason: 'visible' };
}

export function projectRevelation(
  presenceState: ContentRevelationState,
  ctx: NarrativeViewerContext,
  revelation?: RevelationProvenance,
): RevelationProjection {
  const manager = isManagerView(ctx);
  const visible = isEntityDiscovered(presenceState, manager);
  let denyReason: RevelationDenyReason | undefined;
  if (!visible) {
    denyReason =
      presenceState === ContentRevelationStates.DRAFT ? 'draft' : 'unrevealed';
  }
  return {
    visible,
    presenceState,
    denyReason: visible ? 'visible' : denyReason,
    revelation,
  };
}

export function projectRevelationFromMap(
  presenceState: ContentRevelationState,
  ctx: NarrativeViewerContext,
): RevelationProjection {
  return projectRevelation(presenceState, ctx);
}

/**
 * Merge order: ContentPresenceState override → keyframe revelation → column revelation.
 */
export function resolveMapObjectRevelationState(input: {
  columnRevelation?: string | null;
  keyframeRevelation?: string | null;
  presenceOverride?: ContentRevelationState | null;
}): ContentRevelationState {
  if (input.presenceOverride) return input.presenceOverride;
  const keyframe = input.keyframeRevelation;
  if (
    keyframe === MapRevelationStates.REVEALED ||
    keyframe === MapRevelationStates.HIDDEN ||
    keyframe === MapRevelationStates.DRAFT
  ) {
    return keyframe;
  }
  const column = input.columnRevelation;
  if (
    column === MapRevelationStates.REVEALED ||
    column === MapRevelationStates.HIDDEN ||
    column === MapRevelationStates.DRAFT
  ) {
    return column;
  }
  return ContentRevelationStates.REVEALED;
}

export function normalizeChronologyDateInput(
  raw: unknown,
): ChronologyDateParts | null {
  return normalizeChronologyDateParts(raw);
}

function epochMinutesEqual(a: bigint, b: bigint): boolean {
  return a === b;
}

export function resolveTemporalView(input: {
  surface: TemporalProjectionSurfaceValue;
  ctx: NarrativeViewerContext;
  requestedEpochMinute?: bigint | string | null;
  requestedDateParts?: ChronologyDateParts | null;
}): TemporalViewResolution {
  const policy = TEMPORAL_PROJECTION_POLICIES[input.surface];
  const campaignEpoch = input.ctx.campaignNow.epochMinute;
  const campaignDate = input.ctx.campaignNow.dateParts;
  const elevated = input.ctx.perspective === 'elevated';

  let effectiveEpoch = campaignEpoch;
  let requestedEpochIgnored = true;
  let requestedDateIgnored = true;

  if (policy.historicalMode === TemporalHistoricalMode.EPOCH_VIEW) {
    const requested = toBigIntSafe(input.requestedEpochMinute);
    effectiveEpoch = clampViewEpochMinuteForParty(
      input.requestedEpochMinute ?? null,
      campaignEpoch,
      elevated,
    );
    requestedEpochIgnored =
      requested !== null && requested !== effectiveEpoch;
  }

  let effectiveDate = campaignDate;
  if (policy.historicalMode === TemporalHistoricalMode.DATE_PARTS_VIEW) {
    if (input.requestedDateParts) {
      effectiveDate = input.requestedDateParts;
      requestedDateIgnored = false;
    }
  }

  const isCampaignPresent =
    policy.historicalMode === TemporalHistoricalMode.EPOCH_VIEW
      ? epochMinutesEqual(effectiveEpoch, campaignEpoch)
      : datesEqual(effectiveDate, campaignDate);

  return {
    policy,
    effectiveEpochMinute: effectiveEpoch,
    effectiveDateParts: effectiveDate,
    isCampaignPresent,
    requestedEpochIgnored,
    requestedDateIgnored,
  };
}

function toBigIntSafe(value: bigint | string | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function datesEqual(a: ChronologyDateParts, b: ChronologyDateParts): boolean {
  return (
    (a.year ?? null) === (b.year ?? null) &&
    (a.month ?? null) === (b.month ?? null) &&
    (a.day ?? null) === (b.day ?? null)
  );
}

export function projectWikiPageVisibility(
  pageId: string,
  presenceMap: Map<string, ContentRevelationState>,
  ctx: NarrativeViewerContext,
  revelation?: RevelationProvenance,
): WikiPageVisibilityProjection {
  const presenceState = resolvePresenceState(presenceMap, pageId);
  const revelationProjection = projectRevelation(
    presenceState,
    ctx,
    revelation,
  );
  const discovery = projectPageDiscovery(
    pageId,
    presenceMap,
    isManagerView(ctx),
    revelation,
  );
  return {
    visible: revelationProjection.visible,
    revelation: revelationProjection,
    discovery,
  };
}

export function projectTimelineEventVisibility(
  eventId: string,
  eventVisibility: string | null | undefined,
  presenceMap: Map<string, ContentRevelationState>,
  ctx: NarrativeViewerContext,
  revelation?: RevelationProvenance,
): TimelineEventVisibilityProjection {
  const presenceState = resolvePresenceState(presenceMap, eventId);
  const revelationProjection = projectRevelation(
    presenceState,
    ctx,
    revelation,
  );
  const role = projectRoleVisibility(
    fromChronologyVisibility(eventVisibility),
    ctx,
  );
  return {
    visible: revelationProjection.visible && role.visible,
    revelation: revelationProjection,
    role,
  };
}

export function isTimelineEventVisible(
  projection: TimelineEventVisibilityProjection,
): boolean {
  return projection.visible;
}

export function projectLoreAtDate(
  ctx: NarrativeViewerContext,
  requestedViewDate?: ChronologyDateParts | null,
): TemporalViewResolution {
  return resolveTemporalView({
    surface: TemporalProjectionSurface.LORE_SUMMARY,
    ctx,
    requestedDateParts: requestedViewDate ?? null,
  });
}

export function projectEntityRelation(
  visibility: string | null | undefined,
  ctx: NarrativeViewerContext,
): EntityRelationVisibilityProjection {
  const role = projectRoleVisibility(fromRelationVisibility(visibility), ctx);
  const temporal = resolveTemporalView({
    surface: TemporalProjectionSurface.ENTITY_GRAPH,
    ctx,
  });
  return {
    visible: role.visible,
    role,
    temporal,
  };
}

export function isEntityRelationVisible(
  projection: EntityRelationVisibilityProjection,
): boolean {
  return projection.visible;
}

export function projectMapSceneContext(
  ctx: NarrativeViewerContext,
  options: {
    requestedViewEpochMinute?: string | null;
    enabledLayerIds: Set<string>;
    editorGhostMode?: boolean;
    debugPresence?: boolean;
    canViewWiki: (visibility: string) => boolean;
  },
): MapSceneProjectionContext {
  const temporal = resolveTemporalView({
    surface: TemporalProjectionSurface.MAP_SCENE,
    ctx,
    requestedEpochMinute: options.requestedViewEpochMinute ?? null,
  });
  const isElevated = ctx.perspective === 'elevated';
  const presenceContext: PresenceContext = {
    isElevated,
    enabledLayerIds: options.enabledLayerIds,
    viewEpochMinute: temporal.effectiveEpochMinute,
    editorGhostMode: Boolean(
      options.editorGhostMode && ctx.capabilities.canUseGhostMode,
    ),
    debugPresence: Boolean(
      options.debugPresence && ctx.capabilities.canUseGhostMode,
    ),
    canViewWiki: options.canViewWiki,
  };
  return { presenceContext, temporal };
}

export function isPresenceVisibleToContext(
  presenceState: ContentRevelationState,
  ctx: NarrativeViewerContext,
): boolean {
  return projectRevelation(presenceState, ctx).visible;
}

export function buildRevelationViewerContext(input: {
  role: string | null;
  isManagerView?: boolean;
  canManage?: boolean;
  campaignNow?: CampaignChronologyNow;
}): NarrativeViewerContext {
  const ctx = buildNarrativeViewerContext({
    role: input.role,
    campaignNow: input.campaignNow ?? {
      epochMinute: 0n,
      dateParts: { year: 1, month: 0, day: 1 },
    },
  });
  const elevated =
    input.isManagerView === true ||
    input.canManage === true ||
    ctx.perspective === 'elevated';
  if (elevated && ctx.perspective === 'party') {
    return { ...ctx, perspective: 'elevated' };
  }
  return ctx;
}

export type PublishedNarrativeSubjectKind =
  | 'quest'
  | 'open_thread'
  | 'orchestration_page';

export type PublishedNarrativeArtifact = {
  included: boolean;
  blocks: unknown[];
  metadata: Record<string, unknown> | null;
  lifecycleState: NarrativeLifecycleState | null;
  denyReason?: 'locked' | 'orchestration_only' | 'role_hidden';
};

const DM_ONLY_BLOCK_TYPES = new Set(['dmSecret', 'dmOnly', 'dm_note']);

function stripDmOnlyBlocks(blocks: unknown): unknown[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((block) => {
    if (!block || typeof block !== 'object') return false;
    const type = (block as { type?: unknown }).type;
    return typeof type !== 'string' || !DM_ONLY_BLOCK_TYPES.has(type);
  });
}

/**
 * Layer 2 — controlled export from orchestration data to player-visible surfaces.
 */
export function projectPublishedNarrative(input: {
  subjectKind: PublishedNarrativeSubjectKind;
  blocks: unknown;
  metadata: unknown;
  visibility?: string;
  viewerContext: NarrativeViewerContext;
  lifecycleState: NarrativeLifecycleState;
}): PublishedNarrativeArtifact {
  const meta =
    input.metadata && typeof input.metadata === 'object'
      ? { ...(input.metadata as Record<string, unknown>) }
      : null;

  if (meta?.orchestrationOnly === true) {
    return {
      included: false,
      blocks: [],
      metadata: meta,
      lifecycleState: input.lifecycleState,
      denyReason: 'orchestration_only',
    };
  }

  const lifecycleProjection = projectNarrativeLifecycle(
    input.lifecycleState,
    input.viewerContext,
  );

  if (!lifecycleProjection.partyVisible) {
    return {
      included: false,
      blocks: [],
      metadata: meta,
      lifecycleState: input.lifecycleState,
      denyReason: 'locked',
    };
  }

  if (
    input.viewerContext.perspective === 'party' &&
    !isLifecyclePartyVisible(input.lifecycleState)
  ) {
    return {
      included: false,
      blocks: [],
      metadata: meta,
      lifecycleState: input.lifecycleState,
      denyReason: 'locked',
    };
  }

  const roleProjection = projectRoleVisibility(
    fromWikiMapVisibility(input.visibility),
    input.viewerContext,
  );

  if (!roleProjection.visible) {
    return {
      included: false,
      blocks: [],
      metadata: meta,
      lifecycleState: lifecycleProjection.visible,
      denyReason: 'role_hidden',
    };
  }

  return {
    included: true,
    blocks: stripDmOnlyBlocks(input.blocks),
    metadata: meta,
    lifecycleState: lifecycleProjection.visible,
  };
}

export {
  isEntityDiscovered,
  projectPageDiscovery,
  resolvePresenceState,
};
