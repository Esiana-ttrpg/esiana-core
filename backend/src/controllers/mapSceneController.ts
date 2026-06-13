import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { canViewMapAsset } from '../lib/mapAssetVisibility.js';
import {
  batchRevealSceneObjects,
  countMapObjectsLinkedToWikiPage,
  getMapScenePayload,
  listMapPresentationPresets,
  serializePresentationPreset,
} from '../lib/mapSceneService.js';
import {
  confirmFlowOverlay,
  markOverlayRecomputeRequired,
  recomputeFlowOverlayIfNeeded,
} from '../lib/mapOverlayProjectionService.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { toNullableInputJsonValue } from '../lib/inputJsonValue.js';
import { AssetTypes, WikiVisibility } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  displayToNormalizedPoint,
  pointGeometry,
} from '../../../shared/mapPresence.js';

async function loadMapContext(req: CampaignScopedRequest, assetId: string) {
  const campaignId = req.campaign!.campaignId;
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, campaignId, type: AssetTypes.MAP },
    select: {
      id: true,
      visibility: true,
      width: true,
      height: true,
      campaign: { select: { currentEpochMinute: true } },
    },
  });
  if (!asset?.width || !asset.height) return null;

  const role = req.campaign!.role as CampaignMemberRole | null;
  if (!canViewMapAsset(asset.visibility, role)) return null;

  return { campaignId, asset, role };
}

function parseSceneQuery(req: CampaignScopedRequest) {
  const q = req.query as Record<string, string | undefined>;
  // Do not add groupIds — groups are editor-only and must not affect presence.
  const layerIds =
    typeof q.layerIds === 'string' && q.layerIds.trim()
      ? q.layerIds.split(',').map((id) => id.trim()).filter(Boolean)
      : null;

  return {
    viewEpochMinute: q.viewEpochMinute ?? null,
    layerIds,
    editorGhostMode: q.editorGhostMode === '1' || q.editorGhostMode === 'true',
    debugPresence: q.debugPresence === '1' || q.debugPresence === 'true',
  };
}

export async function getMapScene(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const query = parseSceneQuery(req);
  const scene = await getMapScenePayload(
    ctx.campaignId,
    assetId,
    ctx.asset.width!,
    ctx.asset.height!,
    {
      role: ctx.role,
      campaignNow: ctx.asset.campaign.currentEpochMinute,
      viewEpochMinute: query.viewEpochMinute,
      enabledLayerIds: query.layerIds,
      editorGhostMode: query.editorGhostMode,
      debugPresence: query.debugPresence,
    },
  );

  res.json({ scene });
}

export async function listMapLayers(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const layers = await prisma.mapLayer.findMany({
    where: { mapAssetId: assetId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  res.json({
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      sortOrder: layer.sortOrder,
      defaultEnabled: layer.defaultEnabled,
      color: layer.color,
    })),
  });
}

export async function createMapLayer(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const layer = await prisma.mapLayer.create({
    data: {
      campaignId: ctx.campaignId,
      mapAssetId: assetId,
      name,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      defaultEnabled: body.defaultEnabled !== false,
      color: typeof body.color === 'string' ? body.color.trim() || null : null,
    },
  });

  res.status(201).json({
    layer: {
      id: layer.id,
      name: layer.name,
      sortOrder: layer.sortOrder,
      defaultEnabled: layer.defaultEnabled,
      color: layer.color,
    },
  });
}

export async function updateMapLayer(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const layerId = String(req.params.layerId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  if (body.defaultEnabled !== undefined) data.defaultEnabled = Boolean(body.defaultEnabled);
  if (body.color !== undefined) {
    data.color =
      typeof body.color === 'string' ? body.color.trim() || null : null;
  }

  const result = await prisma.mapLayer.updateMany({
    where: { id: layerId, mapAssetId: assetId, campaignId: ctx.campaignId },
    data,
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Layer not found' });
    return;
  }

  const layer = await prisma.mapLayer.findUnique({ where: { id: layerId } });
  res.json({
    layer: layer
      ? {
          id: layer.id,
          name: layer.name,
          sortOrder: layer.sortOrder,
          defaultEnabled: layer.defaultEnabled,
          color: layer.color,
        }
      : null,
  });
}

export async function deleteMapLayer(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const layerId = String(req.params.layerId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  await prisma.mapSceneObject.updateMany({
    where: { layerId, mapAssetId: assetId },
    data: { layerId: null },
  });

  const result = await prisma.mapLayer.deleteMany({
    where: { id: layerId, mapAssetId: assetId, campaignId: ctx.campaignId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Layer not found' });
    return;
  }
  res.status(204).send();
}

export async function createMapSceneObject(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const kind = typeof body.kind === 'string' ? body.kind.trim() : 'region';
  if (!['region', 'label', 'path'].includes(kind)) {
    res.status(400).json({ error: 'kind must be region, label, or path' });
    return;
  }

  let geometry = body.geometry;
  if (
    typeof body.x === 'number' &&
    typeof body.y === 'number' &&
    Number.isFinite(body.x) &&
    Number.isFinite(body.y)
  ) {
    const norm = displayToNormalizedPoint(
      body.x,
      body.y,
      ctx.asset.width!,
      ctx.asset.height!,
    );
    geometry = pointGeometry(norm);
  }

  if (!geometry || typeof geometry !== 'object') {
    res.status(400).json({ error: 'geometry is required' });
    return;
  }

  const object = await prisma.mapSceneObject.create({
    data: {
      campaignId: ctx.campaignId,
      mapAssetId: assetId,
      kind,
      label: typeof body.label === 'string' ? body.label.trim() || null : null,
      layerId: typeof body.layerId === 'string' ? body.layerId.trim() || null : null,
      groupId: typeof body.groupId === 'string' ? body.groupId.trim() || null : null,
      visibility:
        typeof body.visibility === 'string'
          ? body.visibility
          : WikiVisibility.PUBLIC,
      revelation:
        typeof body.revelation === 'string' ? body.revelation : 'REVEALED',
      geometry,
      style: toNullableInputJsonValue(body.style ?? null),
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      targetPageId:
        typeof body.targetPageId === 'string' ? body.targetPageId.trim() || null : null,
      visibleFromEpochMinute:
        body.visibleFromEpochMinute !== undefined &&
        body.visibleFromEpochMinute !== null
          ? BigInt(String(body.visibleFromEpochMinute))
          : null,
      visibleUntilEpochMinute:
        body.visibleUntilEpochMinute !== undefined &&
        body.visibleUntilEpochMinute !== null
          ? BigInt(String(body.visibleUntilEpochMinute))
          : null,
    },
  });

  res.status(201).json({ object: { id: object.id } });
}

export async function updateMapSceneObject(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const objectId = String(req.params.objectId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const existing = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, mapAssetId: assetId, campaignId: ctx.campaignId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.label === 'string') data.label = body.label.trim() || null;
  if (body.layerId !== undefined) {
    data.layerId =
      typeof body.layerId === 'string' ? body.layerId.trim() || null : null;
  }
  if (body.groupId !== undefined) {
    data.groupId =
      typeof body.groupId === 'string' ? body.groupId.trim() || null : null;
  }
  if (typeof body.visibility === 'string') data.visibility = body.visibility;
  if (typeof body.revelation === 'string') data.revelation = body.revelation;
  if (body.targetPageId !== undefined) {
    data.targetPageId =
      typeof body.targetPageId === 'string' ? body.targetPageId.trim() || null : null;
  }
  if (body.style !== undefined) data.style = body.style;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;

  if (
    typeof body.x === 'number' &&
    typeof body.y === 'number' &&
    Number.isFinite(body.x) &&
    Number.isFinite(body.y)
  ) {
    const norm = displayToNormalizedPoint(
      body.x,
      body.y,
      ctx.asset.width!,
      ctx.asset.height!,
    );
    data.geometry = pointGeometry(norm);
  } else if (body.geometry !== undefined) {
    data.geometry = body.geometry;
  }

  if (body.visibleFromEpochMinute !== undefined) {
    data.visibleFromEpochMinute =
      body.visibleFromEpochMinute === null
        ? null
        : BigInt(String(body.visibleFromEpochMinute));
  }
  if (body.visibleUntilEpochMinute !== undefined) {
    data.visibleUntilEpochMinute =
      body.visibleUntilEpochMinute === null
        ? null
        : BigInt(String(body.visibleUntilEpochMinute));
  }

  if (body.regenerateFlowOverlay === true) {
    await markOverlayRecomputeRequired(ctx.campaignId, objectId, prisma);
    await recomputeFlowOverlayIfNeeded(
      ctx.campaignId,
      objectId,
      ctx.asset.campaign.currentEpochMinute.toString(),
      prisma,
    );
    res.json({ ok: true, regenerated: true });
    return;
  }

  await prisma.mapSceneObject.update({
    where: { id: objectId },
    data,
  });

  res.json({ ok: true });
}

export async function confirmMapFlowOverlay(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const objectId = String(req.params.objectId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const existing = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, mapAssetId: assetId, campaignId: ctx.campaignId },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }

  const ok = await confirmFlowOverlay(ctx.campaignId, objectId, prisma);
  if (!ok) {
    res.status(400).json({ error: 'Unable to confirm overlay' });
    return;
  }

  res.json({ ok: true, revelation: 'REVEALED' });
}

export async function deleteMapSceneObject(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const objectId = String(req.params.objectId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const existing = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, mapAssetId: assetId, campaignId: ctx.campaignId },
    select: { id: true, mapPinId: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }
  if (existing.mapPinId) {
    res.status(400).json({ error: 'Cannot delete pin-backed objects; delete the pin' });
    return;
  }

  await prisma.mapSceneObject.delete({ where: { id: objectId } });
  res.status(204).send();
}

export async function batchRevealMapObjects(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as { sceneObjectIds?: unknown };
  const ids = Array.isArray(body.sceneObjectIds)
    ? body.sceneObjectIds.filter((id): id is string => typeof id === 'string')
    : [];

  try {
    const count = await batchRevealSceneObjects(ctx.campaignId, assetId, ids);
    res.json({ revealed: count });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Reveal failed',
    });
  }
}

export async function listMapObjectKeyframes(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const objectId = String(req.params.objectId ?? '').trim();
  const campaignId = req.campaign!.campaignId;

  const object = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
    select: { id: true },
  });
  if (!object) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }

  const keyframes = await prisma.mapObjectKeyframe.findMany({
    where: { sceneObjectId: objectId },
    orderBy: { effectiveEpochMinute: 'asc' },
  });

  res.json({
    keyframes: keyframes.map((kf) => ({
      id: kf.id,
      effectiveEpochMinute: kf.effectiveEpochMinute.toString(),
      hasGeometryOverride: kf.geometryOverride != null,
      hasStyleOverride: kf.styleOverride != null,
      hasVisibilityOverride: Boolean(kf.visibilityOverride),
      hasRevelationOverride: Boolean(kf.revelationOverride),
    })),
  });
}

export async function createMapObjectKeyframe(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const objectId = String(req.params.objectId ?? '').trim();
  const campaignId = req.campaign!.campaignId;

  const object = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
  });
  if (!object) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.effectiveEpochMinute === undefined || body.effectiveEpochMinute === null) {
    res.status(400).json({ error: 'effectiveEpochMinute is required' });
    return;
  }

  const keyframe = await prisma.mapObjectKeyframe.create({
    data: {
      sceneObjectId: objectId,
      effectiveEpochMinute: BigInt(String(body.effectiveEpochMinute)),
      geometryOverride: toNullableInputJsonValue(body.geometryOverride ?? null),
      styleOverride: toNullableInputJsonValue(body.styleOverride ?? null),
      visibilityOverride:
        typeof body.visibilityOverride === 'string'
          ? body.visibilityOverride
          : null,
      revelationOverride:
        typeof body.revelationOverride === 'string'
          ? body.revelationOverride
          : null,
    },
  });

  res.status(201).json({
    keyframe: {
      id: keyframe.id,
      effectiveEpochMinute: keyframe.effectiveEpochMinute.toString(),
    },
  });
}

export async function deleteMapObjectKeyframe(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const objectId = String(req.params.objectId ?? '').trim();
  const keyframeId = String(req.params.keyframeId ?? '').trim();
  const campaignId = req.campaign!.campaignId;

  const object = await prisma.mapSceneObject.findFirst({
    where: { id: objectId, campaignId },
    select: { id: true },
  });
  if (!object) {
    res.status(404).json({ error: 'Object not found' });
    return;
  }

  const result = await prisma.mapObjectKeyframe.deleteMany({
    where: { id: keyframeId, sceneObjectId: objectId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Keyframe not found' });
    return;
  }
  res.status(204).send();
}

export async function listMapObjectGroups(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const groups = await prisma.mapObjectGroup.findMany({
    where: { mapAssetId: assetId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  res.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      color: group.color,
    })),
  });
}

export async function createMapObjectGroup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const group = await prisma.mapObjectGroup.create({
    data: {
      campaignId: ctx.campaignId,
      mapAssetId: assetId,
      name,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      color: typeof body.color === 'string' ? body.color.trim() || null : null,
    },
  });

  res.status(201).json({
    group: {
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      color: group.color,
    },
  });
}

export async function updateMapObjectGroup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const groupId = String(req.params.groupId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  if (body.color !== undefined) {
    data.color =
      typeof body.color === 'string' ? body.color.trim() || null : null;
  }

  const result = await prisma.mapObjectGroup.updateMany({
    where: { id: groupId, mapAssetId: assetId, campaignId: ctx.campaignId },
    data,
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const group = await prisma.mapObjectGroup.findUnique({ where: { id: groupId } });
  res.json({
    group: group
      ? {
          id: group.id,
          name: group.name,
          sortOrder: group.sortOrder,
          color: group.color,
        }
      : null,
  });
}

export async function deleteMapObjectGroup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const groupId = String(req.params.groupId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  await prisma.mapSceneObject.updateMany({
    where: { groupId, mapAssetId: assetId },
    data: { groupId: null },
  });

  const result = await prisma.mapObjectGroup.deleteMany({
    where: { id: groupId, mapAssetId: assetId, campaignId: ctx.campaignId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.status(204).send();
}

export async function getWikiPageMapObjectImpact(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const pageId = String(req.params.pageId ?? '').trim();
  const count = await countMapObjectsLinkedToWikiPage(
    req.campaign!.campaignId,
    pageId,
  );
  res.json({ linkedMapObjectCount: count });
}

function parseEnabledLayerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

export async function listMapPresentationPresetsHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const presets = await listMapPresentationPresets(ctx.campaignId, assetId);
  res.json({ presets });
}

export async function createMapPresentationPreset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const anchorRaw = body.anchorEpochMinute;
  const anchorEpochMinute =
    typeof anchorRaw === 'string' || typeof anchorRaw === 'number'
      ? BigInt(String(anchorRaw).trim())
      : null;

  if (!label || anchorEpochMinute === null) {
    res.status(400).json({ error: 'label and anchorEpochMinute are required' });
    return;
  }

  const enabledLayerIds = parseEnabledLayerIds(body.enabledLayerIds);
  const sortOrder =
    typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)
      ? Math.trunc(body.sortOrder)
      : 0;

  const row = await prisma.mapPresentationPreset.create({
    data: {
      campaignId: ctx.campaignId,
      mapAssetId: assetId,
      label,
      anchorEpochMinute,
      enabledLayerIds,
      sortOrder,
    },
  });

  res.status(201).json({ preset: serializePresentationPreset(row) });
}

export async function updateMapPresentationPreset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const presetId = String(req.params.presetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const existing = await prisma.mapPresentationPreset.findFirst({
    where: { id: presetId, mapAssetId: assetId, campaignId: ctx.campaignId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const data: {
    label?: string;
    anchorEpochMinute?: bigint;
    enabledLayerIds?: string[];
    sortOrder?: number;
  } = {};

  if (typeof body.label === 'string' && body.label.trim()) {
    data.label = body.label.trim();
  }
  if (body.anchorEpochMinute !== undefined) {
    data.anchorEpochMinute = BigInt(String(body.anchorEpochMinute).trim());
  }
  if (body.enabledLayerIds !== undefined) {
    data.enabledLayerIds = parseEnabledLayerIds(body.enabledLayerIds);
  }
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }

  const row = await prisma.mapPresentationPreset.update({
    where: { id: presetId },
    data,
  });

  res.json({ preset: serializePresentationPreset(row) });
}

export async function deleteMapPresentationPreset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const presetId = String(req.params.presetId ?? '').trim();
  const ctx = await loadMapContext(req, assetId);
  if (!ctx) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const result = await prisma.mapPresentationPreset.deleteMany({
    where: { id: presetId, mapAssetId: assetId, campaignId: ctx.campaignId },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }
  res.status(204).send();
}
