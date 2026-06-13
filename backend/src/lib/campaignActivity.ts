import { prisma } from './prisma.js';

export type CampaignActivityActionType = 'CREATE' | 'UPDATE' | 'DELETE';

export type CampaignActivityEntityType =
  | 'WIKI_PAGE'
  | 'CHARACTER'
  | 'TIME_TRACKING'
  | 'CAMPAIGN';

export function logCampaignActivity(input: {
  campaignId: string;
  userId: string;
  actionType: CampaignActivityActionType;
  entityType: CampaignActivityEntityType | string;
  entityId: string;
  entityName: string;
  parentContext?: string | null;
  pageSizeBytes?: number | null;
  deltaBytes?: number | null;
}): void {
  // Fire-and-forget: logs should never break the primary request.
  queueMicrotask(() => {
    (prisma as any).campaignActivity
      .create({
        data: {
          campaignId: input.campaignId,
          userId: input.userId,
          actionType: input.actionType,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          parentContext: input.parentContext ?? null,
          pageSizeBytes:
            typeof input.pageSizeBytes === 'number' && Number.isFinite(input.pageSizeBytes)
              ? Math.max(0, Math.floor(input.pageSizeBytes))
              : null,
          deltaBytes:
            typeof input.deltaBytes === 'number' && Number.isFinite(input.deltaBytes)
              ? Math.floor(input.deltaBytes)
              : null,
        },
        select: { id: true },
      })
      .catch(() => {
        // Intentionally swallow logging errors (db locks, schema drift, etc).
      });
  });
}

