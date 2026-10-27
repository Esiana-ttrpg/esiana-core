import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audioHandler, assertAudio, jsonSafe } from '../lib/audioCore.js';
import { encryptSecret, isSecretBoxConfigured } from '../lib/crypto/secretBox.js';
import { publicConnection, stringList } from '../lib/processingProviders.js';
import { PROCESSING_CAPABILITIES } from '../../../shared/sessionAudio.js';
import { requireTokenScopes } from '../middleware/auth.js';
import { transcriptionAdapter } from '../lib/processingAdapterRegistry.js';
import { cancelTranscription } from '../lib/transcriptionRunner.js';

export const processingAdminRouter = Object.assign(Router({ mergeParams: true }), { rateLimitMountPath: '/providers' });
processingAdminRouter.use(requireTokenScopes(['campaign:write']));
const caps = z.array(z.enum(PROCESSING_CAPABILITIES)).max(20);
const bytes = z.string().regex(/^\d+$/).transform(BigInt).refine((v) => v > 0n && v <= 9007199254740991n);
const connectionSchema = z.object({ name: z.string().trim().min(1).max(120),
  protocol: z.enum(['whisper_cpp', 'openai_transcription']), endpoint: z.url(),
  enabled: z.boolean().default(false), allowPrivateNetwork: z.boolean().default(false),
  capabilities: caps, credential: z.string().max(8192).optional(),
  operatorLabel: z.string().max(200).nullable().optional(), billingLabel: z.string().max(200).nullable().optional(),
  concurrency: z.number().int().min(1).max(16).default(1), timeoutSeconds: z.number().int().min(1).max(86400).default(3600),
  maxRequestBytes: bytes.default(1073741824n), formats: z.array(z.string().max(20)).max(20),
  monthlyRequests: z.number().int().nonnegative().nullable().optional(), monthlyDurationMs: z.string().regex(/^\d+$/).transform(BigInt).refine((v) => v <= 9007199254740991n).nullable().optional(),
}).strict();
processingAdminRouter.get('/', audioHandler(async (_req, res) => {
  const connections = await prisma.processingConnection.findMany({ include: { models: true }, orderBy: { name: 'asc' } });
  res.json(jsonSafe(connections.map((c) => ({ ...publicConnection(c), endpoint: c.endpoint, allowPrivateNetwork: c.allowPrivateNetwork }))));
}));
processingAdminRouter.post('/:connectionId/test', audioHandler(async (req, res) => {
  const connection = await prisma.processingConnection.findUnique({ where: { id: String(req.params.connectionId) } });
  assertAudio(connection, 404, 'provider_not_found');
  try {
    const result = await transcriptionAdapter(connection.protocol).testConnection(connection);
    await prisma.processingConnection.update({ where: { id: connection.id }, data: { status: 'reachable' } });
    res.json(result);
  } catch {
    await prisma.processingConnection.update({ where: { id: connection.id }, data: { status: 'unavailable' } });
    res.status(502).json({ error: 'provider_connection_failed' });
  }
}));
processingAdminRouter.post('/', audioHandler(async (req, res) => {
  const { credential, ...data } = connectionSchema.parse(req.body);
  assertAudio(!credential || isSecretBoxConfigured(), 400, 'secret_storage_not_configured');
  const url = new URL(data.endpoint);
  assertAudio(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash && !url.search, 400, 'invalid_endpoint');
  assertAudio(url.protocol === 'https:' || data.allowPrivateNetwork, 400, 'http_requires_explicit_private_endpoint');
  const row = await prisma.processingConnection.create({ data: { ...data, endpoint: url.href,
    encryptedCredential: credential ? encryptSecret(credential) : null } });
  res.status(201).json(jsonSafe({ ...publicConnection(row), endpoint: row.endpoint, allowPrivateNetwork: row.allowPrivateNetwork }));
}));
processingAdminRouter.patch('/:connectionId', audioHandler(async (req, res) => {
  const { credential, ...data } = connectionSchema.partial().parse(req.body);
  assertAudio(!credential || isSecretBoxConfigured(), 400, 'secret_storage_not_configured');
  const id = String(req.params.connectionId);
  const previous = await prisma.processingConnection.findUnique({ where: { id } });
  assertAudio(previous, 404, 'provider_not_found');
  const url = new URL(data.endpoint ?? previous.endpoint);
  const allowPrivate = data.allowPrivateNetwork ?? previous.allowPrivateNetwork;
  assertAudio(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash && !url.search &&
    (url.protocol === 'https:' || allowPrivate), 400, 'invalid_endpoint');
  const row = await prisma.$transaction(async (tx) => {
    const result = await tx.processingConnection.update({ where: { id }, data: { ...data,
      ...(credential === undefined ? {} : { encryptedCredential: credential ? encryptSecret(credential) : null }), status: 'unverified' } });
    await tx.processingCampaignGrant.updateMany({ where: { connectionId: id }, data: { revision: { increment: 1 } } });
    return result;
  });
  res.json(jsonSafe({ ...publicConnection(row), endpoint: row.endpoint, allowPrivateNetwork: row.allowPrivateNetwork }));
}));
processingAdminRouter.put('/:connectionId/models/:modelKey', audioHandler(async (req, res) => {
  const data = z.object({ name: z.string().min(1).max(120), enabled: z.boolean(), capabilities: caps }).strict().parse(req.body);
  const connectionId = String(req.params.connectionId), key = String(req.params.modelKey);
  const connection = await prisma.processingConnection.findUnique({ where: { id: connectionId } });
  assertAudio(connection && key.length <= 200, 404, 'provider_not_found');
  assertAudio(data.capabilities.every((c) => stringList(connection.capabilities).includes(c)), 400, 'model_capability_not_declared');
  res.json(await prisma.processingModel.upsert({ where: { connectionId_key: { connectionId, key } },
    create: { connectionId, key, ...data }, update: data }));
}));
processingAdminRouter.get('/policies/all', audioHandler(async (_req, res) => {
  const [grants, campaigns] = await Promise.all([prisma.processingCampaignGrant.findMany(),
    prisma.campaign.findMany({ select: { id: true, name: true, handle: true }, orderBy: { name: 'asc' } })]);
  res.json(jsonSafe({ grants, campaigns }));
}));
processingAdminRouter.put('/policies/bulk', audioHandler(async (req, res) => {
  const data = z.object({ campaignIds: z.array(z.string()).min(1).max(200), connectionId: z.string(),
    feature: z.literal('session_audio'), capability: z.literal('audio.transcribe'), enabled: z.boolean(),
    modelIds: z.array(z.string()).max(100), monthlyRequests: z.number().int().nonnegative().nullable(),
    monthlyDurationMs: z.string().regex(/^\d+$/).transform(BigInt).refine((v) => v <= 9007199254740991n).nullable() }).strict().parse(req.body);
  const models = await prisma.processingModel.findMany({ where: { connectionId: data.connectionId } });
  assertAudio(data.modelIds.every((id) => models.some((m) => m.id === id)), 400, 'invalid_models');
  await prisma.$transaction(async (tx) => {
    for (const campaignId of new Set(data.campaignIds)) {
      const { campaignIds: _ids, ...values } = data;
      await tx.processingCampaignGrant.upsert({ where: { campaignId_connectionId_feature_capability: {
        campaignId, connectionId: data.connectionId, feature: data.feature, capability: data.capability } },
        create: { campaignId, ...values }, update: { ...values, revision: { increment: 1 } } });
    }
  });
  res.json({ updated: data.campaignIds.length });
}));
processingAdminRouter.get('/usage/all', audioHandler(async (req, res) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.month ?? new Date().toISOString().slice(0, 7));
  const usage = await prisma.processingUsage.findMany({ where: { month }, orderBy: { createdAt: 'desc' }, take: 500 });
  // This projection is intentionally exhaustive: no content or raw provider response can escape.
  res.json(jsonSafe(usage.map((u) => ({ id: u.id, campaignId: u.campaignId, connectionId: u.connectionId, modelId: u.modelId,
    feature: u.feature, capability: u.capability, jobId: u.jobId, month: u.month, durationMs: u.durationMs,
    requestCount: u.requestCount, status: u.status, failureCode: u.failureCode, tokens: u.tokens,
    reportedCost: u.reportedCost, createdAt: u.createdAt, startedRequests: u.startedRequests, startedDurationMs: u.startedDurationMs,
    completedRequests: u.completedRequests, completedDurationMs: u.completedDurationMs }))));
}));
processingAdminRouter.get('/usage/summary', audioHandler(async (req, res) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.month ?? new Date().toISOString().slice(0, 7));
  res.json(jsonSafe(await prisma.processingUsage.groupBy({ by: ['campaignId', 'connectionId', 'status'], where: { month },
    _sum: { requestCount: true, durationMs: true, startedRequests: true, startedDurationMs: true,
      completedRequests: true, completedDurationMs: true }, _count: true })));
}));
processingAdminRouter.post('/usage/:jobId/cancel', audioHandler(async (req, res) => {
  const jobId = String(req.params.jobId);
  await prisma.transcriptionJob.updateMany({ where: { id: jobId, status: { in: ['queued', 'running'] } }, data: { status: 'cancelled', failureCode: 'cancelled_by_operator' } });
  cancelTranscription(jobId);
  const usage = await prisma.processingUsage.findUnique({ where: { jobId } });
  if (usage && usage.startedRequests === 0) await prisma.processingUsage.update({ where: { jobId }, data: { status: 'released', requestCount: 0, durationMs: 0n } });
  res.json({ status: 'cancelled' });
}));
