import { apiFetch } from '@/lib/api';

export interface WritingSessionPayload {
  pageId: string;
  pageTitle: string;
  durationMs: number;
  wordDelta: number;
  linksAdded: number;
}

export interface WritingSessionHeartbeatPayload {
  pageId: string;
  pageTitle: string;
  clientInstanceKey: string;
  kind: 'activity' | 'interval-end';
  focused: boolean;
  visible: boolean;
  connected: boolean;
}

export async function sendWritingSessionHeartbeat(
  campaignHandle: string,
  payload: WritingSessionHeartbeatPayload,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/authoring/writing-session`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
