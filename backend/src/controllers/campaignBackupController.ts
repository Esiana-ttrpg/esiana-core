import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import JSZip from 'jszip';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { buildSovereignExport } from '../lib/campaignExport/buildSovereignExport.js';
import { streamCampaignBackupZip } from '../lib/campaignExport/buildCampaignBackupZip.js';
import { readBackupManifest } from '../lib/stagedBackupZip.js';
import { authorizeAudioBackup, authorizeCampaignExport } from '../lib/audioCore.js';
import { CAMPAIGN_BACKUP_FORMAT } from '../lib/campaignExport/types.js';
import { appendSystemLog } from '../lib/systemLogBuffer.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { buildImportStagingAssetData } from '../lib/importStagingRetention.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from '../lib/taskRegistry.js';
import {
  notifyUsersFromTemplateAsync,
} from '../lib/notifications/notificationService.js';
import { NotificationType } from '../lib/notifications/types.js';
import { campaignSettingsPath } from '../lib/notifications/deepLinks.js';
import { enqueueCampaignBackupRestore } from '../lib/importQueue.js';

function buildBackupFilename(handle: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSlug = handle.replace(/[^a-z0-9-]+/gi, '-');
  return `esiana-campaign-${safeSlug}-${stamp}.zip`;
}

async function validateBackupZipBuffer(buffer: Buffer): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestRaw = await zip.file('manifest.json')?.async('string');
  if (!manifestRaw) {
    throw new Error('Backup manifest.json is missing');
  }
  const manifest = JSON.parse(manifestRaw) as { format?: string };
  if (manifest.format !== CAMPAIGN_BACKUP_FORMAT) {
    throw new Error(
      `Unsupported backup format: ${String(manifest.format ?? 'unknown')}`,
    );
  }
}

async function processAsyncCampaignExport(input: {
  campaignId: string;
  handle: string;
  userId: string;
  taskId: string;
}): Promise<void> {
  let filePath: string | undefined;
  try {
    updateBackgroundTask(input.taskId, { status: 'PROCESSING', progress: 10 });
    await authorizeAudioBackup(input.campaignId, input.userId);

    const exportResult = await buildSovereignExport(input.campaignId, 'sovereign');
    if (!exportResult) {
      throw new Error('Campaign not found');
    }

    updateBackgroundTask(input.taskId, { progress: 40 });
    const filename = buildBackupFilename(input.handle);
    filePath = path.join(env.uploadsDir, filename);
    await pipeline(streamCampaignBackupZip(exportResult.files), createWriteStream(filePath));

    const asset = await prisma.asset.create({
      data: buildImportStagingAssetData({
        campaignId: input.campaignId,
        url: `/uploads/${filename}`,
        type: 'campaign-export-zip',
      }) as any,
    });

    updateBackgroundTask(input.taskId, {
      status: 'COMPLETED',
      progress: 100,
      metaMerge: { assetId: asset.id, filename },
    });

    notifyUsersFromTemplateAsync({
      userIds: [input.userId],
      type: NotificationType.EXPORT_READY,
      vars: { campaignName: exportResult.manifest.campaign.name },
      linkUrl: `/api/campaigns/${input.handle}/backup/download/${asset.id}`,
      campaignId: input.campaignId,
      metadata: { assetId: asset.id, filename },
      expiresAt: asset.expiresAt,
    });
  } catch (error) {
    if (filePath) await fs.unlink(filePath).catch(() => {});
    updateBackgroundTask(input.taskId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Export failed',
    });
    notifyUsersFromTemplateAsync({
      userIds: [input.userId],
      type: NotificationType.EXPORT_FAILED,
      vars: {
        customBody:
          error instanceof Error ? error.message : 'Unable to generate campaign backup.',
      },
      linkUrl: campaignSettingsPath(input.handle, 'backup'),
      campaignId: input.campaignId,
    });
  }
}

export async function downloadCampaignBackup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign?.campaignId;
  const handle = req.campaign?.campaignHandle ?? String(req.params.campaignHandle ?? 'campaign');

  if (!campaignId) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  try { await authorizeAudioBackup(campaignId, req.user!.id); }
  catch { res.status(403).json({ error: 'campaign_audio_export_forbidden' }); return; }
  const exportResult = await buildSovereignExport(campaignId, 'sovereign');
  if (!exportResult) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const filename = buildBackupFilename(handle);

  appendSystemLog(
    'info',
    `Campaign sovereign backup started: ${exportResult.manifest.campaign.name} (${campaignId})`,
  );

  try {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await pipeline(streamCampaignBackupZip(exportResult.files), res);
  } catch (error) {
    appendSystemLog(
      'error',
      `Campaign sovereign backup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    if (res.headersSent) res.destroy();
    else res.status(500).json({ error: 'Unable to generate campaign backup' });
  }
}

export async function startAsyncCampaignBackup(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const handle = req.campaign!.campaignHandle;
  const userId = req.user!.id;
  try { await authorizeAudioBackup(campaignId, userId); }
  catch { res.status(403).json({ error: 'campaign_audio_export_forbidden' }); return; }

  const task = createBackgroundTask({
    taskName: 'Campaign Export',
    targetCampaign: handle,
    type: 'AD_HOC',
    status: 'PENDING',
    progress: 0,
    abortable: false,
    meta: { campaignId, userId },
  });

  res.status(202).json({ taskId: task.id });

  void processAsyncCampaignExport({
    campaignId,
    handle: handle ?? '',
    userId,
    taskId: task.id,
  });
}

export async function downloadCampaignExportAsset(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const assetId = String(req.params.assetId ?? '');
  try { await authorizeCampaignExport(campaignId, req.user?.id); }
  catch { res.status(403).json({ error: 'campaign_export_forbidden' }); return; }

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      campaignId,
      type: 'campaign-export-zip',
    },
  });

  if (!asset) {
    res.status(404).json({ error: 'Export not found' });
    return;
  }

  if (asset.expiresAt && asset.expiresAt.getTime() <= Date.now()) {
    res.status(410).json({ error: 'Export has expired' });
    return;
  }

  const filename = path.basename(asset.url);
  const filePath = path.join(env.uploadsDir, filename);

  try {
    const stat = await fs.stat(filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(stat.size));
    await pipeline(createReadStream(filePath), res);
  } catch {
    res.status(404).json({ error: 'Export file missing on server' });
  }
}

export async function restoreCampaignBackup(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const handle = req.campaign!.campaignHandle ?? 'campaign';

  const files = req.files as { backupZipFile?: Express.Multer.File[] } | undefined;
  let backupZipFile = Array.isArray(files?.backupZipFile)
    ? files.backupZipFile[0]
    : undefined;
  let sourceUpload: { id: string; assetId: string } | undefined;
  if (!backupZipFile && typeof req.body?.uploadId === 'string') {
    const upload = await prisma.assetUploadSession.findFirst({ where: { id: req.body.uploadId, campaignId,
      userId: req.user!.id, purpose: 'campaign_backup' } });
    if (upload && ['restoring', 'consumed'].includes(upload.status)) {
      res.status(409).json({ error: 'Backup upload is already being restored or has been consumed', code: 'backup_upload_consumed' });
      return;
    }
    if (!upload || upload.status !== 'complete' || upload.expiresAt <= new Date()) {
      res.status(400).json({ error: 'A completed, unexpired backup upload is required' });
      return;
    }
    const asset = upload?.assetId ? await prisma.asset.findFirst({ where: { id: upload.assetId, campaignId, type: 'campaign-backup-zip' } }) : null;
    if (asset && (!asset.expiresAt || asset.expiresAt > new Date())) {
      backupZipFile = { filename: path.basename(asset.url) } as Express.Multer.File;
      sourceUpload = { id: upload.id, assetId: asset.id };
    }
  }

  if (!backupZipFile) {
    res.status(400).json({ error: 'backupZipFile is required' });
    return;
  }

  let uploadClaimed = false;
  let movedPaths: { current: string; next: string } | undefined;
  let handoffCommitted = false;
  try {
    if (sourceUpload) {
      const claimed = await prisma.assetUploadSession.updateMany({ where: { id: sourceUpload.id, status: 'complete', assetId: sourceUpload.assetId },
        data: { status: 'restoring' } });
      if (!claimed.count) {
        res.status(409).json({ error: 'Backup upload is already being restored or has been consumed', code: 'backup_upload_consumed' });
        return;
      }
      uploadClaimed = true;
    }
    const manifest = await readBackupManifest(path.join(env.uploadsDir, backupZipFile.filename));
    if (manifest.format !== CAMPAIGN_BACKUP_FORMAT) throw new Error('Unsupported campaign backup format');

    const nextFilename = `campaign-${campaignId}-restore-${randomUUID()}.zip`;
    const currentPath = path.join(env.uploadsDir, backupZipFile.filename);
    const nextPath = path.join(env.uploadsDir, nextFilename);
    await fs.rename(currentPath, nextPath);
    movedPaths = { current: currentPath, next: nextPath };

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: buildImportStagingAssetData({ campaignId, url: `/uploads/${nextFilename}`, type: 'campaign-backup-zip' }),
      });
      if (sourceUpload) {
        const consumed = await tx.assetUploadSession.updateMany({ where: { id: sourceUpload.id, status: 'restoring', assetId: sourceUpload.assetId }, data: { status: 'consumed', assetId: null } });
        if (!consumed.count) throw new Error('Backup upload changed during restore');
        await tx.asset.delete({ where: { id: sourceUpload.assetId } });
      }
      return created;
    });
    handoffCommitted = true;

    const task = createBackgroundTask({
      taskName: 'Esiana Backup Restore',
      targetCampaign: handle,
      type: 'AD_HOC',
      status: 'PENDING',
      progress: 0,
      abortable: false,
      meta: {
        campaignId,
        backupZipAssetId: asset.id,
        requestedByUserId: req.user!.id,
      },
    });

    updateBackgroundTask(task.id, { progress: 10, status: 'PENDING' });
    enqueueCampaignBackupRestore(campaignId, task.id);

    appendSystemLog(
      'info',
      `Campaign backup restore queued: ${handle} (${campaignId})`,
    );

    res.status(202).json({ taskId: task.id });
  } catch (error) {
    if (!handoffCommitted) {
      let recovered = true;
      if (movedPaths) {
        recovered = await fs.rename(movedPaths.next, movedPaths.current).then(() => true, () => false);
      }
      if (uploadClaimed && sourceUpload) {
        await prisma.assetUploadSession.updateMany({ where: { id: sourceUpload.id, status: 'restoring' },
          data: { status: recovered ? 'complete' : 'failed' } });
      }
    }
    res.status(400).json({
      error:
        error instanceof Error ? error.message : 'Invalid campaign backup ZIP',
    });
  }
}
