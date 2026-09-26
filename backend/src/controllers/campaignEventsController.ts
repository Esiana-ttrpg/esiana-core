import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  subscribeToDomainEvent,
  type DomainEvent,
} from '../lib/domainEvents/index.js';

const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Streams transient campaign invalidation signals. This is deliberately not an
 * event log: reconnecting clients refetch canonical API resources.
 */
export function streamCampaignEvents(
  req: CampaignScopedRequest,
  res: Response,
): void {
  const campaignId = req.campaign!.campaignId;

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const unsubscribe = subscribeToDomainEvent('*', (event) => {
    if (event.campaignId !== campaignId || res.writableEnded) return;
    const envelope = campaignEventEnvelope(event);
    res.write(`data: ${JSON.stringify(envelope)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': heartbeat\n\n');
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

/** Only the canonical, intentionally small envelope crosses the trust boundary. */
export function campaignEventEnvelope(event: DomainEvent): DomainEvent {
  const payload =
    event.type.startsWith('wiki.') || event.type.startsWith('character.')
      ? {}
      : event.payload;
  return {
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
