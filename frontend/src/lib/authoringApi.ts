import { apiFetch } from '@/lib/api';

export interface WritingSessionPayload {
  pageId: string;
  pageTitle: string;
  durationMs: number;
  wordDelta: number;
  linksAdded: number;
}

export interface CampaignGrowthMetrics {
  npcCount: number;
  activeThreadCount: number;
  sceneCount: number;
  factionCount: number;
  activeQuestCount: number;
}

export async function flushWritingSession(
  campaignHandle: string,
  payload: WritingSessionPayload,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/authoring/writing-session`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCampaignGrowthMetrics(
  campaignHandle: string,
): Promise<CampaignGrowthMetrics> {
  return apiFetch<CampaignGrowthMetrics>(`/campaigns/${campaignHandle}/authoring/growth-metrics`);
}
