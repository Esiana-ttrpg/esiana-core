import { dispatchPluginDomainEvent } from './pluginDomainEvents';

export const CAMPAIGN_DOMAIN_EVENT = 'esiana:campaign-domain-event';

export interface CampaignDomainEvent {
  type: string;
  campaignId?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  source: 'core' | 'plugin';
  sourceId?: string;
}

export interface CampaignDomainEventDetail {
  campaignHandle: string;
  event: CampaignDomainEvent;
}

export function dispatchCampaignDomainEvent(
  campaignHandle: string,
  event: CampaignDomainEvent,
): void {
  const detail = { campaignHandle, event };
  window.dispatchEvent(
    new CustomEvent(CAMPAIGN_DOMAIN_EVENT, {
      detail,
    }),
  );
  // Canonical event names are also the browser-facing vocabulary. The generic
  // event above remains useful for consumers interested in every event.
  window.dispatchEvent(new CustomEvent(event.type, { detail }));

  if (event.source === 'plugin') {
    dispatchPluginDomainEvent({
      type: event.type,
      campaignHandle,
      payload: event.payload,
    });
  }
}

export function subscribeToCampaignDomainEvent(
  campaignHandle: string,
  type: string,
  handler: (event: CampaignDomainEvent) => void,
): () => void {
  const listener = (browserEvent: Event) => {
    const detail = (browserEvent as CustomEvent<CampaignDomainEventDetail>).detail;
    if (detail?.campaignHandle === campaignHandle) handler(detail.event);
  };
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}
