import { campaignEventEnvelope } from '../campaignEventEnvelope.js';
import { canReceiveCampaignEvent } from '../campaignEventVisibility.js';
import { subscribeToDomainEvent, type DomainEvent } from '../domainEvents/index.js';
import { prisma } from '../prisma.js';
import { Prisma } from '@prisma/client';
import { deliverWebhook } from './delivery.js';
import { isWebhookEventEligible, WEBHOOK_CONTRACT_VERSION } from './catalog.js';

let unsubscribe: (() => void) | null = null;
export function bootstrapWebhookDispatcher(): void {
  if (unsubscribe) return;
  unsubscribe = subscribeToDomainEvent('*', queueEvent);
}

async function queueEvent(event: DomainEvent): Promise<void> {
  if (!event.campaignId || !isWebhookEventEligible(event.type)) return;
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { campaignId: event.campaignId, enabled: true, suspendedAt: null } });
  const visible = await canReceiveCampaignEvent({ campaignId: event.campaignId, userId: 'webhook', role: 'GAMEMASTER', allowPlayerChronologyManagement: true, chronologyContributor: true }, event);
  if (!visible) return;
  const canonical = campaignEventEnvelope(event);
  const payload = { id: canonical.id, version: WEBHOOK_CONTRACT_VERSION, type: canonical.type, campaignId: canonical.campaignId, occurredAt: canonical.occurredAt, actor: canonical.actorId ? { id: canonical.actorId } : null, resource: canonical.resourceType && canonical.resourceId ? { type: canonical.resourceType, id: canonical.resourceId } : null, data: canonical.payload };
  for (const endpoint of endpoints) {
    const subscriptions = endpoint.subscribedEvents as string[];
    if (!subscriptions.includes('*') && !subscriptions.includes(event.type)) continue;
    const delivery = await prisma.webhookDelivery.create({ data: { campaignId: event.campaignId, endpointId: endpoint.id, eventId: event.id, eventType: event.type, payload: payload as Prisma.InputJsonValue } });
    setImmediate(() => void deliverWebhook(delivery.id));
  }
}
