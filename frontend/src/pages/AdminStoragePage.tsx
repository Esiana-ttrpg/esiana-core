import { useCallback, useEffect, useState } from 'react';
import { Check, HardDrive, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { secondaryButtonClasses } from '@/components/admin/adminFormStyles';
import {
  fetchAdminStorageMetrics,
  fetchAdminStorageStatus,
  type AdminStorageMetrics,
  type StorageDriverInfo,
} from '@/lib/adminStorage';

function CapabilityList({ capabilities }: { capabilities: StorageDriverInfo['capabilities'] }) {
  const items = [
    { key: 'upload', label: 'Upload', enabled: capabilities.upload },
    { key: 'read', label: 'Read', enabled: capabilities.read },
    { key: 'delete', label: 'Delete', enabled: capabilities.delete },
    { key: 'thumb', label: 'Thumbnail Storage', enabled: capabilities.thumbnailStorage },
    { key: 'redirect', label: 'Redirect Delivery', enabled: capabilities.redirectDelivery },
  ] as const;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-sm">
          {item.enabled ? (
            <Check className="size-4 text-emerald-500" strokeWidth={2} />
          ) : (
            <span className="inline-block size-4 rounded-full border border-border" />
          )}
          <span className={item.enabled ? 'text-foreground' : 'text-muted'}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RegistrationCapabilities({
  capabilities,
}: {
  capabilities: StorageDriverInfo['registrationCapabilities'];
}) {
  const items = [
    { key: 'metrics', label: 'Metrics', enabled: capabilities.metrics },
    { key: 'orphan', label: 'Orphan Detection', enabled: capabilities.orphanDetection },
    { key: 'redirect', label: 'Redirect Delivery', enabled: capabilities.redirectDelivery },
  ] as const;

  return (
    <ul className="mt-2 space-y-1 text-sm text-muted">
      {items.map((item) => (
        <li key={item.key}>
          {item.label}: {item.enabled ? 'yes' : 'no'}
        </li>
      ))}
    </ul>
  );
}

function MetricsPanel({
  metrics,
  onRefresh,
  refreshing,
}: {
  metrics: AdminStorageMetrics;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface/40 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Usage</h2>
          <p className="mt-1 text-lg font-medium text-foreground">
            {metrics.totalBytesFormatted}
            {metrics.accuracy === 'estimate' ? (
              <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                (estimate)
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClasses}
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 inline size-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh metrics
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Assets</p>
          <p className="text-sm font-medium text-foreground">{metrics.assetCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Unique objects</p>
          <p className="text-sm font-medium text-foreground">{metrics.uniqueObjectCount}</p>
        </div>
        {metrics.sampledObjectCount != null ? (
          <div>
            <p className="text-xs text-muted">Sampled objects</p>
            <p className="text-sm font-medium text-foreground">{metrics.sampledObjectCount}</p>
          </div>
        ) : null}
        {metrics.orphanFileCount != null ? (
          <div>
            <p className="text-xs text-muted">Orphan files</p>
            <p className="text-sm font-medium text-foreground">{metrics.orphanFileCount}</p>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">By category</h3>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <li>Maps: {metrics.categories.maps}</li>
          <li>Images: {metrics.categories.images}</li>
          <li>Icons: {metrics.categories.icons}</li>
          <li>Scenes: {metrics.categories.scenes}</li>
          <li>Other: {metrics.categories.other}</li>
        </ul>
      </div>

      {metrics.largestAssets.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Largest assets
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {metrics.largestAssets.map((item) => (
              <li key={`${item.pointer}-${item.sizeBytes}`} className="text-foreground">
                {item.sizeFormatted} · {item.type}
                {item.assetId ? ` · ${item.assetId}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Cached until {new Date(metrics.cacheExpiresAt).toLocaleString()}. Metrics are operational
        estimates — not billing-grade accounting.
      </p>
    </section>
  );
}

export function AdminStoragePage() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchAdminStorageStatus>> | null>(
    null,
  );
  const [metrics, setMetrics] = useState<AdminStorageMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (refresh = false) => {
    if (!status?.activeDriver.registrationCapabilities.metrics) return;
    setMetricsError(null);
    if (refresh) setRefreshingMetrics(true);
    try {
      const data = await fetchAdminStorageMetrics(refresh);
      setMetrics(data);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Unable to load storage metrics.');
    } finally {
      setRefreshingMetrics(false);
    }
  }, [status?.activeDriver.registrationCapabilities.metrics]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminStorageStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load storage status.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!status?.activeDriver.registrationCapabilities.metrics) return;
    void loadMetrics(false);
  }, [status, loadMetrics]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !status) {
    return <p className="text-sm text-destructive">{error ?? 'Storage status unavailable.'}</p>;
  }

  const { activeDriver, registeredDrivers, health, configSummary } = status;
  const isDegraded = health.state === 'degraded';

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <HardDrive className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Storage</h1>
        </div>
        <p className="text-sm text-muted">
          Active storage driver, health, and usage. Select the write provider with{' '}
          <code className="text-xs">STORAGE_PROVIDER</code> in environment configuration.
        </p>
      </header>

      {isDegraded ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Active storage provider is degraded</p>
          <p className="mt-1 text-muted">
            {health.detail ??
              'New uploads are unavailable until configuration is corrected. Existing assets continue to serve when their owning provider is healthy.'}
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-surface/40 p-6 space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Active Driver
          </h2>
          <p className="mt-1 text-lg font-medium text-foreground">{activeDriver.displayName}</p>
          <p className="text-xs text-muted">{activeDriver.driverId}</p>
          <p className="mt-1 text-xs text-muted">
            Health:{' '}
            <span className={isDegraded ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-500'}>
              {health.state}
            </span>
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Capabilities
          </h2>
          <div className="mt-3">
            <CapabilityList capabilities={activeDriver.capabilities} />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Configuration
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {Object.entries(configSummary).map(([key, value]) =>
              value != null && value !== '' ? (
                <li key={key}>
                  {key}: <span className="text-foreground">{String(value)}</span>
                </li>
              ) : null,
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Driver Version
          </h2>
          <p className="mt-1 text-sm text-foreground">{activeDriver.version}</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Registered Providers
          </h2>
          <ul className="mt-2 space-y-3 text-sm">
            {registeredDrivers.map((driver) => (
              <li key={driver.driverId} className="text-foreground">
                <div>
                  {driver.displayName}{' '}
                  <span className="text-muted">({driver.driverId})</span>
                  {driver.isActive ? (
                    <span className="ml-2 text-xs text-emerald-500">active</span>
                  ) : null}
                  <span className="ml-2 text-xs text-muted">· {driver.health}</span>
                </div>
                <RegistrationCapabilities capabilities={driver.registrationCapabilities} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {metrics ? (
        <MetricsPanel
          metrics={metrics}
          onRefresh={() => void loadMetrics(true)}
          refreshing={refreshingMetrics}
        />
      ) : metricsError ? (
        <p className="text-sm text-muted">{metricsError}</p>
      ) : null}
    </div>
  );
}
