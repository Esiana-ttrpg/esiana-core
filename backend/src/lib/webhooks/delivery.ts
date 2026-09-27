import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { decryptSecretOrDevStore } from '../crypto/secretBox.js';
import { fetchAuthenticatedRemote } from '../networkFetch.js';
import { prisma } from '../prisma.js';

const MAX_ATTEMPTS = 4;
const SUSPEND_AFTER = 8;
let sweepStarted = false;

export function startWebhookDeliverySweep(): void {
  if (sweepStarted) return;
  sweepStarted = true;
  const sweep = async () => {
    const due = await prisma.webhookDelivery.findMany({ where: { status: { in: ['PENDING', 'RETRYING'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, select: { id: true }, take: 100 });
    for (const delivery of due) void deliverWebhook(delivery.id);
  };
  void sweep();
  setInterval(() => void sweep(), 60_000).unref();
}

export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

export async function deliverWebhook(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId }, include: { endpoint: true } });
  if (!delivery || !delivery.endpoint.enabled || delivery.endpoint.suspendedAt) return;
  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  let status: number | null = null;
  let diagnostic: string | null = null;
  try {
    const url = new URL(delivery.endpoint.url);
    const response = await fetchAuthenticatedRemote(url, {
      name: 'X-Esiana-Signature', value: signWebhookPayload(decryptSecretOrDevStore(delivery.endpoint.secretEnc), timestamp, body),
    }, {
      allowedOrigins: [url.origin], method: 'POST', body, timeoutSeconds: 10, maxBytes: 4096,
      headers: { 'Content-Type': 'application/json', 'X-Esiana-Timestamp': String(timestamp), 'X-Esiana-Delivery': delivery.id, 'X-Esiana-Event': delivery.eventType },
    });
    status = response.status;
    if (status >= 200 && status < 300) {
      await prisma.$transaction([
        prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'SUCCEEDED', attemptCount: { increment: 1 }, responseStatus: status, diagnostic: null, deliveredAt: new Date(), nextAttemptAt: null } }),
        prisma.webhookEndpoint.update({ where: { id: delivery.endpointId }, data: { consecutiveFailures: 0 } }),
      ]);
      return;
    }
    diagnostic = `Endpoint returned HTTP ${status}: ${response.body.toString('utf8').replace(/[\r\n]+/g, ' ').slice(0, 500)}`;
  } catch (error) {
    diagnostic = error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed';
  }
  await recordFailure(delivery.id, delivery.endpointId, delivery.attemptCount + 1, status, diagnostic);
}

async function recordFailure(deliveryId: string, endpointId: string, attempts: number, responseStatus: number | null, diagnostic: string | null): Promise<void> {
  const terminal = attempts >= MAX_ATTEMPTS;
  const endpoint = await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { consecutiveFailures: { increment: 1 } }, select: { consecutiveFailures: true } });
  const suspend = endpoint.consecutiveFailures >= SUSPEND_AFTER;
  const delay = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
  await prisma.$transaction([
    prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: terminal ? 'FAILED' : 'RETRYING', attemptCount: attempts, responseStatus, diagnostic, nextAttemptAt: terminal ? null : new Date(Date.now() + delay) } }),
    ...(suspend ? [prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { enabled: false, suspendedAt: new Date() } })] : []),
  ] as Prisma.PrismaPromise<unknown>[]);
  if (!terminal && !suspend) setTimeout(() => void deliverWebhook(deliveryId), delay).unref();
}
