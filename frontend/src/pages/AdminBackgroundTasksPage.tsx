import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Cpu, HardDrive, RefreshCw, Shield, StopCircle } from 'lucide-react';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { abortAdminTask, fetchAdminTasks } from '@/lib/adminTasks';
import type {
  BackgroundTaskRecord,
  BackgroundTaskSnapshot,
  BackgroundTaskStatus,
} from '@/types/admin';

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

function taskTypeBadge(type: BackgroundTaskRecord['type']): string {
  return type === 'SCHEDULED' ? 'System Cron' : 'Background Request';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminBackgroundTasksPage() {
  const [snapshot, setSnapshot] = useState<BackgroundTaskSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadSnapshot();
    const poll = window.setInterval(() => {
      void loadSnapshot();
    }, 5000);
    return () => window.clearInterval(poll);
  }, [loadSnapshot]);

  const tasks = snapshot?.tasks ?? [];
  const history = snapshot?.history ?? [];
  const scheduledJobs = snapshot?.scheduledJobs ?? [];
  const activeTasks = useMemo(
    () =>
      tasks.filter((task) => task.status === 'PENDING' || task.status === 'PROCESSING'),
    [tasks],
  );

  async function onAbort(task: BackgroundTaskRecord) {
    if (!window.confirm(`Abort task "${task.taskName}"?`)) return;
    setBusyTaskId(task.id);
    try {
      await abortAdminTask(task.id);
      await loadSnapshot();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to abort task');
    } finally {
      setBusyTaskId(null);
    }
  }

  if (loading && !snapshot) {
    return <LoadingSpinner label="Loading background task diagnostics…" />;
  }

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
          Observe active workers, janitor sweeps, and recent background execution logs.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <Activity className="size-4 text-primary" />
            Total Running Workers
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {snapshot?.metrics.totalRunningWorkers ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <Cpu className="size-4 text-primary" />
            System CPU / Memory
          </p>
          <p className="mt-2 text-sm text-foreground">
            CPU {snapshot?.metrics.system.cpuUsagePercent ?? 0}% | Memory{' '}
            {snapshot?.metrics.system.memoryUsedMb ?? 0}MB /{' '}
            {snapshot?.metrics.system.memoryTotalMb ?? 0}MB
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <HardDrive className="size-4 text-primary" />
            Disk Space Optimized This Week
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">
            {snapshot?.metrics.janitor.freedFormattedThisWeek ?? '0 B'}
          </p>
        </div>
      </div>

      <AdminSectionCard
        title="Scheduled System Jobs"
        description="Always-on cron workers registered by the server, including import staging file retention."
        icon={Clock3}
      >
        {scheduledJobs.length === 0 ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No scheduled system jobs are configured.
          </p>
        ) : (
          <div className="space-y-3">
            {scheduledJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-background/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{job.taskName}</p>
                    <span className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">
                      System Cron
                    </span>
                  </div>
                  <p className="text-xs text-muted">{job.schedule}</p>
                </div>
                <p className="mt-2 text-sm text-muted">{job.description}</p>
                <p className="mt-2 text-xs text-muted">
                  Scope: {job.scope}
                  {job.id === 'import-staging-retention' && (
                    <>
                      {' '}
                      | Asset types:{' '}
                      <span className="font-mono text-foreground">
                        campaign-import-zip, campaign-backup-zip
                      </span>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Live Task Queue"
        description="Current and recently started server workers."
        icon={Activity}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-elevated transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh now
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No background jobs are currently tracked.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface/90 text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Task Details</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background/50">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{task.taskName}</p>
                      <span className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">
                        {taskTypeBadge(task.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {task.targetCampaign || 'System scope'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-48 max-w-full">
                        <div className="h-2 overflow-hidden rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted">{task.progress}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'PROCESSING' ? (
                        <button
                          type="button"
                          disabled={busyTaskId === task.id}
                          onClick={() => void onAbort(task)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          <StopCircle className="size-3.5" />
                          {busyTaskId === task.id ? 'Aborting…' : 'Abort Task'}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTasks.length === 0 && tasks.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            No workers are actively processing right now.
          </p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Historical Log Ticker"
        description="Last 20 completed or failed background operations."
        icon={Activity}
      >
        {history.length === 0 ? (
          <p className="rounded-lg border border-border bg-background/50 px-4 py-6 text-center text-sm text-muted">
            No historical entries available yet.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-background/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-foreground">
                    {entry.taskName} <span className="text-muted">({entry.id})</span>
                  </p>
                  <span className="text-xs text-muted">
                    Completed: {formatWhen(entry.completedAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Started: {formatWhen(entry.startedAt)} | Scope:{' '}
                  {entry.targetCampaign || 'System'}
                </p>
                {entry.errorMessage && (
                  <p className="mt-1 rounded border border-red-900/40 bg-red-950/20 px-2 py-1 text-xs text-red-300">
                    Error: {entry.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}

