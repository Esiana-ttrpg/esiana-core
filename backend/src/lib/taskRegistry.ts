import { randomUUID } from 'node:crypto';

export type BackgroundTaskType = 'AD_HOC' | 'SCHEDULED';
export type BackgroundTaskStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface BackgroundTaskRecord {
  id: string;
  taskName: string;
  targetCampaign: string | null;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  cronKey: string | null;
  errorMessage: string | null;
  abortable: boolean;
}

interface BackgroundTaskInternal extends BackgroundTaskRecord {
  startedAtMs: number;
  completedAtMs: number | null;
  meta: Record<string, unknown>;
  onAbort?: () => Promise<void> | void;
}

const MAX_HISTORY = 200;
const DEFAULT_FAILURE_LIMIT = 20;

const tasks = new Map<string, BackgroundTaskInternal>();
const dismissedFailureIds = new Set<string>();

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveDurationMs(task: BackgroundTaskInternal): number | null {
  if (task.completedAtMs === null) return null;
  return Math.max(0, task.completedAtMs - task.startedAtMs);
}

function serialize(task: BackgroundTaskInternal): BackgroundTaskRecord {
  return {
    id: task.id,
    taskName: task.taskName,
    targetCampaign: task.targetCampaign,
    type: task.type,
    status: task.status,
    progress: task.progress,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    durationMs: deriveDurationMs(task),
    cronKey: task.cronKey,
    errorMessage: task.errorMessage,
    abortable: task.abortable,
  };
}

function isFinished(task: BackgroundTaskInternal): boolean {
  return task.status === 'COMPLETED' || task.status === 'FAILED';
}

function trimTaskHistory(): void {
  const finished = Array.from(tasks.values())
    .filter(isFinished)
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0));

  const keepFinishedIds = new Set(finished.slice(0, MAX_HISTORY).map((task) => task.id));
  for (const task of tasks.values()) {
    if (isFinished(task) && !keepFinishedIds.has(task.id)) {
      tasks.delete(task.id);
      dismissedFailureIds.delete(task.id);
    }
  }
}

export function createBackgroundTask(input: {
  taskName: string;
  targetCampaign?: string | null;
  type: BackgroundTaskType;
  status?: BackgroundTaskStatus;
  progress?: number;
  abortable?: boolean;
  cronKey?: string | null;
  onAbort?: () => Promise<void> | void;
  meta?: Record<string, unknown>;
}): BackgroundTaskRecord {
  const now = Date.now();
  const status = input.status ?? 'PENDING';
  const completed = status === 'COMPLETED' || status === 'FAILED';

  const task: BackgroundTaskInternal = {
    id: randomUUID(),
    taskName: input.taskName,
    targetCampaign: input.targetCampaign ?? null,
    type: input.type,
    status,
    progress: clampProgress(input.progress ?? (status === 'PENDING' ? 0 : 5)),
    startedAt: new Date(now).toISOString(),
    completedAt: completed ? new Date(now).toISOString() : null,
    durationMs: completed ? 0 : null,
    cronKey: input.cronKey ?? null,
    errorMessage: null,
    abortable: Boolean(input.abortable),
    startedAtMs: now,
    completedAtMs: completed ? now : null,
    meta: input.meta ?? {},
    onAbort: input.onAbort,
  };

  tasks.set(task.id, task);
  trimTaskHistory();
  return serialize(task);
}

export function updateBackgroundTask(
  taskId: string,
  patch: {
    status?: BackgroundTaskStatus;
    progress?: number;
    errorMessage?: string | null;
    abortable?: boolean;
    metaMerge?: Record<string, unknown>;
  },
): BackgroundTaskRecord | null {
  const task = tasks.get(taskId);
  if (!task) return null;

  if (patch.status) {
    task.status = patch.status;
    if (patch.status === 'COMPLETED' || patch.status === 'FAILED') {
      const now = Date.now();
      task.completedAtMs = now;
      task.completedAt = new Date(now).toISOString();
      task.durationMs = deriveDurationMs(task);
      if (patch.status === 'COMPLETED') {
        task.progress = 100;
      }
    } else {
      task.completedAt = null;
      task.completedAtMs = null;
      task.durationMs = null;
    }
  }

  if (patch.progress !== undefined) {
    task.progress = clampProgress(patch.progress);
  }

  if (patch.errorMessage !== undefined) {
    task.errorMessage = patch.errorMessage;
  }

  if (patch.abortable !== undefined) {
    task.abortable = patch.abortable;
  }

  if (patch.metaMerge) {
    task.meta = { ...task.meta, ...patch.metaMerge };
  }

  trimTaskHistory();
  return serialize(task);
}

export async function abortBackgroundTask(taskId: string): Promise<{
  ok: boolean;
  error?: string;
  task?: BackgroundTaskRecord;
}> {
  const task = tasks.get(taskId);
  if (!task) return { ok: false, error: 'Task not found' };
  if (task.status !== 'PROCESSING' && task.status !== 'PENDING') {
    return { ok: false, error: 'Only pending or processing tasks can be aborted' };
  }

  try {
    if (task.onAbort) {
      await task.onAbort();
    }
  } catch (error) {
    updateBackgroundTask(taskId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Abort failed',
      abortable: false,
    });
    return { ok: false, error: 'Abort handler failed', task: serialize(task) };
  }

  const updated = updateBackgroundTask(taskId, {
    status: 'FAILED',
    errorMessage: 'Task aborted by administrator',
    abortable: false,
  });
  return updated
    ? { ok: true, task: updated }
    : { ok: false, error: 'Task not found after abort' };
}

export function listActiveTasks(): BackgroundTaskRecord[] {
  return Array.from(tasks.values())
    .filter((task) => task.status === 'PENDING' || task.status === 'PROCESSING')
    .sort((a, b) => b.startedAtMs - a.startedAtMs)
    .map(serialize);
}

export function listTaskFailures(limit = DEFAULT_FAILURE_LIMIT): BackgroundTaskRecord[] {
  return Array.from(tasks.values())
    .filter(
      (task) =>
        task.status === 'FAILED' &&
        !dismissedFailureIds.has(task.id),
    )
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0))
    .slice(0, limit)
    .map(serialize);
}

export function listFinishedTasks(): BackgroundTaskRecord[] {
  return Array.from(tasks.values())
    .filter(isFinished)
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0))
    .map(serialize);
}

export function listTaskHistoryPage(input: {
  page?: number;
  limit?: number;
}): {
  runs: BackgroundTaskRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };
} {
  const pageSize = Math.min(50, Math.max(1, input.limit ?? 25));
  const page = Math.max(1, input.page ?? 1);
  const finished = listFinishedTasks();
  const totalCount = finished.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  return {
    runs: finished.slice(offset, offset + pageSize),
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
    },
  };
}

export function getLatestCronRun(cronKey: string): BackgroundTaskRecord | null {
  const match = Array.from(tasks.values())
    .filter((task) => task.cronKey === cronKey && isFinished(task))
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0))[0];
  return match ? serialize(match) : null;
}

export function dismissTaskFailure(taskId: string): boolean {
  const task = tasks.get(taskId);
  if (!task || task.status !== 'FAILED') return false;
  dismissedFailureIds.add(taskId);
  return true;
}

/** @internal test helper */
export function resetTaskRegistryForTests(): void {
  tasks.clear();
  dismissedFailureIds.clear();
}

export function listBackgroundTasks(): BackgroundTaskRecord[] {
  return Array.from(tasks.values())
    .sort((a, b) => b.startedAtMs - a.startedAtMs)
    .map(serialize);
}

export function getBackgroundTask(taskId: string): BackgroundTaskInternal | undefined {
  return tasks.get(taskId);
}

export function listTaskHistory(limit = 20): BackgroundTaskRecord[] {
  return listFinishedTasks().slice(0, limit);
}

export function getTaskMetaNumberSum(taskName: string, key: string, windowMs: number): number {
  const threshold = Date.now() - windowMs;
  return Array.from(tasks.values())
    .filter((task) => task.taskName === taskName && task.completedAtMs && task.completedAtMs >= threshold)
    .reduce((sum, task) => {
      const value = task.meta[key];
      return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
    }, 0);
}
