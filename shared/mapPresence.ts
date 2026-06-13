/**
 * Map presence resolver — shared between backend and frontend.
 * Single pipeline for layers, revelation, temporal windows, and wiki inheritance.
 *
 * PRESENCE INPUTS: layerId, visibility, revelation, temporal bounds, wiki inheritance only.
 * groupId and UI filters must NEVER be read here — see docs/plans/map-presence-visibility.md.
 */

export const MapRevelationStates = {
  REVEALED: 'REVEALED',
  HIDDEN: 'HIDDEN',
  DRAFT: 'DRAFT',
} as const;

export type MapRevelationState =
  (typeof MapRevelationStates)[keyof typeof MapRevelationStates];

export const WikiVisibilityTier = {
  PUBLIC: 'Public',
  PARTY: 'Party',
  DM_ONLY: 'DM_Only',
} as const;

export type PresenceDenyReason =
  | 'visible'
  | 'layer_disabled'
  | 'role_dm_only'
  | 'unrevealed'
  | 'draft'
  | 'before_visible_from'
  | 'after_visible_until'
  | 'inherited_wiki_hidden'
  | 'inherited_map_hidden'
  | 'missing_target';

export type PresenceResolution = {
  visible: boolean;
  reason: PresenceDenyReason;
  temporal?: {
    viewEpochMinute: string;
    visibleFromEpochMinute?: string | null;
    visibleUntilEpochMinute?: string | null;
    activeKeyframeId?: string | null;
  };
};

export type MapSceneObjectPresenceInput = {
  id: string;
  layerId?: string | null;
  visibility?: string | null;
  revelation?: string | null;
  visibleFromEpochMinute?: bigint | string | null;
  visibleUntilEpochMinute?: bigint | string | null;
  targetPageId?: string | null;
  targetAssetId?: string | null;
  targetPageVisibility?: string | null;
  targetAssetVisibility?: string | null;
  nestedMapHostVisibility?: string | null;
  /** Pin-like objects require a link target */
  requiresTarget?: boolean;
};

export type PresenceContext = {
  isElevated: boolean;
  enabledLayerIds: Set<string>;
  viewEpochMinute: bigint | null;
  editorGhostMode?: boolean;
  debugPresence?: boolean;
  canViewWiki: (visibility: string) => boolean;
};

function toBigInt(value: bigint | string | null | undefined): bigint | null {
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

function isDmOnlyVisibility(visibility: string | null | undefined): boolean {
  return visibility === WikiVisibilityTier.DM_ONLY;
}

function evaluateTemporal(
  object: MapSceneObjectPresenceInput,
  ctx: PresenceContext,
): PresenceResolution | null {
  const view = ctx.viewEpochMinute;
  if (view === null) return null;

  const from = toBigInt(object.visibleFromEpochMinute);
  const until = toBigInt(object.visibleUntilEpochMinute);

  const temporalMeta = {
    viewEpochMinute: view.toString(),
    visibleFromEpochMinute: from?.toString() ?? null,
    visibleUntilEpochMinute: until?.toString() ?? null,
  };

  if (from !== null && view < from) {
    return {
      visible: false,
      reason: 'before_visible_from',
      temporal: temporalMeta,
    };
  }
  if (until !== null && view > until) {
    return {
      visible: false,
      reason: 'after_visible_until',
      temporal: temporalMeta,
    };
  }
  return null;
}

/**
 * Full presence pipeline. When editorGhostMode is on (elevated only), temporal/revelation
 * do not deny visibility but reasons are still computed for badges.
 */
export function resolveMapObjectPresenceDetailed(
  object: MapSceneObjectPresenceInput,
  ctx: PresenceContext,
): PresenceResolution {
  const ghost = Boolean(ctx.editorGhostMode && ctx.isElevated);

  if (object.layerId && !ctx.enabledLayerIds.has(object.layerId)) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'layer_disabled',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  const objectVisibility = object.visibility ?? WikiVisibilityTier.PUBLIC;
  if (
    !ctx.isElevated &&
    isDmOnlyVisibility(objectVisibility) &&
    !ctx.canViewWiki(objectVisibility)
  ) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'role_dm_only',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  if (!ctx.isElevated) {
    const revelation = object.revelation ?? MapRevelationStates.REVEALED;
    if (revelation === MapRevelationStates.HIDDEN) {
      const resolution: PresenceResolution = {
        visible: false,
        reason: 'unrevealed',
      };
      if (ghost) return { ...resolution, visible: true };
      return resolution;
    }
    if (revelation === MapRevelationStates.DRAFT) {
      const resolution: PresenceResolution = {
        visible: false,
        reason: 'draft',
      };
      if (ghost) return { ...resolution, visible: true };
      return resolution;
    }
  }

  const temporal = evaluateTemporal(object, ctx);
  if (temporal) {
    if (ghost) return { ...temporal, visible: true };
    return temporal;
  }

  if (object.targetPageVisibility && !ctx.canViewWiki(object.targetPageVisibility)) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'inherited_wiki_hidden',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  if (
    object.targetAssetVisibility &&
    !ctx.canViewWiki(object.targetAssetVisibility)
  ) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'inherited_map_hidden',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  if (
    object.nestedMapHostVisibility &&
    !ctx.canViewWiki(object.nestedMapHostVisibility)
  ) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'inherited_map_hidden',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  if (
    object.requiresTarget &&
    !object.targetPageId &&
    !object.targetAssetId
  ) {
    const resolution: PresenceResolution = {
      visible: false,
      reason: 'missing_target',
    };
    if (ghost) return { ...resolution, visible: true };
    return resolution;
  }

  return { visible: true, reason: 'visible' };
}

export function resolveMapObjectPresence(
  object: MapSceneObjectPresenceInput,
  ctx: PresenceContext,
): 'visible' | 'hidden' | 'gm-only-hint' {
  const detailed = resolveMapObjectPresenceDetailed(object, ctx);
  if (detailed.visible) return 'visible';

  if (ctx.isElevated) {
    const partyCtx: PresenceContext = {
      ...ctx,
      isElevated: false,
      editorGhostMode: false,
    };
    const partyView = resolveMapObjectPresenceDetailed(object, partyCtx);
    if (!partyView.visible) return 'gm-only-hint';
  }

  return 'hidden';
}

/** Clamp party temporal queries to campaign now. */
export function clampViewEpochMinuteForParty(
  requested: bigint | string | null | undefined,
  campaignNow: bigint,
  isElevated: boolean,
): bigint {
  if (isElevated && requested !== null && requested !== undefined) {
    const parsed = toBigInt(requested);
    if (parsed !== null) return parsed;
  }
  return campaignNow;
}

/** Normalized [0,1] point to display pixel space. */
export function normalizedPointToDisplay(
  coordinates: [number, number],
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: coordinates[0] * width,
    y: coordinates[1] * height,
  };
}

/** Display pixel space to normalized [0,1]. */
export function displayToNormalizedPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  if (width <= 0 || height <= 0) return [0, 0];
  return [x / width, y / height];
}

export { parsePointGeometry, polygonGeometry, lineStringGeometry } from './mapGeometry';

export function pointGeometry(
  coordinates: [number, number],
): { type: 'Point'; coordinates: [number, number] } {
  return { type: 'Point', coordinates };
}
