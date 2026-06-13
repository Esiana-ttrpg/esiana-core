import { apiFetch } from './api';

export async function acceptReputationSuggestion(
  campaignHandle: string,
  suggestionId: string,
  narrative?: string | null,
): Promise<{ eventId: string }> {
  return apiFetch<{ eventId: string }>(
    `/campaigns/${campaignHandle}/downtime/reputation/suggestions/${suggestionId}/accept`,
    {
      method: 'POST',
      body: JSON.stringify(narrative != null ? { narrative } : {}),
    },
  );
}

export async function dismissReputationSuggestion(
  campaignHandle: string,
  suggestionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/campaigns/${campaignHandle}/downtime/reputation/suggestions/${suggestionId}/dismiss`,
    { method: 'POST' },
  );
}
