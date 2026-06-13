import { apiFetch } from '@/lib/api';
import type { QuestTimeRules } from '@shared/questTimeSimulation';
import { QUEST_TIME_SIMULATION_VERSION } from '@shared/questTimeSimulation';

export type { QuestTimePressureBadge } from '@shared/questTimeSimulation';

export async function updateQuestTimeRules(
  campaignHandle: string,
  pageId: string,
  rules: Partial<QuestTimeRules>,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch<{ metadata: Record<string, unknown> }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        metadata: {
          questTime: {
            version: QUEST_TIME_SIMULATION_VERSION,
            rules,
          },
        },
      }),
    },
  );
}

export async function resolveQuestTimePressure(
  campaignHandle: string,
  pageId: string,
  body: { action: 'fail' | 'extend' | 'dismiss'; extendEpochMinute?: string },
): Promise<{ ok: boolean }> {
  return apiFetch(`/campaigns/${campaignHandle}/quests/${pageId}/time-pressure/resolve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function touchQuestTimelineManual(
  campaignHandle: string,
  pageId: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/campaigns/${campaignHandle}/quests/${pageId}/time-pressure/touch`, {
    method: 'POST',
  });
}

export {
  parseQuestTimePayload,
  computeQuestTimePressureBadges,
  type QuestTimePayload,
  type QuestTimeRules,
} from '@shared/questTimeSimulation';
