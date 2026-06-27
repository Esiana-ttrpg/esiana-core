import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { Info, Zap } from 'lucide-react';
import { fetchUserQuota, type UserQuota } from '@/lib/quota';

function formatReset(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function UserQuotaCard({
  docsHref = '/docs/api#rate-limits',
}: {
  docsHref?: string;
}) {
  const [data, setData] = useState<UserQuota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUserQuota()
      .then((resp) => {
        if (!cancelled) setData(resp);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load quota.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usagePct = data?.quota.usagePct ?? 0;
  const used = data?.quota.used ?? 0;
  const limit = data?.quota.limit ?? 0;
  const resetLabel = useMemo(
    () => (data ? formatReset(data.window.resetInMs) : ''),
    [data],
  );

  const barClass = usagePct >= 0.85 ? 'bg-primary' : 'bg-indigo-500';

  return (
    <section className="rounded-xl border border-border bg-surface/80 p-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-indigo-300" />
          <h3 className={META_SECTION_LABEL_CLASS}>
            API quota (account)
          </h3>
        </div>
        <a
          href={docsHref}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted hover:border-indigo-500/40 hover:text-indigo-200"
          title="View Rate Limit Specs"
        >
          <Info className="size-3.5" />
          View Rate Limit Specs
        </a>
      </div>

      <p className="mb-4 text-xs text-muted">
        Tracks API token traffic across your campaigns for the current UTC day.
      </p>

      {loading ? (
        <p className="text-sm text-muted">Loading quota…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !data ? (
        <p className="text-sm text-muted">No quota data available.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={META_SECTION_LABEL_CLASS}>
                Usage
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                {used.toLocaleString()} / {limit.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className={META_SECTION_LABEL_CLASS}>
                Cycle resets in
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-foreground">
                {resetLabel}
              </p>
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.max(2, Math.round(usagePct * 100))}%` }}
            />
          </div>

          <p className="text-xs text-muted">
            {Math.round(usagePct * 100)}% used · {data.quota.remaining.toLocaleString()} remaining
          </p>
        </div>
      )}
    </section>
  );
}
