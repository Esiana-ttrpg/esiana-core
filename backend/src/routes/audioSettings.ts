import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audioHandler, audioSettings, campaignAudioSettings, assertAudio, capability, jsonSafe } from '../lib/audioCore.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { AUDIO_FORMATS, RECORDING_VISIBILITIES } from '../../../shared/sessionAudio.js';
import { publicConnection } from '../lib/processingProviders.js';
import { requireTokenScopes } from '../middleware/auth.js';
import { resolveDriverForPointer } from '../lib/storage/storagePointer.js';
const bytes = z.string().regex(/^\d+$/).transform(BigInt).refine((v) => v > 0n && v <= 9007199254740991n);
export const audioAdminRouter = Object.assign(Router(), { rateLimitMountPath: '/audio' });
audioAdminRouter.use(requireTokenScopes(['campaign:write']));
audioAdminRouter.get('/', audioHandler(async (_req, res) => res.json(jsonSafe(await audioSettings()))));
audioAdminRouter.patch('/', audioHandler(async (req, res) => {
  const data = z.object({ enabled: z.boolean(), transcriptionEnabled: z.boolean(), maxFileBytes: bytes,
    maxSessionBytes: bytes, maxCampaignBytes: bytes, maxGlobalBytes: bytes.nullable(),
    maxTranscriptBytes: z.number().int().min(1).max(104857600), uploadConcurrency: z.number().int().min(1).max(20),
    allowedFormats: z.array(z.enum(AUDIO_FORMATS)).min(1) }).partial().strict().parse(req.body);
  await audioSettings();
  res.json(jsonSafe(await prisma.audioSettings.update({ where: { id: 'GLOBAL_AUDIO' }, data: { ...data, revision: { increment: 1 } } })));
}));
audioAdminRouter.get('/storage', audioHandler(async (_req, res) => {
  const [files, recordings, uploads, assets, campaigns, transcriptSegments] = await Promise.all([
    prisma.sessionRecordingFile.findMany({ select: { id: true, assetId: true, sizeBytes: true, recordingId: true,
      recording: { select: { campaignId: true } } }, orderBy: { sizeBytes: 'desc' } }),
    prisma.sessionRecording.groupBy({ by: ['campaignId'], _count: true }),
    prisma.assetUploadSession.findMany({ where: { status: { in: ['uploading', 'finalizing', 'failed'] } },
      select: { id: true, campaignId: true, sizeBytes: true, offsetBytes: true, status: true, expiresAt: true } }),
    prisma.asset.findMany({ where: { type: 'SessionAudio' }, select: { id: true, campaignId: true, sizeBytes: true, createdAt: true, _count: { select: { recordingFiles: true } } }, orderBy: { sizeBytes: 'desc' } }),
    prisma.campaign.findMany({ select: { id: true, name: true } }),
    prisma.sessionTranscriptSegment.findMany({ select: { text: true, revision: { select: { transcript: { select: { recording: { select: { campaignId: true } } } } } } } }),
  ]);
  const transcriptBytes: Record<string, number> = {};
  for (const segment of transcriptSegments) { const id = segment.revision.transcript.recording.campaignId;
    transcriptBytes[id] = (transcriptBytes[id] ?? 0) + Buffer.byteLength(segment.text); }
  res.json(jsonSafe({ files, recordings, uploads, assets, campaigns, transcriptBytes }));
}));
audioAdminRouter.delete('/storage/assets/:assetId', audioHandler(async (req, res) => {
  const asset = await prisma.asset.findFirst({ where: { id: String(req.params.assetId), type: 'SessionAudio' }, include: { _count: { select: { recordingFiles: true, featuredOnWikiPages: true } } } });
  assertAudio(asset && !asset._count.recordingFiles && !asset._count.featuredOnWikiPages, 409, 'asset_still_referenced');
  const pages = await prisma.wikiPage.findMany({ where: { campaignId: asset.campaignId }, select: { blocks: true, metadata: true } });
  assertAudio(!pages.some((page) => JSON.stringify(page).includes(asset.id) || JSON.stringify(page).includes(asset.url)), 409, 'asset_still_referenced');
  const storage = resolveDriverForPointer(asset.url); assertAudio(storage, 409, 'storage_unavailable');
  await storage.driver.delete(storage.key);
  await prisma.asset.delete({ where: { id: asset.id } });
  res.status(204).end();
}));
audioAdminRouter.delete('/storage/recordings/:recordingId', audioHandler(async (req, res) => {
  await prisma.sessionRecording.deleteMany({ where: { id: String(req.params.recordingId) } });
  res.status(204).end();
}));
export const campaignAudioRouter = Object.assign(Router({ mergeParams: true }), { rateLimitMountPath: '/audio' });
campaignAudioRouter.use((req, res, next) => requireTokenScopes([req.method === 'GET' ? 'campaign:read' : 'campaign:write'])(req, res, next));
campaignAudioRouter.get('/settings', audioHandler(async (req, res) => {
  const ctx = req.campaign!;
  const [settings, global] = await Promise.all([campaignAudioSettings(ctx.campaignId), audioSettings()]);
  const usage = await prisma.asset.aggregate({ where: { campaignId: ctx.campaignId, type: 'SessionAudio' }, _sum: { sizeBytes: true }, _count: true });
  res.json(jsonSafe({ settings, usage: { storageBytes: usage._sum.sizeBytes ?? 0n, fileCount: usage._count }, global: { enabled: global.enabled, transcriptionEnabled: global.transcriptionEnabled,
    maxFileBytes: global.maxFileBytes, maxSessionBytes: global.maxSessionBytes, maxCampaignBytes: global.maxCampaignBytes,
    allowedFormats: global.allowedFormats, chunkBytes: 8388608 }, capabilities: [...ctx.capabilities] }));
}));
campaignAudioRouter.patch('/settings', audioHandler(async (req, res) => {
  const ctx = req.campaign!; capability(ctx, C.CAMPAIGN_SETTINGS_EDIT);
  const data = z.object({ enabled: z.boolean(), transcriptionEnabled: z.boolean(),
    allowPov: z.boolean(), defaultVisibility: z.enum(RECORDING_VISIBILITIES),
    defaultConnectionId: z.string().nullable(), defaultModelId: z.string().nullable(), maxStorageBytes: bytes.nullable(),
    monthlyRequests: z.number().int().nonnegative().nullable(), monthlyDurationMs: z.string().regex(/^\d+$/).transform(BigInt).refine((v) => v <= 9007199254740991n).nullable() }).partial().strict().parse(req.body);
  const current = await campaignAudioSettings(ctx.campaignId);
  const next = { ...current, ...data };
  if (next.defaultConnectionId) {
    const grant = await prisma.processingCampaignGrant.findFirst({ where: { campaignId: ctx.campaignId,
      connectionId: next.defaultConnectionId, feature: 'session_audio', capability: 'audio.transcribe', enabled: true } });
    assertAudio(grant && (!next.defaultModelId || (Array.isArray(grant.modelIds) && grant.modelIds.includes(next.defaultModelId))), 403, 'provider_not_permitted');
  } else assertAudio(!next.defaultModelId, 400, 'provider_required_for_model');
  const global = await audioSettings();
  assertAudio(!next.maxStorageBytes || next.maxStorageBytes <= global.maxCampaignBytes, 400, 'campaign_limit_exceeds_global');
  res.json(jsonSafe(await prisma.campaignAudioSettings.update({ where: { campaignId: ctx.campaignId }, data })));
}));
campaignAudioRouter.get('/providers', audioHandler(async (req, res) => {
  capability(req.campaign!, C.CAMPAIGN_SETTINGS_EDIT);
  const grants = await prisma.processingCampaignGrant.findMany({ where: { campaignId: req.campaign!.campaignId, enabled: true },
    include: { connection: { include: { models: true } } } });
  res.json(jsonSafe(grants.map((grant) => ({ id: grant.connection.id, name: grant.connection.name,
    enabled: grant.connection.enabled, status: grant.connection.status, capabilities: grant.connection.capabilities,
    requiresModel: grant.connection.protocol !== 'whisper_cpp' || (Array.isArray(grant.modelIds) && grant.modelIds.length > 0),
    models: grant.connection.models.filter((m) => Array.isArray(grant.modelIds) && grant.modelIds.includes(m.id)),
    grant: { feature: grant.feature, capability: grant.capability, monthlyRequests: grant.monthlyRequests,
      monthlyDurationMs: grant.monthlyDurationMs } }))));
}));
campaignAudioRouter.get('/usage', audioHandler(async (req, res) => {
  capability(req.campaign!, C.CAMPAIGN_SETTINGS_EDIT);
  res.json(jsonSafe(await prisma.processingUsage.findMany({ where: { campaignId: req.campaign!.campaignId }, take: 500, orderBy: { createdAt: 'desc' } })));
}));
