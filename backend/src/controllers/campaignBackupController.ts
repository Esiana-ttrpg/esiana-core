import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import JSZip from 'jszip';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { buildSovereignExport } from '../lib/campaignExport/buildSovereignExport.js';
import { buildCampaignBackupZip } from '../lib/campaignExport/buildCampaignBackupZip.js';
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
  try {
    updateBackgroundTask(input.taskId, { status: 'PROCESSING', progress: 10 });

    const exportResult = await buildSovereignExport(input.campaignId, 'sovereign');
    if (!exportResult) {
      throw new Error('Campaign not found');
    }

    updateBackgroundTask(input.taskId, { progress: 40 });
    const zipBuffer = await buildCampaignBackupZip(exportResult.files);
    const filename = buildBackupFilename(input.handle);
    const filePath = path.join(env.uploadsDir, filename);
    await fs.writeFile(filePath, zipBuffer);

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
    const zipBuffer = await buildCampaignBackupZip(exportResult.files);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (error) {
    appendSystemLog(
      'error',
      `Campaign sovereign backup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    res.status(500).json({ error: 'Unable to generate campaign backup' });
  }
}

export async function startAsyncCampaignBackup(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const handle = req.campaign!.campaignHandle;
  const userId = req.user!.id;

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
    const buffer = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
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
  const backupZipFile = Array.isArray(files?.backupZipFile)
    ? files.backupZipFile[0]
    : undefined;

  if (!backupZipFile) {
    res.status(400).json({ error: 'backupZipFile is required' });
    return;
  }

  try {
    const zipBuffer = await fs.readFile(
      path.join(env.uploadsDir, backupZipFile.filename),
    );
    await validateBackupZipBuffer(zipBuffer);

    const nextFilename = `campaign-${campaignId}-restore-${randomUUID()}.zip`;
    const currentPath = path.join(env.uploadsDir, backupZipFile.filename);
    const nextPath = path.join(env.uploadsDir, nextFilename);
    await fs.rename(currentPath, nextPath);

    const asset = await prisma.asset.create({
      data: buildImportStagingAssetData({
        campaignId,
        url: `/uploads/${nextFilename}`,
        type: 'campaign-backup-zip',
      }) as never,
    });

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
    res.status(400).json({
      error:
        error instanceof Error ? error.message : 'Invalid campaign backup ZIP',
    });
  }
}
