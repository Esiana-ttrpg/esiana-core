import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { encryptSecretOrDevStore } from '../lib/crypto/secretBox.js';
import { prisma } from '../lib/prisma.js';
import { assertUrlSafeForImport } from '../lib/ssrfGuard.js';
import { webhookEventCatalog, validatesSubscriptions, WEBHOOK_CONTRACT_VERSION } from '../lib/webhooks/catalog.js';
import { deliverWebhook } from '../lib/webhooks/delivery.js';

const dto = (endpoint: any) => ({ id: endpoint.id, name: endpoint.name, url: endpoint.url, enabled: endpoint.enabled, subscribedEvents: endpoint.subscribedEvents, suspendedAt: endpoint.suspendedAt, consecutiveFailures: endpoint.consecutiveFailures, hasSecret: true, createdById: endpoint.createdById, createdAt: endpoint.createdAt, updatedAt: endpoint.updatedAt });

async function safeUrl(raw: unknown): Promise<string> {
  if (typeof raw !== 'string') throw new Error('HTTPS endpoint URL is required');
  const url = new URL(raw);
  await assertUrlSafeForImport(url, { allowHttp: false });
  return url.toString();
}

export function getWebhookCatalog(_req: CampaignScopedRequest, res: Response): void { res.json({ version: WEBHOOK_CONTRACT_VERSION, events: webhookEventCatalog }); }
export async function listWebhooks(req: CampaignScopedRequest, res: Response): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { campaignId: req.campaign!.campaignId }, orderBy: { createdAt: 'desc' } });
  res.json({ endpoints: endpoints.map(dto) });
}
export async function createWebhook(req: CampaignScopedRequest, res: Response): Promise<void> {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
    if (!name || !validatesSubscriptions(req.body.subscribedEvents)) return void res.status(400).json({ error: 'Name and valid event subscriptions are required' });
    const url = await safeUrl(req.body.url);
    const secret = typeof req.body.secret === 'string' && req.body.secret.length >= 24 ? req.body.secret : randomBytes(32).toString('base64url');
    const endpoint = await prisma.webhookEndpoint.create({ data: { campaignId: req.campaign!.campaignId, name, url, secretEnc: encryptSecretOrDevStore(secret), enabled: req.body.enabled !== false, subscribedEvents: req.body.subscribedEvents, createdById: req.user!.id } });
    res.status(201).json({ endpoint: dto(endpoint), secret });
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid webhook' }); }
}
export async function updateWebhook(req: CampaignScopedRequest, res: Response): Promise<void> {
  const where = { id: String(req.params.webhookId), campaignId: req.campaign!.campaignId };
  const existing = await prisma.webhookEndpoint.findFirst({ where });
  if (!existing) return void res.status(404).json({ error: 'Webhook not found' });
  try {
    const data: any = {};
    if (req.body.name !== undefined) data.name = String(req.body.name).trim().slice(0, 120);
    if (req.body.url !== undefined) data.url = await safeUrl(req.body.url);
    if (req.body.subscribedEvents !== undefined) { if (!validatesSubscriptions(req.body.subscribedEvents)) throw new Error('Invalid event subscriptions'); data.subscribedEvents = req.body.subscribedEvents; }
    if (req.body.enabled !== undefined) { data.enabled = Boolean(req.body.enabled); if (data.enabled) { data.suspendedAt = null; data.consecutiveFailures = 0; } }
    const endpoint = await prisma.webhookEndpoint.update({ where: { id: existing.id }, data });
    res.json({ endpoint: dto(endpoint) });
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid webhook' }); }
}
export async function deleteWebhook(req: CampaignScopedRequest, res: Response): Promise<void> { const result = await prisma.webhookEndpoint.deleteMany({ where: { id: String(req.params.webhookId), campaignId: req.campaign!.campaignId } }); res.status(result.count ? 204 : 404).end(); }
export async function rotateWebhookSecret(req: CampaignScopedRequest, res: Response): Promise<void> { const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: String(req.params.webhookId), campaignId: req.campaign!.campaignId } }); if (!endpoint) return void res.status(404).json({ error: 'Webhook not found' }); const secret = randomBytes(32).toString('base64url'); await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { secretEnc: encryptSecretOrDevStore(secret) } }); res.json({ secret }); }
export async function listWebhookDeliveries(req: CampaignScopedRequest, res: Response): Promise<void> { const deliveries = await prisma.webhookDelivery.findMany({ where: { campaignId: req.campaign!.campaignId, ...(req.params.webhookId ? { endpointId: String(req.params.webhookId) } : {}) }, select: { id: true, endpointId: true, eventId: true, eventType: true, status: true, attemptCount: true, responseStatus: true, diagnostic: true, nextAttemptAt: true, deliveredAt: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }); res.json({ deliveries }); }
export async function redeliverWebhook(req: CampaignScopedRequest, res: Response): Promise<void> { const delivery = await prisma.webhookDelivery.findFirst({ where: { id: String(req.params.deliveryId), campaignId: req.campaign!.campaignId } }); if (!delivery) return void res.status(404).json({ error: 'Delivery not found' }); await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'PENDING', attemptCount: 0, diagnostic: null, responseStatus: null, deliveredAt: null, nextAttemptAt: null } }); setImmediate(() => void deliverWebhook(delivery.id)); res.status(202).json({ deliveryId: delivery.id }); }
export async function testWebhook(req: CampaignScopedRequest, res: Response): Promise<void> { const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: String(req.params.webhookId), campaignId: req.campaign!.campaignId } }); if (!endpoint) return void res.status(404).json({ error: 'Webhook not found' }); const eventId = `evt_${randomUUID()}`; const delivery = await prisma.webhookDelivery.create({ data: { campaignId: endpoint.campaignId, endpointId: endpoint.id, eventId, eventType: 'webhook.test', payload: { id: eventId, version: 1, type: 'webhook.test', campaignId: endpoint.campaignId, occurredAt: new Date().toISOString(), actor: { id: req.user!.id }, resource: null, data: { test: true } } } }); setImmediate(() => void deliverWebhook(delivery.id)); res.status(202).json({ deliveryId: delivery.id }); }
