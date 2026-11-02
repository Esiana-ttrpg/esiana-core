import {
  logCampaignActivity,
  type CampaignActivityActionType,
} from './campaignActivity.js';

export const ChronologyActivityEntity = {
  EVENT: 'CALENDAR_EVENT',
  ERA: 'CAMPAIGN_ERA',
  TIME_ADVANCE: 'TIME_TRACKING',
} as const;

export const CHRONOLOGY_EDIT_ENTITY_TYPES = [
  ChronologyActivityEntity.EVENT,
  ChronologyActivityEntity.ERA,
] as const;

export function chronologyActorCreateFields(userId: string | null | undefined): {
  createdByUserId?: string;
  updatedByUserId?: string;
} {
  if (!userId) return {};
  return { createdByUserId: userId, updatedByUserId: userId };
}

export function chronologyActorUpdateFields(userId: string | null | undefined): {
  updatedByUserId?: string;
} {
  if (!userId) return {};
  return { updatedByUserId: userId };
}

export function logChronologyActivity(input: {
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
