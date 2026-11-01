import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseFile } from 'music-metadata';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import { assertAudio, audioSettings, campaignAudioSettings, recordingAccess, serializable } from './audioCore.js';
import { getActiveStorageDriver } from './storage/storageRegistry.js';
import { buildAssetLocation } from './assetLocation.js';
import { resolveDriverForPointer } from './storage/storagePointer.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { canUploadSessionAudio } from '../../../shared/campaignPolicy/audioContributorMigration.js';
import type { CampaignContext } from '../types/api.js';
import { readBackupManifest } from './stagedBackupZip.js';
import { CAMPAIGN_BACKUP_FORMAT } from './campaignExport/types.js';
import { idempotentAssetCreation } from './assetIdempotency.js';

export function stagingPath(id: string) {
  assertAudio(/^[a-zA-Z0-9_-]+$/.test(id), 400, 'invalid_upload_id');
  return path.join(env.uploadsDir, '.audio-staging', id);
}
export async function validateMedia(filePath: string) {
  const handle = await fs.promises.open(filePath, 'r');
  const header = Buffer.alloc(64);
  try { await handle.read(header, 0, 64, 0); } finally { await handle.close(); }
  const ascii = header.toString('latin1');
  let format = '', mimeType = '';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') { format = 'wav'; mimeType = 'audio/wav'; }
  else if (ascii.startsWith('fLaC')) { format = 'flac'; mimeType = 'audio/flac'; }
  else if (ascii.startsWith('OggS')) { format = ascii.includes('OpusHead') ? 'opus' : 'ogg'; mimeType = 'audio/ogg'; }
  else if (ascii.slice(4, 8) === 'ftyp') { format = 'm4a'; mimeType = 'audio/mp4'; }
  else if (ascii.startsWith('ID3') || (header[0] === 255 && (header[1] & 0xe0) === 0xe0)) {
    const aac = !ascii.startsWith('ID3') && (header[1] & 0xf6) === 0xf0;
    format = aac ? 'aac' : 'mp3'; mimeType = aac ? 'audio/aac' : 'audio/mpeg';
  }
  assertAudio(format, 400, 'unsupported_audio_content');
  let metadata;
  try { metadata = await parseFile(filePath, { duration: true, skipCovers: true, skipPostHeaders: true }); }
  catch { assertAudio(false, 400, 'invalid_audio_content'); }
  const durationMs = Math.round((metadata!.format.duration ?? 0) * 1000);
  assertAudio(Number.isSafeInteger(durationMs) && durationMs > 0 && durationMs < 2147483647 && !metadata!.format.hasVideo, 400, 'invalid_audio_duration');
  return { format, mimeType, durationMs };
}
export async function createAudioUpload(ctx: CampaignContext, userId: string, recordingId: string, name: string, sizeBytes: bigint, idempotencyKey?: string) {
  const recording = await recordingAccess(ctx, userId, recordingId);
  const [global, settings] = await Promise.all([audioSettings(), campaignAudioSettings(ctx.campaignId)]);
  assertAudio(global.enabled && settings.enabled, 403, 'uploads_disabled');
  assertAudio(
    canUploadSessionAudio(ctx.capabilities, { recordingOwner: recording.uploadedByUserId === userId }),
    403,
    'upload_forbidden',
  );
  assertAudio(sizeBytes > 0n && sizeBytes <= global.maxFileBytes, 413, 'file_limit_exceeded');
  const driver = getActiveStorageDriver(); assertAudio(driver.rangeRead, 503, 'storage_does_not_support_protected_ranges');
  return serializable(async (tx) => {
    return idempotentAssetCreation(tx, { campaignId: ctx.campaignId, userId, operation: 'asset_upload.create' }, idempotencyKey,
      { purpose: 'session_audio', recordingId, name, sizeBytes: String(sizeBytes) },
      (id) => tx.assetUploadSession.findFirst({ where: { id, campaignId: ctx.campaignId, userId } }), async () => {
    const active = { status: { in: ['uploading', 'appending', 'finalizing'] } };
    const concurrency = await tx.assetUploadSession.count({ where: { userId, ...active } });
    assertAudio(concurrency < global.uploadConcurrency, 429, 'upload_concurrency_exceeded');
    const sumBytes = { _sum: { sizeBytes: true as const } };
    const audioUploads = { ...active, purpose: 'session_audio' };
    const [globalAssets, campaignAssets, globalUploads, campaignUploads, sessionFiles, sessionUploads] = await Promise.all([
      tx.asset.aggregate({ ...sumBytes, where: { type: 'SessionAudio' } }),
      tx.asset.aggregate({ ...sumBytes, where: { type: 'SessionAudio', campaignId: ctx.campaignId } }),
      tx.assetUploadSession.aggregate({ ...sumBytes, where: audioUploads }),
      tx.assetUploadSession.aggregate({ ...sumBytes, where: { ...audioUploads, campaignId: ctx.campaignId } }),
      tx.sessionRecordingFile.aggregate({ ...sumBytes, where: { recording: { campaignId: ctx.campaignId, timelineId: recording.timelineId } } }),
      tx.assetUploadSession.aggregate({ ...sumBytes, where: { ...audioUploads, campaignId: ctx.campaignId, recording: { timelineId: recording.timelineId } } }),
    ]);
    const total = sizeBytes + (globalAssets._sum.sizeBytes ?? 0n) + (globalUploads._sum.sizeBytes ?? 0n);
    const campaign = sizeBytes + (campaignAssets._sum.sizeBytes ?? 0n) + (campaignUploads._sum.sizeBytes ?? 0n);
    const session = sizeBytes + (sessionFiles._sum.sizeBytes ?? 0n) + (sessionUploads._sum.sizeBytes ?? 0n);
    const limit = settings.maxStorageBytes && settings.maxStorageBytes < global.maxCampaignBytes ? settings.maxStorageBytes : global.maxCampaignBytes;
    assertAudio(campaign <= limit && session <= global.maxSessionBytes && (!global.maxGlobalBytes || total <= global.maxGlobalBytes), 413, 'storage_quota_exceeded');
    return tx.assetUploadSession.create({ data: { campaignId: ctx.campaignId, recordingId, userId, name, sizeBytes,
      expiresAt: new Date(Date.now() + 72 * 3600000) } });
    });
  });
}
export async function finalizeAudioUpload(id: string) {
  const upload = await prisma.assetUploadSession.findUnique({ where: { id } });
  assertAudio(upload, 404, 'upload_not_found');
  assertAudio(upload.recordingId && upload.purpose === 'session_audio', 400, 'recording_upload_required');
  const recordingId = upload.recordingId;
  if (upload.status === 'complete') return prisma.sessionRecordingFile.findUnique({ where: { id: upload.fileId! } });
  assertAudio(upload.offsetBytes === upload.sizeBytes, 409, 'upload_incomplete');
  const claimed = await prisma.assetUploadSession.updateMany({ where: { id, status: 'uploading' }, data: { status: 'finalizing' } });
  assertAudio(claimed.count, 409, 'upload_busy');
  const driver = getActiveStorageDriver(); let key: string | undefined;
  try {
    const media = await validateMedia(stagingPath(id)), global = await audioSettings();
    assertAudio(Array.isArray(global.allowedFormats) && global.allowedFormats.includes(media.format), 400, 'format_disabled');
    key = `${randomUUID()}.${media.format}`;
    const pendingLocation = buildAssetLocation({ original: key }, driver);
    await prisma.assetUploadSession.update({ where: { id }, data: { pendingStorageUrl: pendingLocation.urls.originalUrl } });
    await driver.put({ key, body: fs.createReadStream(stagingPath(id)), mimeType: media.mimeType });
    const result = await serializable(async (tx) => {
      const current = await tx.assetUploadSession.findUnique({ where: { id } });
      assertAudio(current?.status === 'finalizing', 409, 'upload_cancelled');
      const recording = await tx.sessionRecording.findUnique({ where: { id: recordingId }, include: { files: true } });
      assertAudio(recording && recording.durationMs + media.durationMs < 2147483647, 409, 'recording_unavailable');
      const location = buildAssetLocation({ original: key! }, driver);
      const asset = await tx.asset.create({ data: { campaignId: upload.campaignId, type: 'SessionAudio', sizeBytes: upload.sizeBytes, url: location.urls.originalUrl, uploadedByUserId: upload.userId } });
      const file = await tx.sessionRecordingFile.create({ data: { recordingId, assetId: asset.id,
        name: upload.name, order: recording.files.length, offsetMs: recording.durationMs, sizeBytes: upload.sizeBytes, ...media } });
      await tx.sessionRecording.update({ where: { id: recording.id }, data: { status: 'ready', durationMs: { increment: media.durationMs }, revision: { increment: 1 } } });
      await tx.assetUploadSession.update({ where: { id }, data: { status: 'complete', fileId: file.id, pendingStorageUrl: null } });
      return file;
    });
    await fs.promises.unlink(stagingPath(id)).catch(() => {});
    return result;
  } catch (error) {
    if (key) await driver.delete(key).catch(() => {});
    await prisma.assetUploadSession.updateMany({ where: { id, status: 'finalizing' }, data: { status: 'uploading', pendingStorageUrl: null } });
    throw error;
  }
}

/** The same persistent upload protocol supports large backup archives, independently of audio opt-in. */
export async function createBackupUpload(ctx: CampaignContext, userId: string, name: string, sizeBytes: bigint, idempotencyKey?: string) {
  assertAudio(ctx.capabilities.has(C.CAMPAIGN_SETTINGS_EDIT) && ctx.capabilities.has(C.ASSETS_UPLOAD), 403, 'backup_upload_forbidden');
  const global = await audioSettings();
  assertAudio(sizeBytes > 0n && sizeBytes <= global.maxCampaignBytes + 536870912n, 413, 'backup_upload_limit_exceeded');
  return serializable(async (tx) => {
    return idempotentAssetCreation(tx, { campaignId: ctx.campaignId, userId, operation: 'asset_upload.create' }, idempotencyKey,
      { purpose: 'campaign_backup', recordingId: null, name, sizeBytes: String(sizeBytes) },
      (id) => tx.assetUploadSession.findFirst({ where: { id, campaignId: ctx.campaignId, userId } }), async () => {
    const active = await tx.assetUploadSession.count({ where: { userId, status: { in: ['uploading', 'appending', 'finalizing'] } } });
    assertAudio(active < global.uploadConcurrency, 429, 'upload_concurrency_exceeded');
    return tx.assetUploadSession.create({ data: { campaignId: ctx.campaignId, userId, name, sizeBytes,
      purpose: 'campaign_backup', expiresAt: new Date(Date.now() + 72 * 3600000) } });
    });
  });
}
export async function finalizeBackupUpload(id: string) {
  const upload = await prisma.assetUploadSession.findUnique({ where: { id } });
  assertAudio(upload?.purpose === 'campaign_backup', 404, 'backup_upload_not_found');
  assertAudio(upload.status !== 'consumed', 410, 'backup_upload_consumed');
  if (upload.status === 'complete') return { assetId: upload.assetId };
  assertAudio(upload.offsetBytes === upload.sizeBytes, 409, 'upload_incomplete');
  const claim = await prisma.assetUploadSession.updateMany({ where: { id, status: 'uploading' }, data: { status: 'finalizing' } });
  assertAudio(claim.count, 409, 'upload_busy');
  const destination = `campaign-${upload.campaignId}-backup-${randomUUID()}.zip`;
  const destinationPath = path.join(env.uploadsDir, destination);
  try {
    const manifest = await readBackupManifest(stagingPath(id));
    assertAudio(manifest.format === CAMPAIGN_BACKUP_FORMAT, 400, 'invalid_campaign_backup');
    await prisma.assetUploadSession.update({ where: { id }, data: { pendingStorageUrl: `/uploads/${destination}` } });
    await fs.promises.rename(stagingPath(id), destinationPath);
    const asset = await prisma.$transaction(async (tx) => {
      const current = await tx.assetUploadSession.findUnique({ where: { id } }); assertAudio(current?.status === 'finalizing', 409, 'upload_cancelled');
      const created = await tx.asset.create({ data: { campaignId: upload.campaignId, type: 'campaign-backup-zip',
        url: `/uploads/${destination}`, uploadedByUserId: upload.userId, sizeBytes: upload.sizeBytes, expiresAt: upload.expiresAt } });
      await tx.assetUploadSession.update({ where: { id }, data: { status: 'complete', assetId: created.id, pendingStorageUrl: null } });
      return created;
    });
    return { assetId: asset.id };
  } catch (error) {
    if (fs.existsSync(destinationPath)) await fs.promises.rename(destinationPath, stagingPath(id)).catch(() => {});
    await prisma.assetUploadSession.updateMany({ where: { id, status: 'finalizing' }, data: { status: 'uploading', pendingStorageUrl: null } });
    throw error;
  }
}
export async function sweepAudioUploads(recover = false) {
  await prisma.assetOperationIdempotency.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  if (recover) {
    const interrupted = await prisma.assetUploadSession.findMany({ where: { status: { in: ['appending', 'finalizing'] } } });
    for (const upload of interrupted) {
      if (upload.pendingStorageUrl && !await prisma.asset.count({ where: { url: upload.pendingStorageUrl } })) {
        const storage = resolveDriverForPointer(upload.pendingStorageUrl);
        if (storage) await storage.driver.delete(storage.key);
      }
      await prisma.assetUploadSession.update({ where: { id: upload.id }, data: { status: 'uploading', pendingStorageUrl: null } });
    }
  }
  const expired = await prisma.assetUploadSession.findMany({ where: { expiresAt: { lt: new Date() }, status: { in: ['uploading', 'failed', 'cancelled'] } } });
  for (const upload of expired) {
    if (upload.pendingStorageUrl && !await prisma.asset.count({ where: { url: upload.pendingStorageUrl } })) {
      const storage = resolveDriverForPointer(upload.pendingStorageUrl); if (storage) await storage.driver.delete(storage.key);
    }
    await fs.promises.unlink(stagingPath(upload.id)).catch(() => {});
    await prisma.assetUploadSession.update({ where: { id: upload.id }, data: { status: 'expired' } });
  }
}
