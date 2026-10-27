import { Router, raw } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audioHandler, assertAudio, jsonSafe, recordingAccess, campaignAudioSettings } from '../lib/audioCore.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { createAudioUpload, finalizeAudioUpload, createBackupUpload, finalizeBackupUpload, stagingPath } from '../lib/audioUploads.js';
import { requireTokenScopes } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { assetIdempotencyKey } from '../lib/assetIdempotency.js';
export const audioUploadsRouter = Object.assign(Router({ mergeParams: true }), { rateLimitMountPath: '/asset-uploads' });
audioUploadsRouter.use((req, res, next) => requireTokenScopes([req.method === 'GET' ? 'campaign:read' : 'campaign:write'])(req, res, next));
async function load(req: CampaignScopedRequest) {
  const row = await prisma.assetUploadSession.findFirst({ where: { id: String(req.params.uploadId), campaignId: req.campaign!.campaignId, userId: req.user!.id } });
  assertAudio(row, 404, 'upload_not_found');
  const recording = row.recordingId ? await recordingAccess(req.campaign!, req.user!.id, row.recordingId) : null;
  if (row.purpose === 'campaign_backup') assertAudio(req.campaign!.capabilities.has(C.CAMPAIGN_SETTINGS_EDIT), 403, 'backup_upload_forbidden');
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const settings = await campaignAudioSettings(row.campaignId), caps = req.campaign!.capabilities;
    assertAudio(caps.has(C.ASSETS_UPLOAD) && (row.purpose === 'campaign_backup' || caps.has(C.AUDIO_MANAGE) || (settings.allowContributors && recording?.uploadedByUserId === req.user!.id)), 403, 'upload_forbidden');
  }
  assertAudio(row.expiresAt > new Date(), 410, 'upload_expired');
  return row;
}
audioUploadsRouter.post('/', rateLimitPolicy('expensive'), audioHandler(async (req, res) => {
  const data = z.object({ purpose: z.enum(['session_audio', 'campaign_backup']).default('session_audio'), recordingId: z.string().optional(), name: z.string().min(1).max(255), sizeBytes: z.string().regex(/^\d+$/) }).strict().parse(req.body);
  const key = assetIdempotencyKey(req);
  if (data.purpose === 'campaign_backup') { res.status(201).json(jsonSafe(await createBackupUpload(req.campaign!, req.user!.id, path.basename(data.name), BigInt(data.sizeBytes), key))); return; }
  assertAudio(data.recordingId, 400, 'recording_required');
  res.status(201).json(jsonSafe(await createAudioUpload(req.campaign!, req.user!.id, data.recordingId, path.basename(data.name), BigInt(data.sizeBytes), key)));
}));
audioUploadsRouter.get('/:uploadId', audioHandler(async (req, res) => res.json(jsonSafe(await load(req)))));
audioUploadsRouter.patch('/:uploadId', raw({ type: 'application/octet-stream', limit: '8mb' }), audioHandler(async (req, res) => {
  const row = await load(req), offset = String(req.headers['upload-offset'] ?? '');
  assertAudio(/^\d+$/.test(offset) && BigInt(offset) === row.offsetBytes, 409, 'upload_offset_conflict');
  assertAudio(Buffer.isBuffer(req.body) && req.body.length > 0 && row.offsetBytes + BigInt(req.body.length) <= row.sizeBytes, 400, 'invalid_chunk');
  const claimed = await prisma.assetUploadSession.updateMany({ where: { id: row.id, status: 'uploading', offsetBytes: row.offsetBytes }, data: { status: 'appending' } });
  assertAudio(claimed.count, 409, 'upload_busy');
  try {
    const filePath = stagingPath(row.id); await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const file = await fs.promises.open(filePath, row.offsetBytes === 0n ? 'w' : 'r+');
    try {
      await file.truncate(Number(row.offsetBytes));
      let written = 0;
      while (written < req.body.length) written += (await file.write(req.body, written, req.body.length - written, Number(row.offsetBytes) + written)).bytesWritten;
      await file.sync();
    } finally { await file.close(); }
    const updated = await prisma.assetUploadSession.updateMany({ where: { id: row.id, status: 'appending' },
      data: { status: 'uploading', offsetBytes: row.offsetBytes + BigInt(req.body.length) } });
    assertAudio(updated.count, 409, 'upload_cancelled');
    res.json({ offsetBytes: String(row.offsetBytes + BigInt(req.body.length)) });
  } finally { await prisma.assetUploadSession.updateMany({ where: { id: row.id, status: 'appending' }, data: { status: 'uploading' } }); }
}));
audioUploadsRouter.post('/:uploadId/finalize', rateLimitPolicy('expensive'), audioHandler(async (req, res) => {
  const row = await load(req); res.json(jsonSafe(row.purpose === 'campaign_backup' ? await finalizeBackupUpload(row.id) : await finalizeAudioUpload(row.id)));
}));
audioUploadsRouter.delete('/:uploadId', audioHandler(async (req, res) => {
  const row = await load(req);
  assertAudio(!['complete', 'restoring', 'consumed'].includes(row.status), 409, 'upload_already_complete');
  await prisma.assetUploadSession.update({ where: { id: row.id }, data: { status: 'cancelled' } });
  await fs.promises.unlink(stagingPath(row.id)).catch(() => {}); res.status(204).end();
}));
