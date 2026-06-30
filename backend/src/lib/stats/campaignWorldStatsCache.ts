import type { CampaignWorldStatsResponse } from '../../../../shared/statsTypes.js';
import { buildCampaignWorldStats } from './buildCampaignWorldStats.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  payload: CampaignWorldStatsResponse;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(campaignId: string, periodDays: number): string {
  return `${campaignId}:${periodDays}`;
}

export async function getCachedCampaignWorldStats(
  campaignId: string,
  periodDays = 30,
): Promise<CampaignWorldStatsResponse> {
  const key = cacheKey(campaignId, periodDays);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.payload;
  }

  const payload = await buildCampaignWorldStats(campaignId, periodDays);
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
  return payload;
}

export function clearCampaignWorldStatsCache(campaignId?: string): void {
  if (!campaignId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${campaignId}:`)) {
      cache.delete(key);
    }
  }
}
