import { prisma } from './prisma.js';
import { audioSettings, assertAudio, recordingAccess, AudioError, serializable } from './audioCore.js';
import { resolveTranscription, stringList, reserveAdditionalProcessing } from './processingProviders.js';
import { resolveDriverForPointer } from './storage/storagePointer.js';
import { transcriptionAdapter } from './processingAdapterRegistry.js';
import { createTranscriptRevision } from './sessionTranscripts.js';
import { sweepAudioUploads } from './audioUploads.js';
import type { TranscriptSegmentInput } from '../../../shared/sessionAudio.js';
import type { Prisma } from './prismaClient.js';

const active = new Map<string, AbortController>();
let sweeping = false;
export function cancelTranscription(id: string) { active.get(id)?.abort(); }
async function dispatch(id: string) {
  const controller = new AbortController(); active.set(id, controller);
  try {
    const job = await prisma.transcriptionJob.findUnique({ where: { id } });
    assertAudio(job && job.status === 'running', 409, 'job_not_running');
    const reservation = await prisma.processingUsage.findUnique({ where: { jobId: id } });
    assertAudio(reservation?.month === new Date().toISOString().slice(0, 7), 409, 'processing_reservation_month_expired');
    const resolved = await resolveTranscription({ campaignId: job.campaignId, userId: job.userId, connectionId: job.connectionId, modelId: job.modelId });
    assertAudio(resolved.grant.revision === job.grantRevision, 403, 'provider_policy_changed');
    const recording = await recordingAccess(resolved.ctx, job.userId, job.recordingId);
    assertAudio(recording.revision === job.recordingRevision, 409, 'recording_revision_conflict');
    const completed = Array.isArray(job.fileResults) ? job.fileResults as unknown as { fileId: string; language?: string | null; segments: TranscriptSegmentInput[] }[] : [];
    for (const file of recording.files) {
      if (completed.some((r) => r.fileId === file.id)) continue;
      const checked = await resolveTranscription({ campaignId: job.campaignId, userId: job.userId, connectionId: job.connectionId, modelId: job.modelId });
      await recordingAccess(checked.ctx, job.userId, job.recordingId);
      assertAudio(checked.grant.revision === job.grantRevision, 403, 'provider_policy_changed');
      assertAudio(file.sizeBytes <= resolved.connection.maxRequestBytes && stringList(resolved.connection.formats).includes(file.format), 409, 'provider_media_incompatible');
      const asset = await prisma.asset.findUnique({ where: { id: file.assetId } });
      const storage = asset ? resolveDriverForPointer(asset.url) : null;
      assertAudio(storage, 404, 'media_missing');
      let result;
      for (let attempt = 0; ; attempt++) {
        const delivery = await storage.driver.openRead({ key: storage.key, requireStream: true });
        assertAudio(delivery.type === 'stream', 503, 'protected_stream_required');
        try {
          await prisma.processingUsage.update({ where: { jobId: id }, data: { startedRequests: { increment: 1 }, startedDurationMs: { increment: BigInt(file.durationMs) } } });
          result = await transcriptionAdapter(resolved.connection.protocol).transcribe({ connection: resolved.connection, modelKey: resolved.model?.key,
            stream: delivery.stream, sizeBytes: Number(file.sizeBytes), mimeType: file.mimeType, format: file.format,
            signal: controller.signal, maxResultBytes: resolved.global.maxTranscriptBytes });
          break;
        } catch (error) {
          if (!(error instanceof AudioError && error.code === 'provider_transient_rejection' && attempt < 2) || controller.signal.aborted) throw error;
          await reserveAdditionalProcessing(id, 1, file.durationMs);
        }
      }
      assertAudio(result.segments.every((s) => s.startMs! < file.durationMs), 502, 'provider_timestamps_out_of_bounds');
      result.segments = result.segments.map((segment) => ({ ...segment, endMs: Math.min(segment.endMs!, file.durationMs) }));
      completed.push({ fileId: file.id, language: result.language, segments: result.segments.map((segment) => ({ ...segment,
        startMs: segment.startMs! + file.offsetMs, endMs: segment.endMs! + file.offsetMs,
        fileId: file.id, fileStartMs: segment.startMs, fileEndMs: segment.endMs })) });
      await prisma.$transaction(async (tx) => {
        await tx.transcriptionJob.update({ where: { id }, data: { fileResults: completed as unknown as Prisma.InputJsonValue } });
        await tx.processingUsage.update({ where: { jobId: id }, data: { completedRequests: { increment: 1 }, completedDurationMs: { increment: BigInt(file.durationMs) } } });
      });
    }
    // Generated content is retained as a draft even if authorization changed during the HTTP request.
    // It is never published by the runner; the publish endpoint independently resolves current policy.
    await prisma.$transaction(async (tx) => {
      const current = await tx.transcriptionJob.findUnique({ where: { id } });
      assertAudio(current, 404, 'job_not_found');
      const transcript = await tx.sessionTranscript.findUnique({ where: { recordingId: recording.id } });
      const unchanged = await tx.sessionRecording.findUnique({ where: { id: recording.id } });
      assertAudio(unchanged?.revision === job.recordingRevision, 409, 'recording_revision_conflict');
      await createTranscriptRevision({ recordingId: recording.id, userId: job.userId,
        expectedRevision: transcript?.revision ?? 0, source: 'provider', connectionId: job.connectionId,
        modelId: job.modelId ?? undefined, jobId: id,
        language: new Set(completed.map((r) => r.language).filter(Boolean)).size === 1 ? completed.find((r) => r.language)?.language : null,
        segments: completed.flatMap((r) => r.segments) }, tx);
      await tx.transcriptionJob.update({ where: { id }, data: { status: current.status === 'cancelled' ? 'cancelled' : 'succeeded', completedAt: new Date() } });
      await tx.processingUsage.update({ where: { jobId: id }, data: { status: 'completed' } });
    });
  } catch (error) {
    const job = await prisma.transcriptionJob.findUnique({ where: { id } });
    const code = error instanceof AudioError ? error.code : controller.signal.aborted ? 'cancelled' : 'provider_request_interrupted';
    await prisma.transcriptionJob.updateMany({ where: { id, status: 'running' }, data: { status: controller.signal.aborted ? 'cancelled' : 'failed', failureCode: code } });
    if (job) await prisma.processingUsage.updateMany({ where: { jobId: id }, data: { status: 'failed', failureCode: code } });
  } finally {
    const usage = await prisma.processingUsage.findUnique({ where: { jobId: id } });
    if (usage) await prisma.processingUsage.update({ where: { jobId: id }, data: {
      requestCount: usage.startedRequests, durationMs: usage.startedDurationMs,
      ...(usage.startedRequests === 0 ? { status: 'released' } : {}),
    } });
    active.delete(id);
  }
}
export async function sweepTranscriptionJobs() {
  if (sweeping) return; sweeping = true;
  try {
    for (const [id, controller] of active) {
      const job = await prisma.transcriptionJob.findUnique({ where: { id } });
      if (!job || job.status !== 'running') { controller.abort(); continue; }
      try {
        const resolved = await resolveTranscription({ campaignId: job.campaignId, userId: job.userId, connectionId: job.connectionId, modelId: job.modelId });
        await recordingAccess(resolved.ctx, job.userId, job.recordingId);
        assertAudio(resolved.grant.revision === job.grantRevision, 403, 'provider_policy_changed');
      } catch { controller.abort(); }
    }
    const jobs = await prisma.transcriptionJob.findMany({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' }, take: 25 });
    for (const job of jobs) {
      const connection = await prisma.processingConnection.findUnique({ where: { id: job.connectionId } });
      if (!connection) continue;
      const claimed = await serializable(async (tx) => {
        const running = await tx.transcriptionJob.count({ where: { connectionId: job.connectionId, status: 'running' } });
        if (running >= connection.concurrency) return { count: 0 };
        return tx.transcriptionJob.updateMany({ where: { id: job.id, status: 'queued' }, data: { status: 'running', claimedAt: new Date(), attempts: { increment: 1 } } });
      });
      if (claimed.count) void dispatch(job.id).catch(() => { /* Failures are sanitized inside dispatch; retry on next sweep. */ });
    }
  } finally { sweeping = false; }
}
export async function startTranscriptionRunner() {
  await audioSettings();
  await prisma.transcriptionJob.updateMany({ where: { status: 'running' }, data: { status: 'interrupted', failureCode: 'backend_restarted' } });
  await sweepAudioUploads(true);
  const timer = setInterval(() => { void sweepTranscriptionJobs().catch(() => {}); }, 2000); timer.unref();
  const cleanup = setInterval(() => { void sweepAudioUploads().catch(() => {}); }, 3600000); cleanup.unref();
}
