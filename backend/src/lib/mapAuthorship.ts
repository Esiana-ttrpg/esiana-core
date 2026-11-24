import {
  logCampaignActivity,
  type CampaignActivityActionType,
} from './campaignActivity.js';

export const MapActivityEntity = {
  ASSET: 'MAP_ASSET',
  PIN: 'MAP_PIN',
  LAYER: 'MAP_LAYER',
  SCENE_OBJECT: 'MAP_SCENE_OBJECT',
  GROUP: 'MAP_OBJECT_GROUP',
  KEYFRAME: 'MAP_KEYFRAME',
  PRESET: 'MAP_PRESENTATION_PRESET',
} as const;

export const MAP_ACTIVITY_ENTITY_TYPES = Object.values(MapActivityEntity);

export function mapActorCreateFields(userId: string | null | undefined): {
  createdByUserId?: string;
  updatedByUserId?: string;
} {
  if (!userId) return {};
  return { createdByUserId: userId, updatedByUserId: userId };
}

export function mapActorUpdateFields(userId: string | null | undefined): {
  updatedByUserId?: string;
} {
  if (!userId) return {};
  return { updatedByUserId: userId };
}

export function logMapActivity(input: {
  campaignId: string;
  userId: string | null | undefined;
  actionType: CampaignActivityActionType;
  entityType: string;
  entityId: string;
  entityName: string;
  parentContext?: string | null;
}): void {
  if (!input.userId) return;
  logCampaignActivity({
    campaignId: input.campaignId,
    userId: input.userId,
    actionType: input.actionType,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    parentContext: input.parentContext ?? null,
  });
}
