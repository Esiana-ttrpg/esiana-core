import fs from 'node:fs';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { appendSystemLog, getRecentSystemLogs } from '../lib/systemLogBuffer.js';
import {
  getUploadStorageStats,
  pruneOrphanUploadFiles,
  resolveSqliteDatabasePath,
} from '../lib/storageMaintenance.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from '../lib/taskRegistry.js';

export async function downloadSystemBackup(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const dbPath = resolveSqliteDatabasePath();

  if (!dbPath || !fs.existsSync(dbPath)) {
    appendSystemLog('warn', 'Backup requested but SQLite database file was not found');
    res.status(404).json({
      error: 'Database file not found for backup',
    });
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `esiana-system-backup-${stamp}.db`;

  appendSystemLog('info', `System backup download started (${filename})`);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(dbPath);
  stream.on('error', (err) => {
    appendSystemLog('error', `Backup stream failed: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to read database for backup' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

export async function getSystemStorageStats(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const stats = await getUploadStorageStats();
  res.json({ storage: stats });
}

export async function pruneUnusedMediaAssets(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const task = createBackgroundTask({
    taskName: 'Asset Janitor Sweep',
    type: 'AD_HOC',
    status: 'PROCESSING',
    progress: 10,
    abortable: false,
  });

  try {
    const result = await pruneOrphanUploadFiles();
    updateBackgroundTask(task.id, {
      progress: 80,
      metaMerge: {
        deletedCount: result.deletedCount,
        freedBytes: result.freedBytes,
      },
    });

    appendSystemLog(
      'info',
      `Pruned ${result.deletedCount} orphan upload file(s), freed ${result.freedBytesFormatted}`,
    );
    const storage = await getUploadStorageStats();
    updateBackgroundTask(task.id, { status: 'COMPLETED', progress: 100 });
    res.json({ prune: result, storage });
  } catch (error) {
    updateBackgroundTask(task.id, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Janitor sweep failed',
    });
    throw error;
  }
}

export async function getSystemLogs(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(Number.parseInt(limitRaw, 10), 200)
      : 100;

  const logs = getRecentSystemLogs(limit);
  res.json({ logs });
}
