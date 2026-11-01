import { prisma } from './prisma.js';
import { jsonSafe, assertAudio } from './audioCore.js';
import type { Prisma } from './prismaClient.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { resolveDriverForPointer } from './storage/storagePointer.js';
import { getActiveStorageDriver } from './storage/storageRegistry.js';
import { buildAssetLocation } from './assetLocation.js';
import { AUDIO_FORMATS } from '../../../shared/sessionAudio.js';
export async function buildSessionAudioBackup(campaignId: string) {
  const [recordings, settings] = await Promise.all([
    prisma.sessionRecording.findMany({ where: { campaignId }, include: { timeline: { select: { wikiPageId: true, sequenceOrder: true } },
      files: { orderBy: { order: 'asc' }, include: { asset: { select: { uploadedByUserId: true } } } }, chapters: true, transcript: { include: { revisions: { include: { segments: true } } } } } }),
    prisma.campaignAudioSettings.findUnique({ where: { campaignId } }),
  ]);
  return jsonSafe({ version: 1, recordings, settings: settings ? { ...settings, defaultConnectionId: null, defaultModelId: null,
    transcriptionEnabled: false } : null });
}
const segment = z.object({ id: z.string(), order: z.number().int(), startMs: z.number().int().nullable(), endMs: z.number().int().nullable(),
  text: z.string(), speaker: z.string().nullable(), groupId: z.string().nullable().optional(), fileId: z.string().nullable(), fileStartMs: z.number().int().nullable(), fileEndMs: z.number().int().nullable() });
const settingsSchema = z.object({ enabled: z.boolean(),
  allowContributors: z.boolean().optional(), allowChapters: z.boolean().optional(), allowTranscripts: z.boolean().optional(),
  allowPov: z.boolean(), defaultVisibility: z.enum(['campaign', 'staff', 'uploader_and_managers']), maxStorageBytes: z.string().regex(/^\d+$/).nullable(),
  monthlyRequests: z.number().int().nonnegative().nullable(), monthlyDurationMs: z.string().regex(/^\d+$/).nullable() })
  .transform(({ allowContributors: _allowContributors, allowChapters: _allowChapters, allowTranscripts: _allowTranscripts, ...rest }) => rest);
const schema = z.object({ version: z.literal(1), settings: settingsSchema.nullable().optional(), recordings: z.array(z.object({ id: z.string(), title: z.string(), uploadedByUserId: z.string(),
  visibility: z.enum(['campaign', 'staff', 'uploader_and_managers']), status: z.string(), durationMs: z.number().int().nonnegative(), isPrimary: z.boolean(),
  consentAcknowledgedAt: z.string().datetime().nullable().optional(),
  timeline: z.object({ wikiPageId: z.string(), sequenceOrder: z.number().int() }),
  files: z.array(z.object({ id: z.string(), assetId: z.string(), name: z.string(), order: z.number().int(), durationMs: z.number().int().positive(),
    offsetMs: z.number().int().nonnegative(), sizeBytes: z.string().regex(/^\d+$/), format: z.string(), mimeType: z.string(),
    asset: z.object({ uploadedByUserId: z.string().nullable() }).optional() })),
  chapters: z.array(z.object({ title: z.string(), description: z.string().nullable(), startMs: z.number().int(), fileId: z.string(), fileStartMs: z.number().int(), wikiPageId: z.string().nullable() })),
  transcript: z.object({ publishedRevisionId: z.string().nullable(), revision: z.number().int(), revisions: z.array(z.object({
    id: z.string(), source: z.string(), language: z.string().nullable(), createdByUserId: z.string(), createdAt: z.string(),
    providerConnectionId: z.string().nullable(), providerModelId: z.string().nullable(), segments: z.array(segment),
  })) }).nullable(),
})).max(100000) });
export async function restoreSessionAudioBackup(campaignId: string, raw: unknown) {
  const payload = schema.parse(raw);
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  assertAudio(campaign, 404, 'campaign_not_found');
  for (const source of payload.recordings) {
    const page = await prisma.wikiPage.findFirst({ where: { id: source.timeline.wikiPageId, campaignId } });
    if (!page) continue;
    await prisma.$transaction(async (tx) => {
      const timeline = await tx.campaignSessionTimeline.upsert({ where: { wikiPageId: page.id },
        create: { campaignId, wikiPageId: page.id, authorId: campaign.campaignOwnerUserId, sequenceOrder: source.timeline.sequenceOrder }, update: {} });
      assertAudio(timeline.campaignId === campaignId, 403, 'cross_campaign_restore_forbidden');
      const recording = await tx.sessionRecording.create({ data: { campaignId, timelineId: timeline.id, title: source.title,
        uploadedByUserId: source.uploadedByUserId, visibility: source.visibility, status: source.status,
        durationMs: source.durationMs, isPrimary: source.isPrimary,
        consentAcknowledgedAt: source.consentAcknowledgedAt ? new Date(source.consentAcknowledgedAt) : null } });
      const fileIds = new Map<string, string>();
      for (const file of source.files) {
        let asset = await tx.asset.findFirst({ where: { id: file.assetId, campaignId, type: 'SessionAudio' } });
        if (!asset) asset = await tx.asset.create({ data: { campaignId, type: 'SessionAudio', sizeBytes: 0n,
          url: `/uploads/missing-${randomUUID()}.${file.format.replace(/[^a-z0-9]/gi, '')}` } });
        const { id, asset: sourceAsset, ...data } = file;
        if (sourceAsset?.uploadedByUserId && await tx.user.count({ where: { id: sourceAsset.uploadedByUserId } }))
          await tx.asset.update({ where: { id: asset.id }, data: { uploadedByUserId: sourceAsset.uploadedByUserId } });
        const copied = await tx.sessionRecordingFile.create({ data: { ...data, assetId: asset.id, recordingId: recording.id, sizeBytes: BigInt(file.sizeBytes) } });
        fileIds.set(id, copied.id);
      }
      for (const chapter of source.chapters) {
        const fileId = fileIds.get(chapter.fileId); if (!fileId) continue;
        const link = chapter.wikiPageId ? await tx.wikiPage.findFirst({ where: { id: chapter.wikiPageId, campaignId } }) : null;
        await tx.sessionAudioChapter.create({ data: { ...chapter, fileId, recordingId: recording.id, wikiPageId: link?.id ?? null } });
      }
      if (source.transcript) {
        const transcript = await tx.sessionTranscript.create({ data: { recordingId: recording.id, revision: source.transcript.revision } });
        for (const revision of source.transcript.revisions) {
          const copied = await tx.sessionTranscriptRevision.create({ data: { transcriptId: transcript.id, source: revision.source,
            language: revision.language, createdByUserId: revision.createdByUserId, createdAt: new Date(revision.createdAt),
            providerConnectionId: revision.providerConnectionId, providerModelId: revision.providerModelId,
            segments: { create: revision.segments.map(({ id: _id, ...s }) => ({ ...s, fileId: s.fileId ? fileIds.get(s.fileId) ?? null : null })) } } });
          if (revision.id === source.transcript.publishedRevisionId) await tx.sessionTranscript.update({ where: { id: transcript.id }, data: { publishedRevisionId: copied.id } });
        }
      }
    });
  }
  if (payload.settings) {
    const { maxStorageBytes, monthlyDurationMs, ...rest } = payload.settings;
    const data = { ...rest, maxStorageBytes: maxStorageBytes === null ? null : BigInt(maxStorageBytes),
      monthlyDurationMs: monthlyDurationMs === null ? null : BigInt(monthlyDurationMs), transcriptionEnabled: false,
      defaultConnectionId: null, defaultModelId: null };
    await prisma.campaignAudioSettings.upsert({ where: { campaignId }, create: { campaignId, ...data }, update: data });
  }
}

export async function preflightSessionAudioClone(sourceCampaignId: string) {
  const payload = schema.parse(await buildSessionAudioBackup(sourceCampaignId));
  assertAudio(getActiveStorageDriver().rangeRead, 503, 'storage_does_not_support_protected_ranges');
  const ids = [...new Set(payload.recordings.flatMap((recording) => recording.files.map((file) => file.assetId)))];
  const assets = new Map((await prisma.asset.findMany({ where: { campaignId: sourceCampaignId, id: { in: ids } } })).map((asset) => [asset.id, asset]));
  const checked = new Set<string>();
  for (const recording of payload.recordings) for (const file of recording.files) {
    assertAudio(AUDIO_FORMATS.some((format) => format === file.format), 400, 'unsupported_audio_content');
    if (checked.has(file.assetId)) continue;
    const asset = assets.get(file.assetId);
    const source = asset ? resolveDriverForPointer(asset.url) : null;
    assertAudio(source, 404, 'media_missing');
    assertAudio(source.driver.rangeRead, 503, 'storage_does_not_support_protected_ranges');
    assertAudio(await source.driver.exists(source.key), 404, 'media_missing');
    const delivery = await source.driver.openRead({ key: source.key, requireStream: true });
    assertAudio(delivery.type === 'stream', 503, 'protected_stream_required');
    try {
      let readable = false;
      for await (const chunk of delivery.stream) { readable = chunk.length > 0; if (readable) break; }
      assertAudio(readable, 404, 'media_missing');
    } finally { delivery.stream.destroy(); }
    checked.add(file.assetId);
  }
  return payload;
}

export async function cloneSessionAudio(sourceCampaignId: string, campaignId: string, pageIds: Map<string, string>, prepared?: Awaited<ReturnType<typeof preflightSessionAudioClone>>) {
  const payload = schema.parse(prepared ?? await preflightSessionAudioClone(sourceCampaignId));
  const assetIds = new Map<string, string>();
  const driver = getActiveStorageDriver();
  for (const recording of payload.recordings) {
    const targetPage = pageIds.get(recording.timeline.wikiPageId);
    assertAudio(targetPage, 409, 'session_page_not_cloned');
    recording.timeline.wikiPageId = targetPage;
    for (const file of recording.files) {
      if (!assetIds.has(file.assetId)) {
        const asset = await prisma.asset.findFirst({ where: { id: file.assetId, campaignId: sourceCampaignId } });
        const source = asset ? resolveDriverForPointer(asset.url) : null;
        assertAudio(source, 404, 'media_missing');
        const delivery = await source.driver.openRead({ key: source.key, requireStream: true });
        assertAudio(delivery.type === 'stream', 503, 'protected_stream_required');
        const key = `${randomUUID()}.${file.format}`;
        try {
          await driver.put({ key, body: delivery.stream, mimeType: file.mimeType });
          const location = buildAssetLocation({ original: key }, driver);
          const copied = await prisma.asset.create({ data: { campaignId, url: location.urls.originalUrl,
            type: 'SessionAudio', sizeBytes: BigInt(file.sizeBytes), uploadedByUserId: asset!.uploadedByUserId } });
          assetIds.set(file.assetId, copied.id);
        } catch (error) {
          await driver.delete(key).catch(() => {});
          throw error;
        } finally { delivery.stream.destroy(); }
      }
      file.assetId = assetIds.get(file.assetId)!;
    }
    for (const chapter of recording.chapters) chapter.wikiPageId = chapter.wikiPageId ? pageIds.get(chapter.wikiPageId) ?? null : null;
  }
  await restoreSessionAudioBackup(campaignId, payload);
}
