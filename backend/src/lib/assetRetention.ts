import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { isImportStagingAssetType } from './importStagingRetention.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from './taskRegistry.js';

async function sweepExpiredAssetsOnce(): Promise<void> {
  const now = new Date();
  const task = createBackgroundTask({
    taskName: 'Asset Janitor Sweep',
    type: 'SCHEDULED',
    status: 'PROCESSING',
    progress: 5,
    abortable: false,
  });

  const expired = await prisma.asset.findMany(
    {
      where: {
        expiresAt: {
          lte: now,
        },
      },
    } as any,
  );

  if (expired.length === 0) {
    updateBackgroundTask(task.id, {
      status: 'COMPLETED',
      progress: 100,
      metaMerge: { deletedCount: 0, freedBytes: 0, importStagingDeletedCount: 0 },
    });
    return;
  }

  let deletedCount = 0;
  let freedBytes = 0;
  let importStagingDeletedCount = 0;

  for (let index = 0; index < expired.length; index += 1) {
    const asset = expired[index];
    updateBackgroundTask(task.id, {
      progress: Math.round((index / expired.length) * 90) + 5,
    });
    const filename = path.basename(asset.url);
    if (!filename || filename === '.' || filename === '/') {
      // Defensive: skip malformed URLs without deleting DB record.
      // This should never happen for well-formed assets.
      continue;
    }

    const filePath = path.join(env.uploadsDir, filename);

    try {
      const stats = await fs.stat(filePath);
      await fs.unlink(filePath);
      deletedCount += 1;
      if (isImportStagingAssetType(asset.type)) {
        importStagingDeletedCount += 1;
      }
      freedBytes += stats.size;
      console.info('[asset-retention] Deleted expired asset file', {
        assetId: asset.id,
        url: asset.url,
      });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        // File was already removed by an admin or external process; proceed.
        console.warn('[asset-retention] File already missing for asset', {
          assetId: asset.id,
          url: asset.url,
        });
      } else {
        console.error('[asset-retention] Failed to delete asset file', {
          assetId: asset.id,
          url: asset.url,
          error,
        });
      }
    }

    try {
      await prisma.asset.delete({ where: { id: asset.id } });
      console.info('[asset-retention] Deleted expired asset record', {
        assetId: asset.id,
      });
    } catch (error) {
      console.error('[asset-retention] Failed to delete asset record', {
        assetId: asset.id,
        error,
      });
    }
  }

  updateBackgroundTask(task.id, {
    status: 'COMPLETED',
    progress: 100,
    metaMerge: { deletedCount, freedBytes, importStagingDeletedCount },
  });
}

export function startAssetRetentionSweep(): void {
  // Run once shortly after startup.
  void sweepExpiredAssetsOnce();

  // Then run every 24 hours.
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    void sweepExpiredAssetsOnce();
  }, twentyFourHoursMs).unref();
}

