import { apiFetch } from './api';
import type {
  EventConsequence,
  EventConsequenceApplyResult,
} from '@shared/eventConsequence';

export async function fetchEventConsequences(
  campaignHandle: string,
  calendarEventId: string,
): Promise<{ eventId: string; lorePageId: string; consequences: EventConsequence[] }> {
  return apiFetch(`/campaigns/${campaignHandle}/calendar-events/${calendarEventId}/consequences`);
}

export async function saveEventConsequences(
  campaignHandle: string,
  calendarEventId: string,
  consequences: EventConsequence[],
): Promise<{ eventId: string; lorePageId: string; consequences: EventConsequence[] }> {
  return apiFetch(`/campaigns/${campaignHandle}/calendar-events/${calendarEventId}/consequences`, {
    method: 'PUT',
    body: JSON.stringify({ consequences }),
  });
}

export async function applyEventConsequences(
  campaignHandle: string,
  calendarEventId: string,
  options?: { previewOnly?: boolean },
): Promise<EventConsequenceApplyResult> {
  const query = options?.previewOnly ? '?previewOnly=true' : '';
  return apiFetch(
    `/campaigns/${campaignHandle}/calendar-events/${calendarEventId}/apply-consequences${query}`,
    {
      method: 'POST',
      body: JSON.stringify({ previewOnly: options?.previewOnly === true }),
    },
  );
}
