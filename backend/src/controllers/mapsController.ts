import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  AssetTypes,
  MAP_PIN_TYPE_VALUES,
  WikiVisibility,
  type MapPinType,
} from '../types/domain.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { serializeMapPinForRole } from '../lib/mapPinVisibility.js';
import { purgeInvalidMapPins } from '../lib/mapPinMaintenance.js';
import { syncSceneObjectFromPin } from '../lib/mapSceneService.js';
import {
  buildMapPinPreviewPayload,
  loadMapPinForPreview,
} from '../lib/mapPinPreview.js';
import { canViewMapAsset } from '../lib/mapAssetVisibility.js';
import { normalizeImageCredit } from '../../../shared/imageCredit.js';
import {
  CampaignMemberRoles,
  type CampaignMemberRole,
} from '../types/domain.js';
import {
  buildPageDiscoveryMap,
  isPageVisibleToParty,
} from '../lib/discoveryProjectionService.js';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';

const mapPinInclude = {
  targetPage: {
    select: { id: true, title: true, visibility: true, blocks: true },
  },
  targetAsset: {
    select: {
      id: true,
      type: true,
      displayName: true,
      visibility: true,
      interactiveMapPages: {
        select: { id: true, title: true, visibility: true },
        take: 1,
      },
    },
  },
} as const;

function formatMapAsset(asset: {
  id: string;
  url: string;
  displayUrl: string | null;
  thumbnailUrl: string | null;
  type: string;
  width: number | null;
  height: number | null;
  originalWidth: number | null;
  originalHeight: number | null;
  displayName: string | null;
  visibility: string;
  imageCredit?: unknown;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    url: asset.url,
    displayUrl: asset.displayUrl,
    thumbnailUrl: asset.thumbnailUrl,
    type: asset.type,
    width: asset.width,
    height: asset.height,
    originalWidth: asset.originalWidth,
    originalHeight: asset.originalHeight,
    displayName: asset.displayName,
    visibility: asset.visibility,
    imageCredit: normalizeImageCredit(asset.imageCredit),
    createdAt: asset.createdAt.toISOString(),
  };
}

async function resolveMapDisplayTitle(
  campaignId: string,
  assetId: string,
): Promise<string> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, campaignId },
    select: { displayName: true },
  });
  const customName = asset?.displayName?.trim();
  if (customName) return customName;

  const linked = await prisma.wikiPage.findFirst({
    where: { campaignId, mapAssetId: assetId },
    select: { title: true },
    orderBy: { title: 'asc' },
  });
  return linked?.title ?? 'Untitled map';
}

async function enrichMapAssetSummary(
  campaignId: string,
  asset: {
    id: string;
    url: string;
    displayUrl: string | null;
    thumbnailUrl: string | null;
    type: string;
    width: number | null;
    height: number | null;
    originalWidth: number | null;
    originalHeight: number | null;
    displayName: string | null;
    visibility: string;
    imageCredit?: unknown;
    createdAt: Date;
  },
) {
  const [linkedPage, pinCount, nestedPins, nestedChildPins] = await Promise.all([
    prisma.wikiPage.findFirst({
      where: { campaignId, mapAssetId: asset.id },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    prisma.mapPin.count({ where: { assetId: asset.id } }),
    prisma.mapPin.findMany({
      where: { targetAssetId: asset.id, asset: { campaignId } },
      select: { assetId: true },
      distinct: ['assetId'],
    }),
    prisma.mapPin.findMany({
      where: { assetId: asset.id, targetAssetId: { not: null } },
      select: { targetAssetId: true },
      distinct: ['targetAssetId'],
    }),
  ]);

  const nestedInMaps = await Promise.all(
    nestedPins.map(async (pin) => ({
      assetId: pin.assetId,
      title: await resolveMapDisplayTitle(campaignId, pin.assetId),
    })),
  );

  const nestedChildMaps = await Promise.all(
    nestedChildPins.map(async (pin) => ({
      assetId: pin.targetAssetId!,
      title: await resolveMapDisplayTitle(campaignId, pin.targetAssetId!),
    })),
  );

  return {
    ...formatMapAsset(asset),
    linkedPage,
    pinCount,
    nestedInMaps,
    nestedChildMaps,
  };
}

async function loadMapAsset(campaignId: string, assetId: string) {
  return prisma.asset.findFirst({
    where: { id: assetId, campaignId, type: AssetTypes.MAP },
    select: {
      id: true,
      url: true,
      displayUrl: true,
      thumbnailUrl: true,
      type: true,
      width: true,
      height: true,
      originalWidth: true,
      originalHeight: true,
      displayName: true,
      visibility: true,
      imageCredit: true,
      createdAt: true,
    },
  });
}

export async function listCampaignMaps(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { campaignId: req.campaign!.campaignId, type: AssetTypes.MAP },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      displayUrl: true,
      thumbnailUrl: true,
      type: true,
      width: true,
      height: true,
      originalWidth: true,
      originalHeight: true,
      displayName: true,
      visibility: true,
      imageCredit: true,
      createdAt: true,
    },
  });

  const campaignId = req.campaign!.campaignId;
  const role = req.campaign!.role as CampaignMemberRole | null;
  const canManage =
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;

  const enriched = await Promise.all(
    assets.map((asset) => enrichMapAssetSummary(campaignId, asset)),
  );

  const linkedPageIds = enriched
    .map((map) => map.linkedPage?.id)
    .filter((id): id is string => Boolean(id));
  const presenceMap = await buildPageDiscoveryMap(campaignId, linkedPageIds);

  function isMapDiscoveredForParty(map: (typeof enriched)[number]): boolean {
    if (!canViewMapAsset(map.visibility, role)) return false;
    if (map.linkedPage?.id) {
      return isPageVisibleToParty(presenceMap, map.linkedPage.id);
    }
    return true;
  }

  const roleVisible = enriched.filter((map) =>
    canViewMapAsset(map.visibility, role),
  );
  const partyMaps = canManage
    ? enriched
    : enriched.filter((map) => isMapDiscoveredForParty(map));

  const undiscoveredCount = canManage ? 0 : enriched.length - partyMaps.length;

  const maps = partyMaps.map((map) => {
    const linkedPageId = map.linkedPage?.id;
    const presenceState = linkedPageId
      ? presenceMap.get(linkedPageId) ?? ContentRevelationStates.REVEALED
      : undefined;
    return {
      ...map,
      presenceState: canManage ? presenceState : undefined,
    };
  });

  res.json({
    maps,
    discoverySummary: canManage
      ? null
      : {
          discoveredCount: maps.length,
          undiscoveredCount,
        },
  });
}

export async function getCampaignMap(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const asset = await loadMapAsset(req.campaign!.campaignId, assetId);
  if (!asset) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const campaignId = req.campaign!.campaignId;
  const role = req.campaign!.role as CampaignMemberRole | null;
  const enriched = await enrichMapAssetSummary(campaignId, asset);

  if (!canViewMapAsset(enriched.visibility, role)) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  res.json({
    map: enriched,
    linkedWikiPages: enriched.linkedPage ? [enriched.linkedPage] : [],
  });
}

export async function listMapPins(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const asset = await loadMapAsset(req.campaign!.campaignId, assetId);
  if (!asset) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const role = req.campaign!.role as CampaignMemberRole | null;
  if (!canViewMapAsset(asset.visibility, role)) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  await purgeInvalidMapPins(assetId);

  const pins = await prisma.mapPin.findMany({
    where: { assetId },
    include: mapPinInclude,
    orderBy: { createdAt: 'asc' },
  });

  const serialized = pins
    .map((pin) => serializeMapPinForRole(pin, role))
    .filter((pin): pin is NonNullable<typeof pin> => pin !== null);

  res.json({ pins: serialized });
}

export async function getMapPinPreview(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const pinId = String(req.params.pinId ?? '').trim();
  const role = req.campaign!.role as CampaignMemberRole | null;
  const campaignId = req.campaign!.campaignId;

  const pin = await loadMapPinForPreview(campaignId, pinId);
  const payload = pin ? buildMapPinPreviewPayload(pin, role) : null;

  if (!payload) {
    res.status(404).json({ error: 'Pin not found' });
    return;
  }

  res.json(payload);
}

function parsePinType(value: unknown): MapPinType | null {
  if (typeof value !== 'string') return null;
  return MAP_PIN_TYPE_VALUES.includes(value as MapPinType)
    ? (value as MapPinType)
    : null;
}

function parseCoordinates(body: Record<string, unknown>): { x: number; y: number } | null {
  const x = body.x ?? body.x_coordinate;
  const y = body.y ?? body.y_coordinate;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

const MAP_PIN_FOLDER_RULES: Partial<Record<MapPinType, string>> = {
  Location: 'Locations',
  Settlement: 'Locations',
  Ruin: 'Locations',
  Dungeon: 'Locations',
  Geography: 'Locations',
  Quest: 'Quests',
};

export function resolveWikiFolderForMapPinType(pinType: MapPinType): string {
  return MAP_PIN_FOLDER_RULES[pinType] ?? 'Locations';
}

async function findFolderIdByTitle(
  campaignId: string,
  title: string,
): Promise<string | null> {
  const folder = await prisma.wikiPage.findFirst({
    where: { campaignId, title, parentId: null },
    select: { id: true },
  });
  return folder?.id ?? null;
}

export async function createMapPin(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const campaignId = req.campaign!.campaignId;
  const asset = await loadMapAsset(campaignId, assetId);
  if (!asset) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const coords = parseCoordinates(body);
  if (!coords) {
    res.status(400).json({ error: 'x and y coordinates are required' });
    return;
  }

  const pinType = parsePinType(body.pinType) ?? 'Location';
  const label = typeof body.label === 'string' ? body.label.trim() || null : null;
  let targetPageId =
    typeof body.targetPageId === 'string' ? body.targetPageId.trim() : null;
  let targetAssetId =
    typeof body.targetAssetId === 'string' ? body.targetAssetId.trim() : null;

  const quickCreate = body.quickCreate as
    | { title?: string; category?: string }
    | undefined;

  if (quickCreate && typeof quickCreate.title === 'string' && quickCreate.title.trim()) {
    const folderTitle = resolveWikiFolderForMapPinType(pinType);
    let parentId = await findFolderIdByTitle(campaignId, folderTitle);
    if (!parentId) {
      const folder = await prisma.wikiPage.create({
        data: {
          campaignId,
          title: folderTitle,
          parentId: null,
          visibility: WikiVisibility.PARTY,
          blocks: [],
        },
        select: { id: true },
      });
      parentId = folder.id;
      console.info('Auto-created wiki folder for map pin placement', {
        campaignId,
        folderTitle,
        pinType,
      });
    }
    const page = await prisma.wikiPage.create({
      data: {
        campaignId,
        title: quickCreate.title.trim(),
        parentId,
        visibility: WikiVisibility.PARTY,
        blocks: [],
      },
      select: { id: true },
    });
    targetPageId = page.id;
  }

  if (!targetPageId && !targetAssetId) {
    res.status(400).json({
      error: 'targetPageId, targetAssetId, or quickCreate.title is required',
    });
    return;
  }

  if (targetPageId) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: targetPageId, campaignId },
      select: { id: true },
    });
    if (!page) {
      res.status(400).json({ error: 'targetPageId not found in campaign' });
      return;
    }
  }

  if (targetAssetId) {
    const nested = await loadMapAsset(campaignId, targetAssetId);
    if (!nested) {
      res.status(400).json({ error: 'targetAssetId is not a valid map asset' });
      return;
    }
  }

  const pin = await prisma.mapPin.create({
    data: {
      assetId,
      targetPageId,
      targetAssetId,
      label,
      pinType,
      x_coordinate: coords.x,
      y_coordinate: coords.y,
    },
    include: mapPinInclude,
  });

  if (pin.targetPageId) {
    const { syncEntityRelationsForMapPin } = await import('../lib/entityRelationSyncService.js');
    await syncEntityRelationsForMapPin(prisma, campaignId, pin.id);
  }

  if (asset.width && asset.height) {
    await syncSceneObjectFromPin(pin.id, asset.width, asset.height);
  }

  const role = req.campaign!.role as CampaignMemberRole | null;
  res.status(201).json({
    pin: serializeMapPinForRole(pin, role),
  });
}

export async function updateMapPin(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const pinId = String(req.params.pinId ?? '').trim();
  const campaignId = req.campaign!.campaignId;

  const existing = await prisma.mapPin.findFirst({
    where: { id: pinId, assetId, asset: { campaignId } },
    select: { id: true, asset: { select: { width: true, height: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Pin not found' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  const coords = parseCoordinates(body);
  if (coords) {
    data.x_coordinate = coords.x;
    data.y_coordinate = coords.y;
  }

  if (body.label !== undefined) {
    data.label =
      typeof body.label === 'string' ? body.label.trim() || null : null;
  }

  const pinType = parsePinType(body.pinType);
  if (pinType) data.pinType = pinType;

  if (body.targetPageId !== undefined) {
    const targetPageId =
      typeof body.targetPageId === 'string' ? body.targetPageId.trim() : null;
    if (targetPageId) {
      const page = await prisma.wikiPage.findFirst({
        where: { id: targetPageId, campaignId },
        select: { id: true },
      });
      if (!page) {
        res.status(400).json({ error: 'targetPageId not found in campaign' });
        return;
      }
    }
    data.targetPageId = targetPageId;
  }

  if (body.targetAssetId !== undefined) {
    const targetAssetId =
      typeof body.targetAssetId === 'string' ? body.targetAssetId.trim() : null;
    if (targetAssetId) {
      const nested = await loadMapAsset(campaignId, targetAssetId);
      if (!nested) {
        res.status(400).json({ error: 'targetAssetId is not a valid map asset' });
        return;
      }
    }
    data.targetAssetId = targetAssetId;
  }

  const revelation =
    typeof body.revelation === 'string' ? body.revelation.trim() : null;
  if (
    revelation &&
    !['REVEALED', 'HIDDEN', 'DRAFT'].includes(revelation)
  ) {
    res.status(400).json({ error: 'Invalid revelation value' });
    return;
  }

  if (Object.keys(data).length === 0 && !revelation) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const pin = await prisma.mapPin.update({
    where: { id: pinId },
    data,
    include: mapPinInclude,
  });

  if (revelation) {
    await prisma.mapSceneObject.updateMany({
      where: { mapPinId: pinId },
      data: { revelation },
    });
  }

  if (!pin.targetPageId && !pin.targetAssetId) {
    await prisma.$transaction(async (tx) => {
      const { clearEntityRelationsForMapPin } = await import('../lib/entityRelationSyncService.js');
      await clearEntityRelationsForMapPin(tx, campaignId, pinId);
      await tx.mapPin.delete({ where: { id: pinId } });
    });
    res.status(409).json({ error: 'Pin would have no targets and was removed' });
    return;
  }

  const { syncEntityRelationsForMapPin } = await import('../lib/entityRelationSyncService.js');
  await syncEntityRelationsForMapPin(prisma, campaignId, pin.id);

  const w = existing.asset.width;
  const h = existing.asset.height;
  if (w && h) {
    await syncSceneObjectFromPin(pin.id, w, h);
  }

  const role = req.campaign!.role as CampaignMemberRole | null;
  res.json({ pin: serializeMapPinForRole(pin, role) });
}

export async function deleteMapPin(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const pinId = String(req.params.pinId ?? '').trim();

  const existing = await prisma.mapPin.findFirst({
    where: {
      id: pinId,
      assetId,
      asset: { campaignId: req.campaign!.campaignId },
    },
    select: { id: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Pin not found' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const { clearEntityRelationsForMapPin } = await import('../lib/entityRelationSyncService.js');
    await clearEntityRelationsForMapPin(tx, req.campaign!.campaignId, pinId);
    await tx.mapPin.delete({ where: { id: pinId } });
  });
  res.json({ ok: true });
}

export async function updateCampaignMap(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const campaignId = req.campaign!.campaignId;
  const body = req.body ?? {};

  const hasDisplayName = Object.prototype.hasOwnProperty.call(body, 'displayName');
  const hasVisibility = Object.prototype.hasOwnProperty.call(body, 'visibility');
  const hasImageCredit = Object.prototype.hasOwnProperty.call(body, 'imageCredit');

  if (!hasDisplayName && !hasVisibility && !hasImageCredit) {
    res.status(400).json({
      error: 'At least one of displayName, visibility, or imageCredit is required',
    });
    return;
  }

  const asset = await loadMapAsset(campaignId, assetId);
  if (!asset) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  const data: {
    displayName?: string | null;
    visibility?: (typeof WikiVisibility)[keyof typeof WikiVisibility];
    imageCredit?: ReturnType<typeof normalizeImageCredit>;
  } = {};

  if (hasDisplayName) {
    const rawName = body.displayName;
    if (rawName !== null && typeof rawName !== 'string') {
      res.status(400).json({ error: 'displayName must be a string or null' });
      return;
    }
    data.displayName =
      typeof rawName === 'string' ? rawName.trim() || null : null;
  }

  if (hasVisibility) {
    const visibility = body.visibility;
    if (typeof visibility !== 'string') {
      res.status(400).json({ error: 'visibility must be a string' });
      return;
    }
    const allowed = Object.values(WikiVisibility) as string[];
    if (!allowed.includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility value' });
      return;
    }
    data.visibility = visibility as (typeof WikiVisibility)[keyof typeof WikiVisibility];
  }

  if (hasImageCredit) {
    const rawCredit = body.imageCredit;
    if (rawCredit !== null && (typeof rawCredit !== 'object' || Array.isArray(rawCredit))) {
      res.status(400).json({ error: 'imageCredit must be an object or null' });
      return;
    }
    data.imageCredit = normalizeImageCredit(rawCredit);
  }

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: data as Prisma.AssetUpdateInput,
    select: {
      id: true,
      url: true,
      displayUrl: true,
      thumbnailUrl: true,
      type: true,
      width: true,
      height: true,
      originalWidth: true,
      originalHeight: true,
      displayName: true,
      visibility: true,
      imageCredit: true,
      createdAt: true,
    },
  });

  const enriched = await enrichMapAssetSummary(campaignId, updated);
  res.json({ map: enriched });
}

export async function linkMapToWikiPage(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const assetId = String(req.params.assetId ?? '').trim();
  const campaignId = req.campaign!.campaignId;
  const pageId =
    typeof req.body?.pageId === 'string'
      ? req.body.pageId.trim() || null
      : req.body?.pageId === null
        ? null
        : undefined;

  if (pageId === undefined) {
    res.status(400).json({ error: 'pageId is required (string or null)' });
    return;
  }

  const asset = await loadMapAsset(campaignId, assetId);
  if (!asset) {
    res.status(404).json({ error: 'Map not found' });
    return;
  }

  if (pageId) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: pageId, campaignId },
      select: { id: true, title: true },
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    await prisma.$transaction([
      prisma.wikiPage.updateMany({
        where: { campaignId, mapAssetId: assetId },
        data: { mapAssetId: null },
      }),
      prisma.wikiPage.update({
        where: { id: pageId },
        data: { mapAssetId: assetId },
      }),
    ]);

    res.json({ ok: true, linkedPage: page });
    return;
  }

  await prisma.wikiPage.updateMany({
    where: { campaignId, mapAssetId: assetId },
    data: { mapAssetId: null },
  });

  res.json({ ok: true, linkedPage: null });
}

export async function bindWikiPageMapAsset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const pageId = String(req.params.pageId ?? '').trim();
  const campaignId = req.campaign!.campaignId;
  const mapAssetId =
    typeof req.body?.mapAssetId === 'string'
      ? req.body.mapAssetId.trim() || null
      : req.body?.mapAssetId === null
        ? null
        : undefined;

  if (mapAssetId === undefined) {
    res.status(400).json({ error: 'mapAssetId is required (string or null)' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId },
    select: { id: true },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (mapAssetId) {
    const asset = await loadMapAsset(campaignId, mapAssetId);
    if (!asset) {
      res.status(400).json({ error: 'mapAssetId is not a valid map asset' });
      return;
    }
  }

  await prisma.wikiPage.update({
    where: { id: pageId },
    data: { mapAssetId },
  });

  res.json({ ok: true, mapAssetId });
}
