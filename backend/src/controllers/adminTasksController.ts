import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  abortBackgroundTask,
  dismissTaskFailure,
  getLatestCronRun,
  getTaskMetaNumberSum,
  listActiveTasks,
  listTaskFailures,
  listTaskHistoryPage,
} from '../lib/taskRegistry.js';
import {
  CRON_INTERVAL_MS,
  SCHEDULED_SYSTEM_JOBS,
  type ScheduledJobSummary,
} from '../lib/scheduledSystemJobs.js';

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

function buildScheduledSummaries(): ScheduledJobSummary[] {
  return SCHEDULED_SYSTEM_JOBS.map((job) => {
    const lastRun = getLatestCronRun(job.id);
    const intervalMs = CRON_INTERVAL_MS[job.id] ?? null;
    let nextRunAt: string | null = null;
    if (lastRun?.completedAt && intervalMs) {
      nextRunAt = new Date(new Date(lastRun.completedAt).getTime() + intervalMs).toISOString();
    }

    return {
      ...job,
      lastRunAt: lastRun?.completedAt ?? null,
      lastRunStatus:
        lastRun?.status === 'COMPLETED'
          ? 'success'
          : lastRun?.status === 'FAILED'
            ? 'failed'
            : null,
      nextRunAt,
    };
  });
}

export async function listAdminTasks(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const active = listActiveTasks();
  const runningWorkers = active.length;

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
    active,
    scheduled: buildScheduledSummaries(),
    failures: listTaskFailures(),
  });
}

export async function listAdminTaskHistory(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const page = Number.parseInt(String(req.query.page ?? '1'), 10);
  const limit = Number.parseInt(String(req.query.limit ?? '25'), 10);
  const result = listTaskHistoryPage({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 25,
  });
  res.json(result);
}

export async function dismissAdminTask(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const taskId = String(req.params.id ?? '');
  if (!taskId) {
    res.status(400).json({ error: 'Task id is required' });
    return;
  }

  const ok = dismissTaskFailure(taskId);
  if (!ok) {
    res.status(404).json({ error: 'Failed task not found' });
    return;
  }

  res.json({ ok: true });
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
