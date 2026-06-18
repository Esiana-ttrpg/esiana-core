import { prisma } from './prisma.js';
import {
  isKankaImportReportPage,
  KANKA_IMPORT_REPORT_TITLE,
  readKankaAssetSourcePath,
  readKankaEntityId,
  readKankaMapId,
  readKankaMarkerId,
} from '../../../shared/kankaImportProvenance.js';

export type KankaImportIndex = {
  entityPageIdByKankaId: Map<string, string>;
  mapPageIdByKankaMapId: Map<string, string>;
  assetIdBySourcePath: Map<string, string>;
  sceneObjectIdByMarkerKey: Map<string, string>;
  importReportPageId: string | null;
};

function markerKey(mapAssetId: string, kankaMarkerId: string): string {
  return `${mapAssetId}:${kankaMarkerId}`;
}

export async function loadKankaImportIndex(campaignId: string): Promise<KankaImportIndex> {
  const entityPageIdByKankaId = new Map<string, string>();
  const mapPageIdByKankaMapId = new Map<string, string>();
  let importReportPageId: string | null = null;

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true, title: true, metadata: true, mapAssetId: true },
  });

  for (const page of pages) {
    const entityId = readKankaEntityId(page.metadata);
    if (entityId) entityPageIdByKankaId.set(entityId, page.id);
    const mapId = readKankaMapId(page.metadata);
    if (mapId) mapPageIdByKankaMapId.set(mapId, page.id);
    if (isKankaImportReportPage(page.metadata, page.title)) {
      importReportPageId = page.id;
    }
  }

  const assetIdBySourcePath = new Map<string, string>();
  const assets = await prisma.asset.findMany({
    where: { campaignId },
    select: { id: true, imageCredit: true },
  });
  for (const asset of assets) {
    const sourcePath = readKankaAssetSourcePath(asset.imageCredit);
    if (sourcePath) assetIdBySourcePath.set(sourcePath, asset.id);
  }

  const sceneObjectIdByMarkerKey = new Map<string, string>();
  const sceneObjects = await prisma.mapSceneObject.findMany({
    where: { campaignId },
    select: { id: true, mapAssetId: true, style: true, groupId: true },
  });
  for (const object of sceneObjects) {
    const markerId = readKankaMarkerId(object.style);
    if (markerId) {
      sceneObjectIdByMarkerKey.set(markerKey(object.mapAssetId, markerId), object.id);
    }
  }

  return {
    entityPageIdByKankaId,
    mapPageIdByKankaMapId,
    assetIdBySourcePath,
    sceneObjectIdByMarkerKey,
    importReportPageId,
  };
}

export { markerKey, KANKA_IMPORT_REPORT_TITLE };
