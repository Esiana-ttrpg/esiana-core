import { apiFetch } from '@/lib/api';

export interface WritingSessionPayload {
  pageId: string;
  pageTitle: string;
  durationMs: number;
  wordDelta: number;
  linksAdded: number;
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
