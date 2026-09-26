import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  subscribeToDomainEvent,
  type DomainEvent,
} from '../lib/domainEvents/index.js';
import { canReceiveCampaignEvent } from '../lib/campaignEventVisibility.js';
import { registerCampaignEventStream } from '../lib/campaignEventStreams.js';
import { prisma } from '../lib/prisma.js';

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
  const userId = req.user!.id;
  const subscriber = {
    campaignId,
    userId,
    role: req.campaign!.role!,
    allowPlayerChronologyManagement: req.campaign!.allowPlayerChronologyManagement,
    chronologyContributor: req.campaign!.chronologyContributor,
  };

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const unregister = registerCampaignEventStream(campaignId, userId, res);
  const unsubscribe = subscribeToDomainEvent('*', async (event) => {
    if (event.campaignId !== campaignId || res.writableEnded) return;
    if (!(await canReceiveCampaignEvent(subscriber, event)) || res.writableEnded) return;
    const envelope = campaignEventEnvelope(event);
    res.write(`data: ${JSON.stringify(envelope)}\n\n`);
  });

  let checkingMembership = false;
  const heartbeat = setInterval(async () => {
    if (res.writableEnded) return;
    if (checkingMembership) return;
    checkingMembership = true;
    try {
      const membership = await prisma.campaignMember.findUnique({
        where: { userId_campaignId: { userId, campaignId } },
        select: { userId: true },
      });
      if (!membership) {
        res.end();
        return;
      }
      res.write(': heartbeat\n\n');
    } catch {
      // Fail closed when authorization cannot be revalidated.
      res.end();
    } finally {
      checkingMembership = false;
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(heartbeat);
    unsubscribe();
    unregister();
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);
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
