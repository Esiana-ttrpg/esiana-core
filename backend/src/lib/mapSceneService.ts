import { prisma } from './prisma.js';
import { refreshClimateOverlaysForMap } from './mapOverlayProjectionService.js';
import { canViewWikiPage } from './wikiTree.js';
import {
  buildPageDiscoveryMap,
  projectPageRevelationFromMap,
} from './discoveryProjectionService.js';
import {
  CampaignMemberRoles,
  WikiVisibility,
  type CampaignMemberRole,
} from '../types/domain.js';
import { normalizeCampaignMemberRole } from './acl.js';
import {
  MapRevelationStates,
  displayToNormalizedPoint,
  normalizedPointToDisplay,
  parsePointGeometry,
  pointGeometry,
  resolveMapObjectPresence,
  resolveMapObjectPresenceDetailed,
  type MapSceneObjectPresenceInput,
  type PresenceContext,
  type PresenceDenyReason,
  type PresenceResolution,
} from '../../../shared/mapPresence.js';
import type { ContentRevelationState } from '../../../shared/contentPresence.js';
import {
  buildNarrativeViewerContext,
  projectMapSceneContext,
  resolveMapObjectRevelationState,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import {
  getContentPresenceStateMap,
  revealMapObjectsContentPresence,
} from './contentPresenceService.js';

const sceneObjectInclude = {
  layer: true,
  mapPin: {
    include: {
      targetPage: { select: { id: true, title: true, visibility: true } },
      targetAsset: {
        select: {
          id: true,
          displayName: true,
          visibility: true,
          interactiveMapPages: {
            select: { title: true, visibility: true },
            take: 1,
          },
        },
      },
    },
  },
  keyframes: { orderBy: { effectiveEpochMinute: 'asc' as const } },
} as const;

export type MapSceneQueryOptions = {
  role: CampaignMemberRole | null;
  campaignNow: bigint;
  viewEpochMinute?: string | null;
  enabledLayerIds?: string[] | null;
  editorGhostMode?: boolean;
  debugPresence?: boolean;
};

export function buildPresenceContext(
  options: MapSceneQueryOptions,
): PresenceContext {
  const viewerCtx = buildNarrativeViewerContext({
    role: options.role,
    campaignNow: {
      epochMinute: options.campaignNow,
      dateParts: { year: 1, month: 0, day: 1 },
    },
  });
  const { presenceContext } = projectMapSceneContext(viewerCtx, {
    requestedViewEpochMinute: options.viewEpochMinute ?? null,
    enabledLayerIds: new Set(options.enabledLayerIds ?? []),
    editorGhostMode: options.editorGhostMode,
    debugPresence: options.debugPresence,
    canViewWiki: (visibility: string) =>
      canViewWikiPage(visibility, options.role),
  });
  return presenceContext;
}

function nestedHostVisibility(
  targetAsset: {
    interactiveMapPages: { visibility: string }[];
  } | null,
): string | null {
  return targetAsset?.interactiveMapPages[0]?.visibility ?? null;
}

export type MapPresentationPresetDto = {
  id: string;
  label: string;
  anchorEpochMinute: string;
  enabledLayerIds: string[];
  sortOrder: number;
};

export type MapVisibilityZoneDto = {
  id: string;
  geometry: unknown;
  targetPageId: string;
  pageVisibility: string;
};

export function isVisibilityZoneStyle(style: unknown): boolean {
  if (!style || typeof style !== 'object') return false;
  return (style as Record<string, unknown>).isVisibilityZone === true;
}

export function pickActivePresetAnchor<
  T extends { anchorEpochMinute: bigint },
>(presets: T[], viewEpoch: bigint): bigint | null {
  let active: bigint | null = null;
  for (const preset of presets) {
    if (preset.anchorEpochMinute <= viewEpoch) {
      active = preset.anchorEpochMinute;
    } else {
      break;
    }
  }
  return active;
}

export function serializePresentationPreset(row: {
  id: string;
  label: string;
  anchorEpochMinute: bigint;
  enabledLayerIds: unknown;
  sortOrder: number;
}): MapPresentationPresetDto {
  const enabledLayerIds = Array.isArray(row.enabledLayerIds)
    ? row.enabledLayerIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    id: row.id,
    label: row.label,
    anchorEpochMinute: row.anchorEpochMinute.toString(),
    enabledLayerIds,
    sortOrder: row.sortOrder,
  };
}

type MergedVisibilityZone = {
  id: string;
  geometry: unknown;
  targetPageId: string;
  pageVisibility: string;
};

export function getHiddenZonesForViewer(
  zones: MergedVisibilityZone[],
  viewerCtx: NarrativeViewerContext,
  presenceByPageId: Map<string, import('../../../shared/contentPresence.js').ContentRevelationState>,
  pageVisibilityById: Map<string, string>,
  simulatePartyView = false,
): unknown[] {
  const isElevated = viewerCtx.capabilities.isElevatedMap;
  if (isElevated && !simulatePartyView) return [];

  return zones
    .filter((zone) => {
      const pageVisibility =
        pageVisibilityById.get(zone.targetPageId) ?? WikiVisibility.PUBLIC;
      const wikiVisible = canViewWikiPage(
        pageVisibility,
        normalizeCampaignMemberRole(viewerCtx.role),
      );
      const discovered = projectPageRevelationFromMap(
        zone.targetPageId,
        presenceByPageId,
        false,
        undefined,
        viewerCtx.role,
      ).visible;
      return !(wikiVisible && discovered);
    })
    .map((zone) => zone.geometry);
}

async function loadPresentationPresets(mapAssetId: string) {
  return prisma.mapPresentationPreset.findMany({
    where: { mapAssetId },
    orderBy: [{ sortOrder: 'asc' }, { anchorEpochMinute: 'asc' }],
  });
}

export async function listMapPresentationPresets(
  campaignId: string,
  mapAssetId: string,
): Promise<MapPresentationPresetDto[]> {
  const rows = await prisma.mapPresentationPreset.findMany({
    where: { campaignId, mapAssetId },
    orderBy: [{ sortOrder: 'asc' }, { anchorEpochMinute: 'asc' }],
  });
  return rows.map(serializePresentationPreset);
}

export function pickActiveKeyframe<
  T extends { id: string; effectiveEpochMinute: bigint; geometryOverride: unknown },
>(keyframes: T[], viewEpoch: bigint): T | null {
  let active: T | null = null;
  for (const frame of keyframes) {
    if (frame.effectiveEpochMinute <= viewEpoch) {
      active = frame;
    } else {
      break;
    }
  }
  return active;
}

export function mergeSceneGeometry(
  baseGeometry: unknown,
  keyframe: { geometryOverride: unknown } | null,
): unknown {
  if (keyframe?.geometryOverride) return keyframe.geometryOverride;
  return baseGeometry;
}

export function toPresenceInput(
  row: {
    id: string;
    layerId: string | null;
    visibility: string;
    revelation: string;
    visibleFromEpochMinute: bigint | null;
    visibleUntilEpochMinute: bigint | null;
    targetPageId: string | null;
    targetAssetId: string | null;
    kind: string;
    mapPin: {
      targetPage: { visibility: string } | null;
      targetAsset: {
        visibility: string;
        interactiveMapPages: { visibility: string }[];
      } | null;
    } | null;
  },
  overrides?: {
    visibility?: string;
    revelation?: string;
    visibleFromEpochMinute?: bigint | null;
    visibleUntilEpochMinute?: bigint | null;
  },
): MapSceneObjectPresenceInput {
  const pin = row.mapPin;
  return {
    id: row.id,
    layerId: row.layerId,
    visibility: overrides?.visibility ?? row.visibility,
    revelation: overrides?.revelation ?? row.revelation,
    visibleFromEpochMinute:
      overrides?.visibleFromEpochMinute ?? row.visibleFromEpochMinute,
    visibleUntilEpochMinute:
      overrides?.visibleUntilEpochMinute ?? row.visibleUntilEpochMinute,
    targetPageId: row.targetPageId,
    targetAssetId: row.targetAssetId,
    targetPageVisibility: pin?.targetPage?.visibility ?? null,
    targetAssetVisibility: pin?.targetAsset?.visibility ?? null,
    nestedMapHostVisibility: nestedHostVisibility(pin?.targetAsset ?? null),
    requiresTarget: row.kind === 'pin',
  };
}

export type SerializedSceneObject = {
  id: string;
  kind: string;
  layerId: string | null;
  groupId: string | null;
  label: string | null;
  pinType: string | null;
  visibility: string;
  revelation: string;
  geometry: unknown;
  style: unknown;
  sortOrder: number;
  mapPinId: string | null;
  x: number;
  y: number;
  targetPageId: string | null;
  targetAssetId: string | null;
  targetPageTitle: string | null;
  targetMapTitle: string | null;
  isSecret?: boolean;
  isGhostHidden?: boolean;
  presenceReason?: PresenceDenyReason;
  visibleFromEpochMinute: string | null;
  visibleUntilEpochMinute: string | null;
};

function stripLinkedTargetsForParty(
  serialized: SerializedSceneObject,
  ctx: PresenceContext,
  input: MapSceneObjectPresenceInput,
): void {
  if (ctx.isElevated) return;

  const pageHidden =
    input.targetPageVisibility &&
    !ctx.canViewWiki(input.targetPageVisibility);
  const assetHidden =
    input.targetAssetVisibility &&
    !ctx.canViewWiki(input.targetAssetVisibility);
  const nestedHidden =
    input.nestedMapHostVisibility &&
    !ctx.canViewWiki(input.nestedMapHostVisibility);

  if (pageHidden || assetHidden || nestedHidden) {
    serialized.targetPageId = null;
    serialized.targetAssetId = null;
    serialized.targetPageTitle = null;
    serialized.targetMapTitle = null;
  }
}

export function serializeSceneObject(
  row: Awaited<ReturnType<typeof loadRawSceneObjects>>[number],
  ctx: PresenceContext,
  displayWidth: number,
  displayHeight: number,
  revelationOverride?: string,
): SerializedSceneObject | null {
  const viewEpoch = ctx.viewEpochMinute ?? 0n;
  const activeKeyframe = pickActiveKeyframe(row.keyframes, viewEpoch);

  const mergedVisibility =
    activeKeyframe?.visibilityOverride ?? row.visibility;
  const presenceOverride =
    revelationOverride &&
    (revelationOverride === MapRevelationStates.REVEALED ||
      revelationOverride === MapRevelationStates.HIDDEN ||
      revelationOverride === MapRevelationStates.DRAFT)
      ? (revelationOverride as ContentRevelationState)
      : null;
  const mergedRevelation = resolveMapObjectRevelationState({
    columnRevelation: row.revelation,
    keyframeRevelation: activeKeyframe?.revelationOverride ?? null,
    presenceOverride,
  });
  const geometry = mergeSceneGeometry(row.geometry, activeKeyframe);
  const mergedStyle = activeKeyframe?.styleOverride ?? row.style;

  if (isVisibilityZoneStyle(mergedStyle) && !ctx.isElevated) {
    return null;
  }

  const presenceInput = toPresenceInput(row, {
    visibility: mergedVisibility,
    revelation: mergedRevelation,
  });

  const detailed = resolveMapObjectPresenceDetailed(presenceInput, ctx);
  const presence = resolveMapObjectPresence(presenceInput, ctx);

  if (presence === 'hidden') return null;

  const coords = parsePointGeometry(geometry);
  const display =
    coords !== null
      ? normalizedPointToDisplay(coords, displayWidth, displayHeight)
      : { x: 0, y: 0 };

  const pin = row.mapPin;
  const targetMapTitle =
    pin?.targetAsset?.displayName?.trim() ||
    pin?.targetAsset?.interactiveMapPages[0]?.title ||
    null;

  const serialized: SerializedSceneObject = {
    id: row.id,
    kind: row.kind,
    layerId: row.layerId,
    groupId: row.groupId,
    label: row.label,
    pinType: row.pinType,
    visibility: mergedVisibility,
    revelation: mergedRevelation,
    geometry,
    style: mergedStyle,
    sortOrder: row.sortOrder,
    mapPinId: row.mapPinId,
    x: display.x,
    y: display.y,
    targetPageId: row.targetPageId,
    targetAssetId: row.targetAssetId,
    targetPageTitle: pin?.targetPage?.title ?? null,
    targetMapTitle,
    visibleFromEpochMinute: row.visibleFromEpochMinute?.toString() ?? null,
    visibleUntilEpochMinute: row.visibleUntilEpochMinute?.toString() ?? null,
  };

  if (presence === 'gm-only-hint') {
    serialized.isSecret = true;
  }

  if (ctx.editorGhostMode && !detailed.visible) {
    serialized.isGhostHidden = true;
    if (ctx.debugPresence) {
      serialized.presenceReason = detailed.reason;
    }
  }

  stripLinkedTargetsForParty(serialized, ctx, presenceInput);

  return serialized;
}

async function loadRawSceneObjects(mapAssetId: string) {
  return prisma.mapSceneObject.findMany({
    where: { mapAssetId },
    include: sceneObjectInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Ensure every pin on a map has a linked scene object (lazy sync). */
export async function ensurePinSceneObjects(
  campaignId: string,
  mapAssetId: string,
  displayWidth: number,
  displayHeight: number,
): Promise<void> {
  const pins = await prisma.mapPin.findMany({
    where: { assetId: mapAssetId },
    include: { sceneObject: { select: { id: true } } },
  });

  for (const pin of pins) {
    if (pin.sceneObject) {
      await prisma.mapSceneObject.updateMany({
        where: { id: pin.sceneObject.id, mapPinId: null },
        data: {
          mapPinId: pin.id,
          targetPageId: pin.targetPageId,
          targetAssetId: pin.targetAssetId,
        },
      });
      continue;
    }
    const norm = displayToNormalizedPoint(
      pin.x_coordinate,
      pin.y_coordinate,
      displayWidth,
      displayHeight,
    );
    await prisma.mapSceneObject.create({
      data: {
        campaignId,
        mapAssetId,
        kind: 'pin',
        label: pin.label,
        pinType: pin.pinType,
        mapPinId: pin.id,
        targetPageId: pin.targetPageId,
        targetAssetId: pin.targetAssetId,
        geometry: pointGeometry(norm),
        visibility: WikiVisibility.PUBLIC,
        revelation: 'REVEALED',
      },
    });
  }
}

export async function syncSceneObjectFromPin(
  pinId: string,
  displayWidth: number,
  displayHeight: number,
): Promise<void> {
  const pin = await prisma.mapPin.findUnique({
    where: { id: pinId },
    include: { asset: { select: { campaignId: true, id: true } }, sceneObject: true },
  });
  if (!pin) return;

  const norm = displayToNormalizedPoint(
    pin.x_coordinate,
    pin.y_coordinate,
    displayWidth,
    displayHeight,
  );

  if (pin.sceneObject) {
    await prisma.mapSceneObject.update({
      where: { id: pin.sceneObject.id },
      data: {
        mapPinId: pin.id,
        label: pin.label,
        pinType: pin.pinType,
        targetPageId: pin.targetPageId,
        targetAssetId: pin.targetAssetId,
        geometry: pointGeometry(norm),
      },
    });
    return;
  }

  await prisma.mapSceneObject.create({
    data: {
      campaignId: pin.asset.campaignId,
      mapAssetId: pin.asset.id,
      kind: 'pin',
      label: pin.label,
      pinType: pin.pinType,
      mapPinId: pin.id,
      targetPageId: pin.targetPageId,
      targetAssetId: pin.targetAssetId,
      geometry: pointGeometry(norm),
      visibility: WikiVisibility.PUBLIC,
      revelation: 'REVEALED',
    },
  });
}

export async function getMapScenePayload(
  campaignId: string,
  mapAssetId: string,
  displayWidth: number,
  displayHeight: number,
  options: MapSceneQueryOptions,
) {
  await ensurePinSceneObjects(campaignId, mapAssetId, displayWidth, displayHeight);

  const ctx = buildPresenceContext(options);

  try {
    await refreshClimateOverlaysForMap(
      campaignId,
      mapAssetId,
      ctx.viewEpochMinute ?? options.campaignNow,
      options.campaignNow,
      prisma,
    );
  } catch {
    // Climate projection is best-effort on scene load.
  }

  const viewEpoch = ctx.viewEpochMinute ?? options.campaignNow;
  const viewerCtx = buildNarrativeViewerContext({
    role: options.role,
    campaignNow: {
      epochMinute: options.campaignNow,
      dateParts: { year: 1, month: 0, day: 1 },
    },
  });

  const [layers, groups, rawObjects, presetRows] = await Promise.all([
    prisma.mapLayer.findMany({
      where: { mapAssetId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.mapObjectGroup.findMany({
      where: { mapAssetId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    loadRawSceneObjects(mapAssetId),
    loadPresentationPresets(mapAssetId),
  ]);

  const presentationPresets = presetRows.map(serializePresentationPreset);
  const activeAnchor = pickActivePresetAnchor(presetRows, viewEpoch);

  const mergedVisibilityZones: MergedVisibilityZone[] = [];
  const zoneTargetPageIds = new Set<string>();

  for (const row of rawObjects) {
    const activeKeyframe = pickActiveKeyframe(row.keyframes, viewEpoch);
    const mergedStyle = activeKeyframe?.styleOverride ?? row.style;
    if (!isVisibilityZoneStyle(mergedStyle)) continue;
    const targetPageId = row.targetPageId?.trim();
    if (!targetPageId) continue;
    mergedVisibilityZones.push({
      id: row.id,
      geometry: mergeSceneGeometry(row.geometry, activeKeyframe),
      targetPageId,
      pageVisibility: WikiVisibility.PUBLIC,
    });
    zoneTargetPageIds.add(targetPageId);
  }

  let pageVisibilityById = new Map<string, string>();
  if (zoneTargetPageIds.size > 0) {
    const pages = await prisma.wikiPage.findMany({
      where: { id: { in: [...zoneTargetPageIds] }, campaignId },
      select: { id: true, visibility: true },
    });
    pageVisibilityById = new Map(pages.map((page) => [page.id, page.visibility]));
    for (const zone of mergedVisibilityZones) {
      zone.pageVisibility =
        pageVisibilityById.get(zone.targetPageId) ?? WikiVisibility.PUBLIC;
    }
  }

  const pagePresenceMap =
    zoneTargetPageIds.size > 0
      ? await buildPageDiscoveryMap(campaignId, [...zoneTargetPageIds])
      : new Map<string, import('../../../shared/contentPresence.js').ContentRevelationState>();

  const hiddenZoneGeometries = getHiddenZonesForViewer(
    mergedVisibilityZones,
    viewerCtx,
    pagePresenceMap,
    pageVisibilityById,
    !viewerCtx.capabilities.isElevatedMap || Boolean(options.debugPresence),
  );

  const visibilityZones: MapVisibilityZoneDto[] = mergedVisibilityZones.map((zone) => ({
    id: zone.id,
    geometry: zone.geometry,
    targetPageId: zone.targetPageId,
    pageVisibility: zone.pageVisibility,
  }));

  const presenceStateByObjectId = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.MAP_OBJECT,
    rawObjects.map((row) => row.id),
  );

  if (ctx.enabledLayerIds.size === 0) {
    for (const layer of layers) {
      if (layer.defaultEnabled) ctx.enabledLayerIds.add(layer.id);
    }
  }

  const objects: SerializedSceneObject[] = [];
  for (const row of rawObjects) {
    const serialized = serializeSceneObject(
      row,
      ctx,
      displayWidth,
      displayHeight,
      presenceStateByObjectId.get(row.id),
    );
    if (serialized) objects.push(serialized);
  }

  return {
    viewEpochMinute: viewEpoch.toString(),
    editorGhostMode: Boolean(ctx.editorGhostMode),
    presentationPresets,
    activePresentationPresetAnchorEpoch: activeAnchor?.toString() ?? null,
    visibilityZones,
    hiddenZoneGeometries:
      viewerCtx.capabilities.isElevatedMap && !options.debugPresence
        ? undefined
        : hiddenZoneGeometries,
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      sortOrder: layer.sortOrder,
      defaultEnabled: layer.defaultEnabled,
      color: layer.color,
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      color: group.color,
    })),
    objects,
  };
}

export async function countMapObjectsLinkedToWikiPage(
  campaignId: string,
  pageId: string,
): Promise<number> {
  return prisma.mapSceneObject.count({
    where: {
      campaignId,
      targetPageId: pageId,
    },
  });
}

export async function batchRevealSceneObjects(
  campaignId: string,
  mapAssetId: string,
  sceneObjectIds: string[],
): Promise<number> {
  const uniqueIds = [...new Set(sceneObjectIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  const objects = await prisma.mapSceneObject.findMany({
    where: {
      id: { in: uniqueIds },
      campaignId,
      mapAssetId,
    },
    select: { id: true },
  });

  if (objects.length !== uniqueIds.length) {
    throw new Error('One or more scene objects are invalid for this map');
  }

  const result = await prisma.mapSceneObject.updateMany({
    where: { id: { in: uniqueIds } },
    data: { revelation: MapRevelationStates.REVEALED },
  });

  await revealMapObjectsContentPresence(campaignId, uniqueIds);

  return result.count;
}

export function evaluatePresenceForObject(
  input: MapSceneObjectPresenceInput,
  ctx: PresenceContext,
): PresenceResolution {
  return resolveMapObjectPresenceDetailed(input, ctx);
}
