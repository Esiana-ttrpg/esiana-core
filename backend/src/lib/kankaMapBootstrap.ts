import type JSZip from 'jszip';
import type { Prisma } from '@prisma/client';
import { displayToNormalizedPoint, pointGeometry } from '../../../shared/mapPresence.js';
import type { KankaMapPlan } from '../../../shared/virtualNarrativeEntry.js';
import { normalizeKankaImagePath, resolveKankaZipImageEntry, zipEntryKey } from './kankaAssetResolver.js';
import { markerKey, type KankaImportIndex } from './kankaImportIndex.js';
import { importFromPackBuffer } from './assetImport.js';
import { prisma } from './prisma.js';

export type KankaMapBootstrapRow = {
  wikiPageId: string;
  kankaMapId: string;
  plan: KankaMapPlan;
};

export async function ingestKankaZipAsset(options: {
  campaignId: string;
  zip: JSZip;
  imagePath: string;
  campaignJsonId?: string | number | null;
  assetType: 'generic' | 'map' | 'campaign-cover';
  index: KankaImportIndex;
  createdAssetsBySource: Map<string, { id: string; url: string }>;
}): Promise<string | null> {
  const normalizedSource = normalizeKankaImagePath(options.imagePath);
  const existingId =
    options.index.assetIdBySourcePath.get(normalizedSource) ??
    options.createdAssetsBySource.get(normalizedSource)?.id;
  if (existingId) {
    options.createdAssetsBySource.set(normalizedSource, {
      id: existingId,
      url: `/api/assets/${existingId}`,
    });
    return existingId;
  }

  const entry = resolveKankaZipImageEntry(
    options.zip,
    options.imagePath,
    options.campaignJsonId,
  );
  if (!entry) return null;

  const zipKey = zipEntryKey(entry);
  const cached = options.createdAssetsBySource.get(zipKey);
  if (cached) {
    options.index.assetIdBySourcePath.set(normalizedSource, cached.id);
    return cached.id;
  }

  const buffer = await entry.async('nodebuffer');
  const filename = entry.name.split('/').pop() ?? 'image.jpg';
  const result = await importFromPackBuffer({
    campaignId: options.campaignId,
    buffer,
    filename,
    assetType:
      options.assetType === 'map'
        ? 'map'
        : options.assetType === 'campaign-cover'
          ? 'campaign-cover'
          : 'generic',
  });
  const assetId = result.asset.id;

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      imageCredit: {
        kankaImportSourcePath: normalizedSource,
      } as Prisma.InputJsonValue,
    },
  });

  options.index.assetIdBySourcePath.set(normalizedSource, assetId);
  options.createdAssetsBySource.set(zipKey, { id: assetId, url: `/api/assets/${assetId}` });
  options.createdAssetsBySource.set(normalizedSource, { id: assetId, url: `/api/assets/${assetId}` });
  return assetId;
}

export async function bootstrapKankaMaps(options: {
  campaignId: string;
  zip: JSZip;
  campaignJsonId?: string | number | null;
  rows: KankaMapBootstrapRow[];
  externalKeyToPageId: Map<string, string>;
  index: KankaImportIndex;
  createdAssetsBySource: Map<string, { id: string; url: string }>;
  warnings: string[];
}): Promise<void> {
  for (const row of options.rows) {
    const { plan } = row;
    let mapAssetId: string | null = null;

    if (plan.imagePath) {
      mapAssetId = await ingestKankaZipAsset({
        campaignId: options.campaignId,
        zip: options.zip,
        imagePath: plan.imagePath,
        campaignJsonId: options.campaignJsonId,
        assetType: 'map',
        index: options.index,
        createdAssetsBySource: options.createdAssetsBySource,
      });
      if (!mapAssetId) {
        options.warnings.push(
          `Map ${row.kankaMapId}: missing image asset for ${plan.imagePath}`,
        );
      }
    }

    if (mapAssetId) {
      await prisma.wikiPage.update({
        where: { id: row.wikiPageId },
        data: { mapAssetId },
      });
    } else {
      continue;
    }

    const groupIdByName = new Map<string, string>();
    for (const group of plan.groups) {
      const existing = await prisma.mapObjectGroup.findFirst({
        where: {
          campaignId: options.campaignId,
          mapAssetId,
          name: group.name,
        },
        select: { id: true },
      });
      if (existing) {
        groupIdByName.set(group.name, existing.id);
        continue;
      }
      const created = await prisma.mapObjectGroup.create({
        data: {
          campaignId: options.campaignId,
          mapAssetId,
          name: group.name,
          sortOrder: group.sortOrder,
        },
      });
      groupIdByName.set(group.name, created.id);
    }

    for (const marker of plan.markers) {
      const geometry = pointGeometry(
        displayToNormalizedPoint(marker.x, marker.y, plan.width, plan.height),
      );
      const targetPageId = marker.targetKankaEntityId
        ? options.externalKeyToPageId.get(marker.targetKankaEntityId) ?? null
        : null;
      if (marker.targetKankaEntityId && !targetPageId) {
        options.warnings.push(
          `Map ${row.kankaMapId}: unresolved marker target ${marker.targetKankaEntityId}`,
        );
      }

      const groupId = marker.groupName ? groupIdByName.get(marker.groupName) ?? null : null;
      const existingObjectId = options.index.sceneObjectIdByMarkerKey.get(
        markerKey(mapAssetId, marker.kankaMarkerId),
      );
      const data = {
        label: marker.label,
        visibility: marker.visibility,
        geometry: geometry as Prisma.InputJsonValue,
        targetPageId,
        groupId,
        style: { kankaMarkerId: marker.kankaMarkerId } as Prisma.InputJsonValue,
      };

      if (existingObjectId) {
        await prisma.mapSceneObject.update({
          where: { id: existingObjectId },
          data,
        });
      } else {
        const created = await prisma.mapSceneObject.create({
          data: {
            campaignId: options.campaignId,
            mapAssetId,
            kind: 'pin',
            revelation: 'REVEALED',
            ...data,
          },
        });
        options.index.sceneObjectIdByMarkerKey.set(
          markerKey(mapAssetId, marker.kankaMarkerId),
          created.id,
        );
      }
    }
  }
}
