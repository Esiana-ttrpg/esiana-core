/**
 * Lazy journal resolution pass. There is no background scheduler, so this runs
 * opportunistically whenever the Journal is loaded (a "poll") and on time
 * advance. Series materialization runs first so a freshly-due next issue can be
 * released in the same pass if its own content/rule are ready.
 */
import { resolveSeriesMaterialization } from './journalSeriesService.js';
import { resolveDuePublications } from './journalReleaseService.js';

export async function resolveJournalCampaign(campaignId: string): Promise<void> {
  await resolveSeriesMaterialization(campaignId);
  await resolveDuePublications(campaignId);
}

/** Best-effort wrapper: never let a resolution pass break a read request. */
export async function safeResolveJournalCampaign(campaignId: string): Promise<void> {
  try {
    await resolveJournalCampaign(campaignId);
  } catch {
    // Swallow — resolution is eventual; the next poll retries.
  }
}
