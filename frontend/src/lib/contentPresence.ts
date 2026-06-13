import { apiFetch } from './api';
import {
  ContentPresenceEntityType,
  ContentRevelationStates,
  type ContentPresenceEntityType as ContentPresenceEntityTypeValue,
  type ContentRevelationState,
} from '@shared/contentPresence';

export {
  ContentPresenceEntityType,
  ContentRevelationStates,
  type ContentPresenceEntityTypeValue,
  type ContentRevelationState,
};

export type ContentPresenceRef = {
  entityType: ContentPresenceEntityTypeValue | string;
  entityId: string;
  subEntityId?: string | null;
};

export async function bulkRevealContentPresence(
  campaignHandle: string,
  refs: ContentPresenceRef[],
  state: ContentRevelationState = ContentRevelationStates.REVEALED,
  options?: {
    workflowKey?: string;
    reason?: string;
    availableFromEpochMinute?: number | null;
  },
): Promise<number> {
  const data = await apiFetch<{ updated: number }>(
    `/campaigns/${campaignHandle}/presence/reveal`,
    {
      method: 'POST',
      body: JSON.stringify({
        refs,
        state,
        workflowKey: options?.workflowKey,
        reason: options?.reason,
        availableFromEpochMinute: options?.availableFromEpochMinute,
      }),
    },
  );
  return data.updated;
}

export async function previewContentRevealImpact(
  campaignHandle: string,
  refs: ContentPresenceRef[],
): Promise<{ totalTargets: number; countsByType: Record<string, number> }> {
  return apiFetch(`/campaigns/${campaignHandle}/presence/reveal/preview`, {
    method: 'POST',
    body: JSON.stringify({ refs }),
  });
}
