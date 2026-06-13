import { apiFetch } from './api';

export async function acceptWorldEventSuggestion(
  campaignHandle: string,
  suggestionId: string,
  input?: { title?: string | null; narrative?: string | null },
): Promise<{ calendarEventId: string; lorePageId: string }> {
  const body: Record<string, string> = {};
  if (input?.title != null) body.title = input.title;
  if (input?.narrative != null) body.narrative = input.narrative;
  return apiFetch<{ calendarEventId: string; lorePageId: string }>(
    `/campaigns/${campaignHandle}/downtime/world-events/suggestions/${suggestionId}/accept`,
    {
      method: 'POST',
      body: JSON.stringify(Object.keys(body).length > 0 ? body : {}),
    },
  );
}

export async function dismissWorldEventSuggestion(
  campaignHandle: string,
  suggestionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/campaigns/${campaignHandle}/downtime/world-events/suggestions/${suggestionId}/dismiss`,
    { method: 'POST' },
  );
}
