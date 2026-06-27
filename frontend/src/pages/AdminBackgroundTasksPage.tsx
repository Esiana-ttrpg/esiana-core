import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  HardDrive,
  RefreshCw,
  Shield,
  StopCircle,
} from 'lucide-react';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  abortAdminTask,
  dismissAdminTask,
  fetchAdminTaskHistory,
  fetchAdminTasks,
} from '@/lib/adminTasks';
import type {
  BackgroundTaskRecord,
  BackgroundTaskSnapshot,
  BackgroundTaskStatus,
  TaskHistoryPage,
} from '@/types/admin';
import {
  formatAbsoluteDateTime,
  formatDurationMs,
  formatRelativeUpdated,
} from '@/utils/formatDate';

function statusClass(status: BackgroundTaskStatus): string {
  if (status === 'PROCESSING') {
    return 'border-primary/60 bg-primary/15 text-primary animate-pulse';
  }
  if (status === 'COMPLETED') {
    return 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200';
  }
  if (status === 'FAILED') {
    return 'border-red-500/50 bg-red-500/15 text-red-200';
  }
  return 'border-border bg-elevated text-foreground';
}

function displayResultStatus(task: BackgroundTaskRecord): string {
  if (
    task.status === 'FAILED' &&
    task.errorMessage === 'Task aborted by administrator'
  ) {
    return 'Cancelled';
  }
  if (task.status === 'COMPLETED') return 'Success';
  if (task.status === 'FAILED') return 'Failed';
  return task.status;
}

function scopeLabel(task: BackgroundTaskRecord): string {
  return task.targetCampaign || 'System scope';
}

function TimeCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted">—</span>;
  return (
    <span title={formatAbsoluteDateTime(iso)} className="cursor-default">
      {formatRelativeUpdated(iso)}
    </span>
  );
}

export function AdminBackgroundTasksPage() {
  const [snapshot, setSnapshot] = useState<BackgroundTaskSnapshot | null>(null);
  const [history, setHistory] = useState<TaskHistoryPage | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [expandedFailureId, setExpandedFailureId] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAdminTasks();
      setSnapshot(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load background diagnostics',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const data = await fetchAdminTaskHistory(page);
      setHistory(data);
      setHistoryPage(data.pagination.currentPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load task history',
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    const poll = window.setInterval(() => {
      void loadSnapshot();
    }, 5000);
    return () => window.clearInterval(poll);
  }, [loadSnapshot]);

  useEffect(() => {
    void loadHistory(historyPage);
  }, [historyPage, loadHistory]);

  useEffect(() => {
    if (historyPage !== 1) return undefined;
    const poll = window.setInterval(() => {
      void loadHistory(1);
    }, 5000);
    return () => window.clearInterval(poll);
  }, [historyPage, loadHistory]);

  const active = snapshot?.active ?? [];
  const failures = snapshot?.failures ?? [];
  const scheduled = snapshot?.scheduled ?? [];
  const historyRuns = history?.runs ?? [];
  const pagination = history?.pagination;

  async function onAbort(task: BackgroundTaskRecord) {
    if (!window.confirm(`Abort task "${task.taskName}"?`)) return;
    setBusyTaskId(task.id);
    try {
      await abortAdminTask(task.id);
      await loadSnapshot();
      if (historyPage === 1) await loadHistory(1);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to abort task');
    } finally {
      setBusyTaskId(null);
    }
  }

  async function onDismiss(task: BackgroundTaskRecord) {
    setBusyTaskId(task.id);
    try {
      await dismissAdminTask(task.id);
      await loadSnapshot();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to dismiss failure');
    } finally {
      setBusyTaskId(null);
    }
  }

  if (loading && !snapshot) {
    return <LoadingSpinner label="Loading background task diagnostics…" />;
  }

  const canGoPrev = pagination ? pagination.currentPage > 1 : false;
  const canGoNext = pagination
    ? pagination.currentPage < pagination.totalPages
    : false;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Background Tasks
          </h1>
        </div>
        <p className="text-sm text-muted">
          What is running now, what will run, what happened, and what needs attention.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className={`flex items-center gap-2 ${META_SECTION_LABEL_CLASS}`}>
            <Activity className="size-4 text-primary" />
            Total running workers
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {snapshot?.metrics.totalRunningWorkers ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className={`flex items-center gap-2 ${META_SECTION_LABEL_CLASS}`}>
            <Cpu className="size-4 text-primary" />
            System CPU / memory
          </p>
          <p className="mt-2 text-sm text-foreground">
            CPU {snapshot?.metrics.system.cpuUsagePercent ?? 0}% | Memory{' '}
            {snapshot?.metrics.system.memoryUsedMb ?? 0}MB /{' '}
            {snapshot?.metrics.system.memoryTotalMb ?? 0}MB
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className={`flex items-center gap-2 ${META_SECTION_LABEL_CLASS}`}>
            <HardDrive className="size-4 text-primary" />
            Disk space optimized this week
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">
            {snapshot?.metrics.janitor.freedFormattedThisWeek ?? '0 B'}
          </p>
        </div>
      </div>

      {failures.length > 0 && (
        <AdminSectionCard
          title="Failures"
          description="Failed runs that need attention. Dismissed items remain in history."
          icon={AlertTriangle}
        >
          <div className="space-y-3">
            {failures.map((task) => {
              const expanded = expandedFailureId === task.id;
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{task.taskName}</p>
                      <p className="mt-1 text-xs text-muted">
                        {scopeLabel(task)} · Failed{' '}
                        <TimeCell iso={task.completedAt} />
                      </p>
                      {task.errorMessage && !expanded && (
                        <p className="mt-2 line-clamp-2 text-sm text-red-200">
                          {task.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFailureId(expanded ? null : task.id)
                        }
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-elevated"
                      >
                        {expanded ? 'Collapse' : 'Inspect'}
                      </button>
                      <button
                        type="button"
                        disabled={busyTaskId === task.id}
                        onClick={() => void onDismiss(task)}
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-elevated disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  {expanded && task.errorMessage && (
                    <p className="mt-3 rounded border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                      {task.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </AdminSectionCard>
      )}

      <AdminSectionCard
        title="Active Queue"
        description="Tasks running or queued right now."
        icon={Activity}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void loadSnapshot();
              void loadHistory(historyPage);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-elevated transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh now
          </button>
        </div>

        {active.length === 0 ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No active tasks.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className={`bg-surface/90 text-left ${META_SECTION_LABEL_CLASS}`}>
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background/50">
                {active.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {task.taskName}
                    </td>
                    <td className="px-4 py-3 text-foreground">{scopeLabel(task)}</td>
                    <td className="px-4 py-3 text-foreground">
                      <TimeCell iso={task.startedAt} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(task.status)}`}
                      >
                        {task.status === 'PROCESSING' ? 'Running' : task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.abortable &&
                      (task.status === 'PROCESSING' || task.status === 'PENDING') ? (
                        <button
                          type="button"
                          disabled={busyTaskId === task.id}
                          onClick={() => void onAbort(task)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          <StopCircle className="size-3.5" />
                          {busyTaskId === task.id ? 'Aborting…' : 'Abort'}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Scheduled Jobs"
        description="Cron definitions with last and next run summary."
        icon={Clock3}
      >
        {scheduled.length === 0 ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No scheduled system jobs are configured.
          </p>
        ) : (
          <div className="space-y-3">
            {scheduled.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-background/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{job.taskName}</p>
                    <p className="mt-1 text-xs text-muted">{job.schedule}</p>
                  </div>
                  {job.lastRunStatus && (
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs ${
                        job.lastRunStatus === 'success'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                          : 'border-red-500/50 bg-red-500/15 text-red-200'
                      }`}
                    >
                      Last: {job.lastRunStatus}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                  <span>
                    Last run:{' '}
                    <span className="text-foreground">
                      <TimeCell iso={job.lastRunAt} />
                    </span>
                  </span>
                  <span>
                    Next run:{' '}
                    <span className="text-foreground">
                      <TimeCell iso={job.nextRunAt} />
                    </span>
                  </span>
                  <span>Scope: {job.scope}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Recent Activity"
        description="Paginated history of completed and failed runs."
        icon={Activity}
      >
        {historyRuns.length === 0 && !historyLoading ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No historical entries available yet.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className={`bg-surface/90 text-left ${META_SECTION_LABEL_CLASS}`}>
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background/50">
                  {historyRuns.map((task) => {
                    const result = displayResultStatus(task);
                    const muted =
                      task.status === 'COMPLETED' &&
                      result !== 'Cancelled';
                    const failed = task.status === 'FAILED' && result !== 'Cancelled';
                    const cancelled = result === 'Cancelled';
                    return (
                      <tr
                        key={task.id}
                        className={
                          failed
                            ? 'bg-red-950/10'
                            : cancelled
                              ? 'opacity-70'
                              : muted
                                ? 'opacity-80'
                                : undefined
                        }
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{task.taskName}</p>
                          <p className="text-xs text-muted">{scopeLabel(task)}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          <TimeCell iso={task.startedAt} />
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatDurationMs(task.durationMs)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(task.status)}`}
                          >
                            {result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canGoPrev || historyLoading}
                    onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext || historyLoading}
                    onClick={() => setHistoryPage((page) => page + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50 transition-colors"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
