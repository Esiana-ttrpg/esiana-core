import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  abortBackgroundTask,
  getTaskMetaNumberSum,
  listBackgroundTasks,
  listTaskHistory,
} from '../lib/taskRegistry.js';
import { SCHEDULED_SYSTEM_JOBS } from '../lib/scheduledSystemJobs.js';

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function listAdminTasks(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const tasks = listBackgroundTasks();
  const runningWorkers = tasks.filter(
    (task) => task.status === 'PENDING' || task.status === 'PROCESSING',
  ).length;

  const janitorFreedBytesWeek = getTaskMetaNumberSum(
    'Asset Janitor Sweep',
    'freedBytes',
    7 * 24 * 60 * 60 * 1000,
  );

  const cpuUsagePercent = Math.round(process.cpuUsage().system / 10000);
  const memory = process.memoryUsage();

  res.json({
    metrics: {
      totalRunningWorkers: runningWorkers,
      system: {
        cpuUsagePercent,
        memoryUsedMb: Math.round(memory.rss / 1024 / 1024),
        memoryTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
      janitor: {
        freedBytesThisWeek: janitorFreedBytesWeek,
        freedFormattedThisWeek: formatBytes(janitorFreedBytesWeek),
      },
    },
    tasks,
    history: listTaskHistory(20),
    scheduledJobs: SCHEDULED_SYSTEM_JOBS,
  });
}

export async function abortAdminTask(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const taskId = String(req.params.id ?? '');
  if (!taskId) {
    res.status(400).json({ error: 'Task id is required' });
    return;
  }

  const result = await abortBackgroundTask(taskId);
  if (!result.ok) {
    res.status(result.error === 'Task not found' ? 404 : 400).json({
      error: result.error ?? 'Unable to abort task',
      task: result.task ?? null,
    });
    return;
  }

  res.json({ ok: true, task: result.task });
}

