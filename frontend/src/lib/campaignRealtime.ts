import type { CampaignDomainEvent } from './campaignEvents';

export type CampaignSessionMessageType =
  | 'presence.join'
  | 'presence.update'
  | 'presence.leave'
  | 'cursor.move'
  | 'editing.typing';

export interface CampaignSessionMessage {
  version: 1;
  type: CampaignSessionMessageType;
  campaignId: string;
  sessionId: string;
  occurredAt: string;
  actor: { id: string; displayName: string | null };
  resource?: { type: 'wiki_page'; id: string };
  data: Record<string, unknown>;
}

export interface CampaignRealtimeReadyMessage {
  version: 1;
  type: 'session.ready';
  campaignId: string;
  sessionId: string;
}

export type CampaignRealtimeMessage =
  | CampaignDomainEvent
  | CampaignSessionMessage
  | CampaignRealtimeReadyMessage;

export function campaignWebSocketUrl(campaignHandle: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/campaigns/${encodeURIComponent(campaignHandle)}/ws`;
}

/** Opens the optional interactive transport; SSE remains the passive default. */
export function openCampaignRealtime(
  campaignHandle: string,
  onMessage: (message: CampaignRealtimeMessage) => void,
): WebSocket {
  const socket = new WebSocket(campaignWebSocketUrl(campaignHandle));
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    try {
      const value = JSON.parse(event.data) as CampaignRealtimeMessage;
      if (value && value.version === 1 && typeof value.type === 'string') onMessage(value);
    } catch {
      // Ignore malformed frames; the server owns protocol enforcement.
    }
  });
  return socket;
}
