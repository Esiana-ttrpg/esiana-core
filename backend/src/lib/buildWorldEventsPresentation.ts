import type { CampaignMemberRole } from '../types/domain.js';
import type { WorldEventSuggestionLine } from '../../../shared/downtimeHub.js';
import {
  countPendingWorldEventSuggestions,
  listPendingWorldEventSuggestions,
} from './worldEventSuggestionService.js';

export async function buildWorldEventSuggestionsForHub(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
): Promise<{ pendingSuggestions: WorldEventSuggestionLine[]; pendingSuggestionsCount: number }> {
  const pendingDetails = await listPendingWorldEventSuggestions(
    campaignId,
    campaignHandle,
    role,
    { limit: 20 },
  );

  const pendingSuggestions: WorldEventSuggestionLine[] = pendingDetails.map((s) => ({
    id: s.id,
    kind: s.kind,
    kindLabel: s.kindLabel,
    title: s.title,
    narrative: s.narrative,
    orgTitle: s.orgTitle,
    orgHref: s.orgHref,
    momentumLabel: s.momentumLabel,
    canResolve: s.canResolve,
    acceptedEventHref: s.acceptedEventHref,
  }));

  const pendingSuggestionsCount = await countPendingWorldEventSuggestions(campaignId);

  return { pendingSuggestions, pendingSuggestionsCount };
}
