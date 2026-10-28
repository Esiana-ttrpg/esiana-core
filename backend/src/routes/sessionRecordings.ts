import { Router, json } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AudioError, audioHandler, audioSettings, campaignAudioSettings, assertAudio, capability, jsonSafe, recordingAccess, sessionAccess, serializable } from '../lib/audioCore.js';
import { assetIdempotencyKey, idempotentAssetCreation } from '../lib/assetIdempotency.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { calculateOffsets, fileAtPosition, parseTranscript, RECORDING_VISIBILITIES, type TranscriptSegmentInput } from '../../../shared/sessionAudio.js';
import { createTranscriptRevision } from '../lib/sessionTranscripts.js';
import { resolveTranscription, reserveTranscription, reserveAdditionalProcessing } from '../lib/processingProviders.js';
import { requireTokenScopes } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { cancelTranscription } from '../lib/transcriptionRunner.js';
import { previewAudioTimeline, commitAudioTimeline } from '../lib/audioTimeline.js';

export const sessionRecordingsRouter = Object.assign(Router({ mergeParams: true }), { rateLimitMountPath: '/audio' });
sessionRecordingsRouter.use((req, res, next) => requireTokenScopes([req.method === 'GET' ? 'campaign:read' : 'campaign:write'])(req, res, next));
const access = (req: CampaignScopedRequest) => recordingAccess(req.campaign!, req.user!.id, String(req.params.recordingId));
async function edit(req: CampaignScopedRequest, kind: 'chapters' | 'transcripts' | 'manage') {
  const ctx = req.campaign!, settings = await campaignAudioSettings(ctx.campaignId);
  const recording = await access(req);
  capability(ctx, kind === 'chapters' ? C.AUDIO_CHAPTERS_EDIT : kind === 'transcripts' ? C.AUDIO_TRANSCRIPT_EDIT : C.AUDIO_MANAGE);
  assertAudio(ctx.capabilities.has(C.AUDIO_MANAGE) || (kind === 'chapters' ? settings.allowChapters : settings.allowTranscripts), 403, 'contributions_disabled');
  return recording;
}
const authorizeTranscriptRevision = audioHandler(async (req, _res, next) => {
  await edit(req, 'transcripts');
  next();
});
const parseTranscriptRevision = audioHandler(async (req, res, next) => {
  const global = await audioSettings();
  await new Promise<void>((resolve, reject) => {
    json({ limit: global.maxTranscriptBytes })(req, res, (error) => {
      if (!error) { resolve(); return; }
      const status = typeof error.status === 'number' ? error.status : 400;
      reject(new AudioError(status, status === 413 ? 'transcript_too_large' : 'invalid_transcript'));
    });
  });
  next();
});
sessionRecordingsRouter.get('/sessions/:timelineId/recordings', audioHandler(async (req, res) => {
  const ctx = req.campaign!; await sessionAccess(ctx, String(req.params.timelineId));
  const rows = await prisma.sessionRecording.findMany({ where: { campaignId: ctx.campaignId, timelineId: String(req.params.timelineId) }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
  const visible = [];
  for (const row of rows) {
    try { visible.push(await recordingAccess(ctx, req.user!.id, row.id)); }
    catch (error) { if (!(error instanceof Error && 'status' in error && error.status === 404)) throw error; }
  }
  res.json(jsonSafe(visible));
}));
sessionRecordingsRouter.post('/sessions/:timelineId/recordings', audioHandler(async (req, res) => {
  const ctx = req.campaign!, userId = req.user!.id;
  await sessionAccess(ctx, String(req.params.timelineId)); capability(ctx, C.ASSETS_UPLOAD);
  const [global, settings] = await Promise.all([audioSettings(), campaignAudioSettings(ctx.campaignId)]);
  assertAudio(global.enabled && settings.enabled, 403, 'uploads_disabled');
  assertAudio(ctx.capabilities.has(C.AUDIO_MANAGE) || settings.allowContributors, 403, 'uploads_forbidden');
  const data = z.object({ title: z.string().trim().min(1).max(200), visibility: z.enum(RECORDING_VISIBILITIES).optional(),
    consentAcknowledged: z.literal(true) }).strict().parse(req.body);
  const visibility = data.visibility ?? settings.defaultVisibility;
  assertAudio(visibility !== 'uploader_and_managers' || settings.allowPov, 403, 'pov_disabled');
  assertAudio(visibility !== 'staff' || ctx.capabilities.has(C.NARRATIVE_ELEVATED_VIEW), 403, 'staff_visibility_forbidden');
  const timelineId = String(req.params.timelineId);
  const row = await serializable((tx) => idempotentAssetCreation(tx,
    { campaignId: ctx.campaignId, userId, operation: 'recording.create' }, assetIdempotencyKey(req),
    { timelineId, title: data.title, visibility: data.visibility ?? null, consentAcknowledged: data.consentAcknowledged },
    (id) => tx.sessionRecording.findFirst({ where: { id, campaignId: ctx.campaignId, uploadedByUserId: userId } }),
    () => tx.sessionRecording.create({ data: { campaignId: ctx.campaignId, timelineId,
      uploadedByUserId: userId, title: data.title, visibility, consentAcknowledgedAt: new Date() } })));
  await recordingAccess(ctx, userId, row.id);
  res.status(201).json(jsonSafe(row));
}));
sessionRecordingsRouter.get('/recordings/:recordingId', audioHandler(async (req, res) => res.json(jsonSafe(await access(req)))));
sessionRecordingsRouter.patch('/recordings/:recordingId', audioHandler(async (req, res) => {
  const recording = await edit(req, 'manage');
  const { expectedRevision, ...data } = z.object({ expectedRevision: z.number().int(), title: z.string().trim().min(1).max(200).optional(),
    visibility: z.enum(RECORDING_VISIBILITIES).optional(), isPrimary: z.boolean().optional(), status: z.enum(['ready', 'archived']).optional() }).strict().parse(req.body);
  const settings = await campaignAudioSettings(req.campaign!.campaignId);
  assertAudio(data.visibility !== 'uploader_and_managers' || settings.allowPov, 403, 'pov_disabled');
  await prisma.$transaction(async (tx) => {
    const changed = await tx.sessionRecording.updateMany({ where: { id: recording.id, revision: expectedRevision }, data: { ...data, revision: { increment: 1 } } });
    assertAudio(changed.count, 409, 'recording_revision_conflict');
    if (data.isPrimary) await tx.sessionRecording.updateMany({ where: { timelineId: recording.timelineId, id: { not: recording.id } }, data: { isPrimary: false } });
  });
  res.json(jsonSafe(await access(req)));
}));
sessionRecordingsRouter.delete('/recordings/:recordingId', audioHandler(async (req, res) => {
  const recording = await edit(req, 'manage');
  capability(req.campaign!, C.ASSETS_DELETE_ANY);
  await prisma.sessionRecording.delete({ where: { id: recording.id } });
  res.status(204).end();
}));
const chapterSchema = z.object({ title: z.string().trim().min(1).max(200), startMs: z.number().int().nonnegative(),
  description: z.string().max(10000).nullable().optional(), wikiPageId: z.string().nullable().optional() }).strict();
sessionRecordingsRouter.post('/recordings/:recordingId/timeline/preview', audioHandler(async (req, res) => {
  const recording = await edit(req, 'manage');
  const data = z.object({ fileIds: z.array(z.string()).max(10000) }).strict().parse(req.body);
  const preview = await previewAudioTimeline(recording.id, data.fileIds);
  res.json(jsonSafe({ revision: recording.revision, files: preview.files, affectedChapters: preview.affectedChapters,
    affectedSegments: preview.affectedSegments.map((s) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs })) }));
}));
sessionRecordingsRouter.post('/recordings/:recordingId/timeline/commit', audioHandler(async (req, res) => {
  const recording = await edit(req, 'manage');
  const data = z.object({ expectedRevision: z.number().int(), fileIds: z.array(z.string()).max(10000),
    resolutions: z.record(z.string(), z.object({ fileId: z.string(), startMs: z.number().int().nonnegative(), endMs: z.number().int().nonnegative().optional() }).strict().nullable()) }).strict().parse(req.body);
  res.json(await commitAudioTimeline({ ...data, recordingId: recording.id, userId: req.user!.id }));
}));
sessionRecordingsRouter.patch('/recordings/:recordingId/chapters/:chapterId', audioHandler(async (req, res) => {
  const recording = await edit(req, 'chapters'), data = chapterSchema.parse(req.body);
  if (data.wikiPageId) {
    const page = await prisma.wikiPage.findFirst({ where: { id: data.wikiPageId, campaignId: recording.campaignId } });
    assertAudio(page && (page.visibility === 'Public' || (page.visibility === 'Party' && req.campaign!.capabilities.has(C.WIKI_VIEW_PARTY)) || req.campaign!.capabilities.has(C.NARRATIVE_ELEVATED_VIEW)), 404, 'wiki_page_not_found');
  }
  const anchor = fileAtPosition(recording.files, data.startMs);
  await prisma.$transaction(async (tx) => {
    const changed = await tx.sessionRecording.updateMany({ where: { id: recording.id, revision: recording.revision }, data: { revision: { increment: 1 } } });
    assertAudio(changed.count, 409, 'recording_revision_conflict');
    const updated = await tx.sessionAudioChapter.updateMany({ where: { id: String(req.params.chapterId), recordingId: recording.id }, data: { ...data, ...anchor } });
    assertAudio(updated.count, 404, 'chapter_not_found');
  });
  res.json({ updated: true });
}));
sessionRecordingsRouter.post('/recordings/:recordingId/chapters', audioHandler(async (req, res) => {
  const recording = await edit(req, 'chapters'), data = chapterSchema.parse(req.body);
  if (data.wikiPageId) {
    const page = await prisma.wikiPage.findFirst({ where: { id: data.wikiPageId, campaignId: recording.campaignId } });
    assertAudio(page && (page.visibility === 'Public' || (page.visibility === 'Party' && req.campaign!.capabilities.has(C.WIKI_VIEW_PARTY)) || req.campaign!.capabilities.has(C.NARRATIVE_ELEVATED_VIEW)), 404, 'wiki_page_not_found');
  }
  const anchor = fileAtPosition(recording.files, data.startMs);
  res.status(201).json(await prisma.$transaction(async (tx) => {
    const updated = await tx.sessionRecording.updateMany({ where: { id: recording.id, revision: recording.revision }, data: { revision: { increment: 1 } } });
    assertAudio(updated.count, 409, 'recording_revision_conflict');
    return tx.sessionAudioChapter.create({ data: { ...data, ...anchor, recordingId: recording.id } });
  }));
}));
sessionRecordingsRouter.delete('/recordings/:recordingId/chapters/:chapterId', audioHandler(async (req, res) => {
  const recording = await edit(req, 'chapters');
  await prisma.$transaction(async (tx) => {
    await tx.sessionRecording.update({ where: { id: recording.id }, data: { revision: { increment: 1 } } });
    await tx.sessionAudioChapter.deleteMany({ where: { id: String(req.params.chapterId), recordingId: recording.id } });
  });
  res.status(204).end();
}));
sessionRecordingsRouter.get('/recordings/:recordingId/transcript', audioHandler(async (req, res) => {
  const recording = await access(req);
  if (!recording.transcript) { res.json({ revision: 0, publishedRevisionId: null, revisions: [], current: null }); return; }
  const editor = req.campaign!.capabilities.has(C.AUDIO_TRANSCRIPT_EDIT);
  const revisions = await prisma.sessionTranscriptRevision.findMany({ where: { transcriptId: recording.transcript.id,
    ...(editor ? {} : { id: recording.transcript.publishedRevisionId ?? '__none__' }) }, orderBy: { createdAt: 'desc' },
    select: { id: true, source: true, createdAt: true, language: true } });
  const selected = req.query.revisionId ? String(req.query.revisionId) : revisions[0]?.id;
  assertAudio(!selected || revisions.some((r) => r.id === selected), 404, 'transcript_revision_not_found');
  const current = selected ? await prisma.sessionTranscriptRevision.findUnique({ where: { id: selected }, include: { segments: { orderBy: { order: 'asc' } } } }) : null;
  const merged: TranscriptSegmentInput[] = [];
  for (const segment of current?.segments ?? []) {
    const previous = merged[merged.length - 1];
    if (previous && segment.groupId && segment.groupId === previous.groupId && previous.endMs === segment.startMs &&
      previous.text === segment.text && previous.speaker === segment.speaker) previous.endMs = segment.endMs;
    else merged.push({ ...segment });
  }
  res.json({ revision: recording.transcript.revision, publishedRevisionId: recording.transcript.publishedRevisionId, revisions,
    current: current ? { ...current, segments: merged } : null });
}));
sessionRecordingsRouter.post('/recordings/:recordingId/transcript/revisions', rateLimitPolicy('expensive'), authorizeTranscriptRevision, parseTranscriptRevision, audioHandler(async (req, res) => {
  const recording = await edit(req, 'transcripts');
  const data = z.object({ expectedRevision: z.number().int().nonnegative(), language: z.string().max(40).nullable().optional(),
    sourceJobId: z.string().optional(), baseRevisionId: z.string().optional(),
    text: z.string().optional(), format: z.enum(['txt', 'srt', 'vtt', 'json']).optional(),
    segments: z.array(z.object({ startMs: z.number().int().nullable(), endMs: z.number().int().nullable(), text: z.string(), speaker: z.string().nullable().optional() })).max(100000).optional() }).strict().parse(req.body);
  const global = await audioSettings();
  assertAudio(Buffer.byteLength(JSON.stringify(data)) <= global.maxTranscriptBytes, 413, 'transcript_too_large');
  let segments: TranscriptSegmentInput[];
  try { segments = data.segments ?? parseTranscript(data.text ?? '', data.format ?? 'txt'); }
  catch { throw new (await import('../lib/audioCore.js')).AudioError(400, 'invalid_transcript'); }
  const job = data.sourceJobId ? await prisma.transcriptionJob.findFirst({ where: { id: data.sourceJobId, recordingId: recording.id, campaignId: recording.campaignId } }) : null;
  assertAudio(!data.sourceJobId || job, 404, 'job_not_found');
  const base = data.baseRevisionId ? await prisma.sessionTranscriptRevision.findFirst({ where: { id: data.baseRevisionId, transcriptId: recording.transcript?.id ?? '__none__' } }) : null;
  assertAudio(!data.baseRevisionId || base, 404, 'transcript_revision_not_found');
  const pendingProviderBase = base?.source === 'provider' && base.id !== recording.transcript?.publishedRevisionId ? base : null;
  const result = await prisma.$transaction((tx) => createTranscriptRevision({ recordingId: recording.id, userId: req.user!.id,
    expectedRevision: data.expectedRevision, source: job || pendingProviderBase ? 'provider' : data.segments ? 'manual' : 'import',
    connectionId: job?.connectionId ?? pendingProviderBase?.providerConnectionId ?? undefined,
    modelId: job?.modelId ?? pendingProviderBase?.providerModelId ?? undefined,
    jobId: job?.id ?? pendingProviderBase?.sourceJobId ?? undefined, language: data.language, segments }, tx));
  res.status(201).json(result);
}));
sessionRecordingsRouter.post('/recordings/:recordingId/transcript/publish', audioHandler(async (req, res) => {
  const recording = await edit(req, 'transcripts'); capability(req.campaign!, C.AUDIO_TRANSCRIPT_PUBLISH);
  const data = z.object({ revisionId: z.string(), expectedRevision: z.number().int() }).strict().parse(req.body);
  const revision = await prisma.sessionTranscriptRevision.findFirst({ where: { id: data.revisionId, transcriptId: recording.transcript?.id ?? '__none__' } });
  assertAudio(revision, 404, 'transcript_revision_not_found');
  if (revision.source === 'provider') await resolveTranscription({ ctx: req.campaign!, campaignId: recording.campaignId,
    userId: req.user!.id, connectionId: revision.providerConnectionId!, modelId: revision.providerModelId });
  const updated = await prisma.sessionTranscript.updateMany({ where: { id: revision.transcriptId, revision: data.expectedRevision },
    data: { publishedRevisionId: revision.id, revision: { increment: 1 } } });
  assertAudio(updated.count, 409, 'transcript_revision_conflict'); res.json({ publishedRevisionId: revision.id });
}));
sessionRecordingsRouter.post('/recordings/:recordingId/transcription', rateLimitPolicy('expensive'), audioHandler(async (req, res) => {
  const recording = await access(req);
  const data = z.object({ connectionId: z.string().optional(), modelId: z.string().nullable().optional() }).strict().parse(req.body);
  const job = await reserveTranscription({ campaignId: recording.campaignId, userId: req.user!.id, recordingId: recording.id, ...data });
  res.status(202).json(jsonSafe(job));
}));
sessionRecordingsRouter.get('/recordings/:recordingId/jobs', audioHandler(async (req, res) => {
  const recording = await access(req);
  assertAudio(req.campaign!.capabilities.has(C.AUDIO_TRANSCRIPT_EDIT) || req.campaign!.capabilities.has(C.AUDIO_TRANSCRIBE), 403, 'operation_forbidden');
  const jobs = await prisma.transcriptionJob.findMany({ where: { recordingId: recording.id, campaignId: recording.campaignId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(jobs.map(({ fileResults: _results, ...job }) => job));
}));
sessionRecordingsRouter.get('/recordings/:recordingId/jobs/:jobId/result', audioHandler(async (req, res) => {
  const recording = await access(req); capability(req.campaign!, C.AUDIO_TRANSCRIPT_EDIT);
  const job = await prisma.transcriptionJob.findFirst({ where: { id: String(req.params.jobId), recordingId: recording.id, campaignId: recording.campaignId } });
  assertAudio(job, 404, 'job_not_found');
  const results = Array.isArray(job.fileResults) ? job.fileResults as unknown as { fileId: string; segments: TranscriptSegmentInput[] }[] : [];
  const segments = results.flatMap((result) => {
    const file = recording.files.find((f) => f.id === result.fileId);
    return result.segments.map((segment) => file && segment.fileStartMs != null && segment.fileEndMs != null && segment.fileEndMs <= file.durationMs ?
      { text: segment.text, speaker: segment.speaker, startMs: file.offsetMs + segment.fileStartMs, endMs: file.offsetMs + segment.fileEndMs } :
      { text: segment.text, speaker: segment.speaker, startMs: null, endMs: null });
  });
  res.json({ sourceJobId: job.id, requiresReview: true, originalRecordingRevision: job.recordingRevision,
    currentRecordingRevision: recording.revision, segments });
}));
sessionRecordingsRouter.post('/recordings/:recordingId/jobs/:jobId/cancel', audioHandler(async (req, res) => {
  const recording = await access(req); capability(req.campaign!, C.AUDIO_TRANSCRIBE);
  await prisma.transcriptionJob.updateMany({ where: { id: String(req.params.jobId), recordingId: recording.id, status: { in: ['queued', 'running'] } }, data: { status: 'cancelled', failureCode: 'cancelled' } });
  cancelTranscription(String(req.params.jobId));
  const cancelled = await prisma.transcriptionJob.findFirst({ where: { id: String(req.params.jobId), recordingId: recording.id, status: 'cancelled' } });
  if (cancelled) {
    const usage = await prisma.processingUsage.findUnique({ where: { jobId: cancelled.id } });
    if (usage?.startedRequests === 0) await prisma.processingUsage.update({ where: { jobId: cancelled.id }, data: { status: 'released', requestCount: 0, durationMs: 0n } });
  }
  res.json({ status: 'cancelled' });
}));
sessionRecordingsRouter.post('/recordings/:recordingId/jobs/:jobId/retry', rateLimitPolicy('expensive'), audioHandler(async (req, res) => {
  const recording = await access(req); capability(req.campaign!, C.AUDIO_TRANSCRIBE);
  const job = await prisma.transcriptionJob.findFirst({ where: { id: String(req.params.jobId), recordingId: recording.id,
    campaignId: recording.campaignId, status: { in: ['failed', 'interrupted', 'cancelled'] } } });
  assertAudio(job && recording.revision === job.recordingRevision, 409, 'job_cannot_retry');
  const resolved = await resolveTranscription({ ctx: req.campaign!, campaignId: recording.campaignId, userId: req.user!.id,
    connectionId: job.connectionId, modelId: job.modelId });
  const completed = Array.isArray(job.fileResults) ? job.fileResults as unknown as { fileId: string }[] : [];
  const remaining = recording.files.filter((file) => !completed.some((result) => result.fileId === file.id));
  await reserveAdditionalProcessing(job.id, remaining.length, remaining.reduce((sum, file) => sum + file.durationMs, 0));
  res.json(await prisma.transcriptionJob.update({ where: { id: job.id }, data: { status: 'queued', failureCode: null,
    userId: req.user!.id, grantRevision: resolved.grant.revision } }));
}));
