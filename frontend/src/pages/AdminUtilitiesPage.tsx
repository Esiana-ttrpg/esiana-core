import { useCallback, useEffect, useState } from 'react';
import {
  Database,
  HardDrive,
  RefreshCw,
  ScrollText,
  Shield,
  Trash2,
} from 'lucide-react';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  downloadSystemBackup,
  fetchStorageStats,
  fetchSystemLogs,
  pruneUnusedMedia,
  type StorageStats,
  type SystemLogEntry,
} from '@/lib/adminUtilities';

function formatLogTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function logLevelClass(level: SystemLogEntry['level']): string {
  if (level === 'error') return 'text-red-400';
  if (level === 'warn') return 'text-primary';
  return 'text-muted';
}

export function AdminUtilitiesPage() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const [pruneBusy, setPruneBusy] = useState(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);
  const [pruneError, setPruneError] = useState<string | null>(null);

  const loadStorage = useCallback(async () => {
    setStorageLoading(true);
    setStorageError(null);
    try {
      setStorage(await fetchStorageStats());
    } catch (err) {
      setStorage(null);
      setStorageError(
        err instanceof Error ? err.message : 'Unable to load disk statistics.',
      );
    } finally {
      setStorageLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      setLogs(await fetchSystemLogs(100));
    } catch (err) {
      setLogs([]);
      setLogsError(
        err instanceof Error ? err.message : 'Unable to load system logs.',
      );
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStorage();
    void loadLogs();
  }, [loadStorage, loadLogs]);

  async function handleBackup() {
    const confirmed = window.confirm(
      'Download a snapshot of the SQLite database?\n\nUpload media is not included in this archive yet.',
    );
    if (!confirmed) return;

    setBackupBusy(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      await downloadSystemBackup();
      setBackupMessage('Backup download started.');
      void loadLogs();
    } catch (err) {
      setBackupError(
        err instanceof Error ? err.message : 'Backup download failed.',
      );
    } finally {
      setBackupBusy(false);
    }
  }

  async function handlePrune() {
    if (!storage || storage.orphanFiles === 0) {
      window.alert('No orphan media files were detected on disk.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${storage.orphanFiles} unused file(s) and reclaim about ${storage.reclaimableBytesFormatted}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setPruneBusy(true);
    setPruneMessage(null);
    setPruneError(null);
    try {
      const result = await pruneUnusedMedia();
      setStorage(result.storage);
      setPruneMessage(
        `Removed ${result.prune.deletedCount} file(s), freed ${result.prune.freedBytesFormatted}.`,
      );
      void loadLogs();
    } catch (err) {
      setPruneError(
        err instanceof Error ? err.message : 'Prune operation failed.',
      );
    } finally {
      setPruneBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            System Utilities
          </h1>
        </div>
        <p className="text-sm text-muted">
          Backups, upload maintenance, and live diagnostics for this instance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <AdminSectionCard
          title="Data Resiliency"
          description="The Backup Engine — export a point-in-time SQLite snapshot for off-site storage."
          icon={Database}
        >
          <p className="mb-4 text-sm text-muted">
            Downloads the active database file from this server. Schedule regular exports
            before major upgrades or migrations.
          </p>
          {backupError && (
            <p className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {backupError}
            </p>
          )}
          {backupMessage && (
            <p className="mb-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
              {backupMessage}
            </p>
          )}
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => void handleBackup()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            <Database className="size-4" />
            {backupBusy ? 'Preparing backup…' : 'Generate System Backup'}
          </button>
        </AdminSectionCard>

        <AdminSectionCard
          title="Disk Optimization"
          description="The Asset Vacuum — inspect upload volume and remove unreferenced media."
          icon={HardDrive}
        >
          {storageLoading && <LoadingSpinner label="Reading disk usage…" />}
          {storageError && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {storageError}
            </p>
          )}
          {storage && !storageLoading && (
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Total on disk
                </dt>
                <dd className="mt-1 font-mono text-lg text-foreground">
                  {storage.totalBytesFormatted}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Reclaimable
                </dt>
                <dd className="mt-1 font-mono text-lg text-primary">
                  {storage.reclaimableBytesFormatted}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Files tracked
                </dt>
                <dd className="mt-1 font-mono text-foreground">{storage.totalFiles}</dd>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Orphan files
                </dt>
                <dd className="mt-1 font-mono text-foreground">{storage.orphanFiles}</dd>
              </div>
            </dl>
          )}
          {pruneError && (
            <p className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {pruneError}
            </p>
          )}
          {pruneMessage && (
            <p className="mb-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
              {pruneMessage}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pruneBusy || storageLoading}
              onClick={() => void handlePrune()}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors"
            >
              <Trash2 className="size-4" />
              {pruneBusy ? 'Pruning…' : 'Prune Unused Media Assets'}
            </button>
            <button
              type="button"
              disabled={storageLoading}
              onClick={() => void loadStorage()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-elevated transition-colors"
            >
              <RefreshCw className="size-4" />
              Refresh stats
            </button>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Server Diagnostics"
        description="The Live Log Feed — recent warnings and errors captured on this node."
        icon={ScrollText}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            disabled={logsLoading}
            onClick={() => void loadLogs()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`size-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
            Refresh logs
          </button>
        </div>

        {logsLoading && logs.length === 0 && (
          <LoadingSpinner label="Loading diagnostic feed…" />
        )}

        {logsError && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {logsError}
          </p>
        )}

        <div
          className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed"
          role="log"
          aria-live="polite"
          aria-label="System diagnostic log feed"
        >
          {!logsLoading && logs.length === 0 && !logsError && (
            <p className="text-muted">No log entries captured yet.</p>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className="border-b border-border/80 py-2 last:border-0">
              <span className="text-muted">[{formatLogTime(entry.timestamp)}]</span>{' '}
              <span className={`uppercase ${logLevelClass(entry.level)}`}>
                {entry.level}
              </span>
              <pre className="mt-1 whitespace-pre-wrap break-words text-foreground">
                {entry.message}
              </pre>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
