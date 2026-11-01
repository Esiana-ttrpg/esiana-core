import { prisma } from './prisma.js';
import { assertAudio, audioContext, audioSettings, campaignAudioSettings, capability, serializable, recordingAccess } from './audioCore.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { evaluateProcessingPolicy } from '../../../shared/processingPolicy.js';
import type { CampaignContext } from '../types/api.js';
import type { ProcessingConnection } from './prismaClient.js';

export const stringList = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
export function publicConnection(connection: ProcessingConnection & { models?: unknown }) {
  const { encryptedCredential, endpoint, allowPrivateNetwork, ...rest } = connection;
  return { ...rest, hasCredential: Boolean(encryptedCredential) };
}
export async function resolveTranscription(input: {
  ctx?: CampaignContext; campaignId: string; userId: string; connectionId?: string; modelId?: string | null;
}) {
  const ctx = input.ctx ?? await audioContext(input.campaignId, input.userId);
  const [global, settings] = await Promise.all([audioSettings(), campaignAudioSettings(input.campaignId)]);
  const connectionId = input.connectionId ?? settings.defaultConnectionId;
  assertAudio(connectionId, 409, 'default_provider_required');
  const connection = await prisma.processingConnection.findUnique({ where: { id: connectionId }, include: { models: true } });
  assertAudio(connection, 409, 'provider_unavailable');
  const modelId = input.modelId === undefined ? settings.defaultModelId : input.modelId;
  const model = modelId ? connection.models.find((m) => m.id === modelId) : undefined;
  const grant = await prisma.processingCampaignGrant.findUnique({ where: { campaignId_connectionId_feature_capability: {
    campaignId: input.campaignId, connectionId, feature: 'session_audio', capability: 'audio.transcribe',
  } } });
  const decision = evaluateProcessingPolicy({ member: ctx.isMember, actorAllowed: ctx.capabilities.has(C.AUDIO_TRANSCRIBE),
    globallyEnabled: global.transcriptionEnabled, connectionEnabled: connection.enabled,
    modelEnabled: modelId ? Boolean(model?.enabled) : connection.protocol === 'whisper_cpp',
    capabilitySupported: stringList(connection.capabilities).includes('audio.transcribe') &&
      (!modelId || stringList(model?.capabilities).includes('audio.transcribe')),
    grantEnabled: Boolean(grant?.enabled), featureEnabled: settings.transcriptionEnabled,
    modelPermitted: modelId ? stringList(grant?.modelIds).includes(modelId) :
      connection.protocol === 'whisper_cpp' && stringList(grant?.modelIds).length === 0, quotaAvailable: true });
  assertAudio(decision.allowed, 403, decision.allowed ? '' : decision.reason);
  return { ctx, global, settings, connection, model, grant: grant! };
}
export async function reserveTranscription(input: {
  campaignId: string; userId: string; recordingId: string; connectionId?: string; modelId?: string | null;
}) {
  const resolved = await resolveTranscription(input);
  const readable = await recordingAccess(resolved.ctx, input.userId, input.recordingId);
  assertAudio(readable.files.every((file) => file.sizeBytes <= resolved.connection.maxRequestBytes && stringList(resolved.connection.formats).includes(file.format)), 409, 'provider_media_incompatible');
  capability(resolved.ctx, C.AUDIO_TRANSCRIBE);
  return serializable(async (tx) => {
    const recording = await tx.sessionRecording.findFirst({ where: { id: input.recordingId, campaignId: input.campaignId }, include: { transcript: true, files: true } });
    assertAudio(recording && recording.files.length && recording.status === 'ready', 409, 'recording_not_ready');
    const grant = await tx.processingCampaignGrant.findUnique({ where: { id: resolved.grant.id } });
    assertAudio(grant?.enabled && grant.revision === resolved.grant.revision, 403, 'campaign_not_granted');
    const month = new Date().toISOString().slice(0, 7);
    const usage = await tx.processingUsage.aggregate({ where: { campaignId: input.campaignId, connectionId: resolved.connection.id, month,
      status: { not: 'released' } }, _sum: { durationMs: true, requestCount: true } });
    const requests = (usage._sum.requestCount ?? 0) + recording.files.length;
    const duration = (usage._sum.durationMs ?? 0n) + BigInt(recording.durationMs);
    const globalUsage = await tx.processingUsage.aggregate({ where: { connectionId: resolved.connection.id, month, status: { not: 'released' } }, _sum: { requestCount: true, durationMs: true } });
    assertAudio((resolved.connection.monthlyRequests === null || (globalUsage._sum.requestCount ?? 0) + recording.files.length <= resolved.connection.monthlyRequests) &&
      (resolved.connection.monthlyDurationMs === null || (globalUsage._sum.durationMs ?? 0n) + BigInt(recording.durationMs) <= resolved.connection.monthlyDurationMs), 429, 'provider_usage_limit_exceeded');
    const campaignUsage = await tx.processingUsage.aggregate({ where: { campaignId: input.campaignId, feature: 'session_audio', month, status: { not: 'released' } }, _sum: { requestCount: true, durationMs: true } });
    assertAudio((grant.monthlyRequests === null || requests <= grant.monthlyRequests) &&
      (grant.monthlyDurationMs === null || duration <= grant.monthlyDurationMs) &&
      (resolved.settings.monthlyRequests === null || (campaignUsage._sum.requestCount ?? 0) + recording.files.length <= resolved.settings.monthlyRequests) &&
      (resolved.settings.monthlyDurationMs === null || (campaignUsage._sum.durationMs ?? 0n) + BigInt(recording.durationMs) <= resolved.settings.monthlyDurationMs), 429, 'usage_limit_exceeded');
    const job = await tx.transcriptionJob.create({ data: { campaignId: input.campaignId, recordingId: recording.id,
      userId: input.userId, connectionId: resolved.connection.id, modelId: resolved.model?.id,
      grantRevision: grant.revision, recordingRevision: recording.revision, transcriptRevision: recording.transcript?.revision ?? 0,
      fileResults: [] } });
    await tx.processingUsage.create({ data: { campaignId: input.campaignId, connectionId: resolved.connection.id,
      modelId: resolved.model?.id, jobId: job.id, month, feature: 'session_audio', capability: 'audio.transcribe',
      durationMs: BigInt(recording.durationMs), requestCount: recording.files.length } });
    return job;
  });
}

export async function reserveAdditionalProcessing(jobId: string, requests: number, durationMs: number) {
  const job = await prisma.transcriptionJob.findUnique({ where: { id: jobId } });
  assertAudio(job, 404, 'job_not_found');
  const resolved = await resolveTranscription({ campaignId: job.campaignId, userId: job.userId, connectionId: job.connectionId, modelId: job.modelId });
  return serializable(async (tx) => {
    const month = new Date().toISOString().slice(0, 7);
    const usage = await tx.processingUsage.aggregate({ where: { campaignId: job.campaignId, connectionId: job.connectionId, month,
      status: { not: 'released' } }, _sum: { requestCount: true, durationMs: true } });
    const grant = await tx.processingCampaignGrant.findUnique({ where: { id: resolved.grant.id } });
    assertAudio(grant?.enabled && grant.revision === resolved.grant.revision, 403, 'campaign_not_granted');
    const globalUsage = await tx.processingUsage.aggregate({ where: { connectionId: job.connectionId, month, status: { not: 'released' } }, _sum: { requestCount: true, durationMs: true } });
    assertAudio((resolved.connection.monthlyRequests === null || (globalUsage._sum.requestCount ?? 0) + requests <= resolved.connection.monthlyRequests) &&
      (resolved.connection.monthlyDurationMs === null || (globalUsage._sum.durationMs ?? 0n) + BigInt(durationMs) <= resolved.connection.monthlyDurationMs), 429, 'provider_usage_limit_exceeded');
    const campaignUsage = await tx.processingUsage.aggregate({ where: { campaignId: job.campaignId, feature: 'session_audio', month, status: { not: 'released' } }, _sum: { requestCount: true, durationMs: true } });
    assertAudio((grant.monthlyRequests === null || (usage._sum.requestCount ?? 0) + requests <= grant.monthlyRequests) &&
      (grant.monthlyDurationMs === null || (usage._sum.durationMs ?? 0n) + BigInt(durationMs) <= grant.monthlyDurationMs) &&
      (resolved.settings.monthlyRequests === null || (campaignUsage._sum.requestCount ?? 0) + requests <= resolved.settings.monthlyRequests) &&
      (resolved.settings.monthlyDurationMs === null || (campaignUsage._sum.durationMs ?? 0n) + BigInt(durationMs) <= resolved.settings.monthlyDurationMs), 429, 'usage_limit_exceeded');
    const previous = await tx.processingUsage.findUnique({ where: { jobId } });
    assertAudio(previous?.month === month, 409, 'processing_reservation_month_expired');
    await tx.processingUsage.update({ where: { jobId }, data: { status: 'reserved', requestCount: { increment: requests }, durationMs: { increment: BigInt(durationMs) } } });
  });
}
