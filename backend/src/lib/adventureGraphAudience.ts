import { EntityGraphEntityTypes, type EntityGraphNodeRef, nodeRefKey } from '../../../shared/entityGraph.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { projectAdventurePages, projectedWikiTargetIds } from './adventurePageProjection.js';
import { visibleAdventureEventIds } from './adventureAudienceEvents.js';
import { prisma } from './prisma.js';

/** Campaign-scoped, type-specific node authorization for Party graph projections. */
export async function loadAdventureGraphAudience(
  campaignId: string, canView: (visibility: string) => boolean,
  viewer: NarrativeViewerContext | null,
): Promise<{ pageIds: Set<string>; entityKeys: Set<string>; generatedWikiPairs: Set<string> }> {
  const [pages, eventIds, pins, objects, layers] = await Promise.all([
    prisma.wikiPage.findMany({ where: { campaignId, deletedAt: null } }),
    visibleAdventureEventIds(campaignId, canView, viewer),
    prisma.mapPin.findMany({ where: { asset: { campaignId } }, select: {
      id: true, targetPageId: true, asset: { select: { visibility: true } },
      sceneObject: { select: { visibility: true, revelation: true, layerId: true,
        targetPageId: true, targetAssetId: true,
        visibleFromEpochMinute: true, visibleUntilEpochMinute: true,
        mapAsset: { select: { visibility: true } } } },
    } }),
    prisma.mapSceneObject.findMany({ where: { campaignId }, select: {
      id: true, targetPageId: true, targetAssetId: true, layerId: true,
      visibility: true, revelation: true,
      visibleFromEpochMinute: true, visibleUntilEpochMinute: true,
      mapAsset: { select: { visibility: true } },
    } }),
    prisma.mapLayer.findMany({ where: { campaignId, defaultEnabled: true }, select: { id: true } }),
  ]);
  const projectedPages = await projectAdventurePages(campaignId, pages, canView);
  const pageIds = new Set(projectedPages.map(page => page.id));
  const generatedWikiPairs = new Set<string>();
  for (const page of projectedPages) {
    const targets = new Set([...projectedWikiTargetIds(page.blocks),
      ...projectedWikiTargetIds(page.metadata), ...(page.parentId ? [page.parentId] : [])]);
    for (const id of targets) if (pageIds.has(id)) generatedWikiPairs.add(`${page.id}:${id}`);
  }
  const entityKeys = new Set<string>();
  const add = (entityType: EntityGraphNodeRef['entityType'], entityId: string) =>
    entityKeys.add(nodeRefKey({ entityType, entityId }));
  for (const id of pageIds) {
    add(EntityGraphEntityTypes.WIKI_PAGE, id);
    add(EntityGraphEntityTypes.SCENE, id);
    add(EntityGraphEntityTypes.CLUE, id);
  }
  for (const id of eventIds) add(EntityGraphEntityTypes.CALENDAR_EVENT, id);
  const now = viewer?.campaignNow.epochMinute ?? 0n;
  const enabledLayerIds = new Set(layers.map(layer => layer.id));
  const visibleObject = (row: { visibility: string; revelation: string;
    layerId: string | null; targetPageId: string | null; targetAssetId: string | null;
    visibleFromEpochMinute: bigint | null;
    visibleUntilEpochMinute: bigint | null }) =>
    canView(row.visibility) && row.revelation === 'REVEALED' &&
    (!row.layerId || enabledLayerIds.has(row.layerId)) && !row.targetAssetId &&
    (!row.targetPageId || pageIds.has(row.targetPageId)) &&
    (row.visibleFromEpochMinute == null || row.visibleFromEpochMinute <= now) &&
    (row.visibleUntilEpochMinute == null || row.visibleUntilEpochMinute >= now);
  for (const row of objects) if (canView(row.mapAsset.visibility) && visibleObject(row))
    add(EntityGraphEntityTypes.MAP_SCENE_OBJECT, row.id);
  for (const pin of pins) if (canView(pin.asset.visibility) &&
    (!pin.targetPageId || pageIds.has(pin.targetPageId)) &&
    (!pin.sceneObject || (canView(pin.sceneObject.mapAsset.visibility) && visibleObject(pin.sceneObject))))
    add(EntityGraphEntityTypes.MAP_PIN, pin.id);
  return { pageIds, entityKeys, generatedWikiPairs };
}
