import type { DomainEvent } from './domainEvents/index.js';

/** Only the canonical, intentionally small envelope crosses a transport boundary. */
export function campaignEventEnvelope(event: DomainEvent): DomainEvent {
  const payload =
    event.type.startsWith('wiki.') || event.type.startsWith('character.')
      ? {}
      : event.payload;
  return {
    id: event.id,
    version: event.version,
    type: event.type,
    campaignId: event.campaignId,
    actorId: event.actorId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    occurredAt: event.occurredAt,
    payload,
    source: event.source,
    ...(event.sourceId ? { sourceId: event.sourceId } : {}),
  };
}
