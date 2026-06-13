import { useEffect, useState } from 'react';
import { Activity, BarChart3, Shield, Siren, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchAdminUsageAnalytics,
  fetchTopApiUsage,
  type AdminUsageAnalytics,
  type ApiUsageLeader,
} from '@/lib/adminAnalytics';

function displayName(leader: ApiUsageLeader): string {
  return leader.displayName?.trim() || leader.email;
}

export function UsageAnalyticsPage() {
  const [leaders, setLeaders] = useState<ApiUsageLeader[]>([]);
  const [analytics, setAnalytics] = useState<AdminUsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchAdminUsageAnalytics(), fetchTopApiUsage()])
      .then(([metrics, rows]) => {
        if (cancelled) return;
        setAnalytics(metrics);
        setLeaders(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load API usage.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const maxCount = leaders[0]?.requestCount ?? 1;
  const maxHour =
    analytics?.trafficByHour.reduce((m, row) => Math.max(m, row.count), 0) ?? 1;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            API Usage
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <BarChart3 className="size-4 shrink-0" />
          Global infrastructure health, quota pressure, and abuse monitoring.
        </p>
      </header>

      {loading && <LoadingSpinner label="Loading usage analytics…" />}

      {error && !loading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && !analytics && (
        <p className="rounded-lg border border-border bg-surface/40 px-4 py-6 text-center text-sm text-muted">
          No usage telemetry recorded yet.
        </p>
      )}

      {!loading && !error && analytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Requests (last 24h)
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-foreground">
              {analytics.totals.totalRequests.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted">
              Window: {new Date(analytics.window.start).toLocaleString()} →{' '}
              {new Date(analytics.window.end).toLocaleString()} (UTC)
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                Rate-limit drops
              </p>
              <Siren className="size-4 text-primary/80" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold text-primary">
              {analytics.totals.tooManyRequests.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted">
              Count of HTTP 429 responses across the platform.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200/80">
                Health signal
              </p>
              <TrendingUp className="size-4 text-indigo-300/80" />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {analytics.totals.tooManyRequests > 0
                ? 'Active throttling observed'
                : 'No throttling observed'}
            </p>
            <p className="mt-2 text-xs text-muted">
              Use spikers + hourly volume to locate bursts.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && analytics && (
        <section className="rounded-xl border border-border bg-surface/60 p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Traffic volume (hourly)
            </h2>
            <span className="text-xs text-muted">Last 24h · UTC</span>
          </div>
          <div className="grid grid-cols-24 items-end gap-1">
            {analytics.trafficByHour.map((row) => {
              const pct = Math.max(2, Math.round((row.count / maxHour) * 100));
              return (
                <div key={row.ts} className="group h-28 rounded bg-background/70">
                  <div
                    className="h-full w-full rounded bg-indigo-500/60"
                    style={{ height: `${pct}%` }}
                    title={`${new Date(row.ts).toLocaleString()} UTC: ${row.count.toLocaleString()} requests`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            This is a structural visualization (fast to render, no charting dependency).
          </p>
        </section>
      )}

      {!loading && !error && analytics && (
        <section className="rounded-xl border border-border bg-surface/60 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Top resource spikers (campaigns)
          </h2>
          {analytics.topSpikers.length === 0 ? (
            <p className="text-sm text-muted">No campaign-scoped traffic recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analytics.topSpikers.map((row) => (
                <div
                  key={row.campaignId}
                  className="rounded-lg border border-border bg-background/60 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Campaign
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {row.campaignId}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {row.requestCount.toLocaleString()} requests
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && !error && leaders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Top developer accounts (tracked endpoints)
          </h2>
          <ol className="space-y-3">
          {leaders.map((leader, index) => {
            const widthPct = Math.max(
              8,
              Math.round((leader.requestCount / maxCount) * 100),
            );
            return (
              <li
                key={leader.userId}
                className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-surface/60 px-5 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary/90">
                      #{index + 1}
                    </p>
                    <p className="mt-1 truncate text-lg font-bold text-foreground">
                      {displayName(leader)}
                    </p>
                    <p className="truncate text-xs text-muted">{leader.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1 text-xs uppercase tracking-wider text-muted">
                      <Activity className="size-3.5" />
                      Requests
                    </p>
                    <p className="font-mono text-3xl font-bold text-primary">
                      {leader.requestCount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
          </ol>
        </section>
      )}
    </div>
  );
}
