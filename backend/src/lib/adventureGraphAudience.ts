import { EntityGraphEntityTypes, type EntityGraphNodeRef, nodeRefKey } from '../../../shared/entityGraph.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { projectAdventurePages, projectedWikiTargetIds } from './adventurePageProjection.js';
import { visibleAdventureEventIds } from './adventureAudienceEvents.js';
import { prisma } from './prisma.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { resolveMapObjectRevelationState } from '../../../shared/narrativeProjection.js';
import { pickActiveKeyframe } from './mapSceneService.js';

/** Campaign-scoped, type-specific node authorization for Party graph projections. */
export async function loadAdventureGraphAudience(
  campaignId: string, canView: (visibility: string) => boolean,
  viewer: NarrativeViewerContext | null,
): Promise<{ pageIds: Set<string>; entityKeys: Set<string>; generatedWikiPairs: Set<string> }> {
  const [pages, eventIds, pins, objects, layers] = await Promise.all([
    prisma.wikiPage.findMany({ where: { campaignId, deletedAt: null } }),
    visibleAdventureEventIds(campaignId, canView, viewer),
    prisma.mapPin.findMany({ where: { asset: { campaignId } }, select: {
      id: true, targetPageId: true, targetAssetId: true,
      asset: { select: { visibility: true, interactiveMapPages: { select: { id: true } } } },
      targetAsset: { select: { visibility: true, interactiveMapPages: { select: { id: true } } } },
      sceneObject: { select: { id: true } },
    } }),
    prisma.mapSceneObject.findMany({ where: { campaignId }, select: {
      id: true, targetPageId: true, targetAssetId: true, layerId: true,
      visibility: true, revelation: true,
      visibleFromEpochMinute: true, visibleUntilEpochMinute: true,
      mapAsset: { select: { visibility: true, interactiveMapPages: { select: { id: true } } } },
      keyframes: { orderBy: { effectiveEpochMinute: 'asc' }, select: {
        id: true, geometryOverride: true, effectiveEpochMinute: true,
        visibilityOverride: true, revelationOverride: true } },
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
  const presenceRows = await prisma.contentPresenceState.findMany({ where: { campaignId,
    entityType: ContentPresenceEntityType.MAP_OBJECT, subEntityId: null },
    select: { entityId: true, state: true, availableFromEpochMinute: true } });
  const presenceById = new Map(presenceRows.map(row => [row.entityId, row]));
  const visibleObject = (row: { visibility: string; revelation: string;
    layerId: string | null; targetPageId: string | null; targetAssetId: string | null;
    visibleFromEpochMinute: bigint | null;
    visibleUntilEpochMinute: bigint | null }) =>
    canView(row.visibility) && row.revelation === 'REVEALED' &&
    (!row.layerId || enabledLayerIds.has(row.layerId)) && !row.targetAssetId &&
    (!row.targetPageId || pageIds.has(row.targetPageId)) &&
    (row.visibleFromEpochMinute == null || row.visibleFromEpochMinute <= now) &&
    (row.visibleUntilEpochMinute == null || row.visibleUntilEpochMinute >= now);
  const visibleObjectIds = new Set<string>();
  for (const row of objects) {
    const frame = pickActiveKeyframe(row.keyframes, now);
    const presence = presenceById.get(row.id);
    const presenceOverride = presence
      ? presence.availableFromEpochMinute != null && presence.availableFromEpochMinute > now
        ? 'HIDDEN'
        : ['REVEALED', 'HIDDEN', 'DRAFT'].includes(presence.state) ? presence.state : null
      : null;
    const effective = { ...row,
      visibility: frame?.visibilityOverride ?? row.visibility,
      revelation: resolveMapObjectRevelationState({ columnRevelation: row.revelation,
        keyframeRevelation: frame?.revelationOverride, presenceOverride: presenceOverride as 'REVEALED' | 'HIDDEN' | 'DRAFT' | null }) };
    if (canView(row.mapAsset.visibility) && row.mapAsset.interactiveMapPages.some(page => pageIds.has(page.id)) && visibleObject(effective)) {
      visibleObjectIds.add(row.id);
      add(EntityGraphEntityTypes.MAP_SCENE_OBJECT, row.id);
    }
  }
  for (const pin of pins) if (canView(pin.asset.visibility) &&
    pin.asset.interactiveMapPages.some(page => pageIds.has(page.id)) &&
    (!pin.targetPageId || pageIds.has(pin.targetPageId)) &&
    (!pin.targetAssetId || (pin.targetAsset && canView(pin.targetAsset.visibility) &&
      pin.targetAsset.interactiveMapPages.some(page => pageIds.has(page.id)))) &&
    (!pin.sceneObject || visibleObjectIds.has(pin.sceneObject.id)))
    add(EntityGraphEntityTypes.MAP_PIN, pin.id);
  return { pageIds, entityKeys, generatedWikiPairs };
}
