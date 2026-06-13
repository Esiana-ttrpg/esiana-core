export const MapPinTypes = {
  LOCATION: 'Location',
  SETTLEMENT: 'Settlement',
  RUIN: 'Ruin',
  DUNGEON: 'Dungeon',
  GEOGRAPHY: 'Geography',
  QUEST: 'Quest',
} as const;

export type MapPinType = (typeof MapPinTypes)[keyof typeof MapPinTypes];

export const MAP_PIN_TYPE_VALUES = Object.values(MapPinTypes) as MapPinType[];

export interface MapLinkedPage {
  id: string;
  title: string;
}

export interface MapNestedInEntry {
  assetId: string;
  title: string;
}

import type { ImageCredit } from '@shared/imageCredit';

export interface CampaignMapAsset {
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
  imageCredit: ImageCredit | null;
  createdAt: string;
  linkedPage?: MapLinkedPage | null;
  pinCount?: number;
  nestedInMaps?: MapNestedInEntry[];
  nestedChildMaps?: MapNestedInEntry[];
}

export interface CampaignMapDetail {
  map: CampaignMapAsset;
  linkedWikiPages: MapLinkedPage[];
}

export interface MapPinDto {
  id: string;
  x: number;
  y: number;
  label: string | null;
  pinType: string;
  targetPageId: string | null;
  targetAssetId: string | null;
  targetPageTitle: string | null;
  targetMapTitle: string | null;
  isSecret?: boolean;
  isGhostHidden?: boolean;
  presenceReason?: string;
  sceneObjectId?: string;
}

export interface MapLayerDto {
  id: string;
  name: string;
  sortOrder: number;
  defaultEnabled: boolean;
  color: string | null;
}

export interface MapSceneObjectDto {
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
  presenceReason?: string;
  visibleFromEpochMinute: string | null;
  visibleUntilEpochMinute: string | null;
}

export interface MapObjectGroupDto {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

export interface MapPresentationPresetDto {
  id: string;
  label: string;
  anchorEpochMinute: string;
  enabledLayerIds: string[];
  sortOrder: number;
}

export interface MapVisibilityZoneDto {
  id: string;
  geometry: unknown;
  targetPageId: string;
  pageVisibility: string;
}

export interface MapScenePayload {
  viewEpochMinute: string;
  editorGhostMode: boolean;
  presentationPresets?: MapPresentationPresetDto[];
  activePresentationPresetAnchorEpoch?: string | null;
  visibilityZones?: MapVisibilityZoneDto[];
  hiddenZoneGeometries?: unknown[];
  layers: MapLayerDto[];
  groups?: MapObjectGroupDto[];
  objects: MapSceneObjectDto[];
}

export type MapEditorTool = 'select' | 'drawRegion' | 'drawPath' | 'placeLabel';

export interface MapPinPreviewDto {
  title: string;
  excerpt: string;
  visibility: string;
  wikiPageId: string;
  targetAssetId: string | null;
  thumbnailUrl: string | null;
}

export interface MapBreadcrumbItem {
  assetId: string;
  title: string;
}

export function mapDisplayTitle(map: Pick<CampaignMapAsset, 'displayName' | 'linkedPage'>): string {
  const custom = map.displayName?.trim();
  if (custom) return custom;
  return map.linkedPage?.title ?? 'Untitled map';
}
