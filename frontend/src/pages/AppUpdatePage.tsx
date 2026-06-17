import { ExternalLink, RefreshCw, Shield, ArrowUpCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { formatProductVersionLabel } from '@/lib/adminVersionUi';

export function AppUpdatePage() {
  const { result, loading, error, isUpdateAvailable, refresh } =
    useVersionCheck();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Update Core
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <ArrowUpCircle className="size-4 shrink-0" />
          Compare this instance against the latest Esiana core release on GitHub.
        </p>
      </header>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm font-medium text-foreground hover:border-border hover:bg-elevated/80 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Check again
        </button>
      </div>

      {loading && !result && (
        <LoadingSpinner label="Checking GitHub for releases…" />
      )}

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Installed version
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-foreground">
              {formatProductVersionLabel(result.currentVersion)}
            </p>
            {result.latestVersion && (
              <p className="mt-3 text-sm text-muted">
                Latest published on GitHub:{' '}
                <span className="font-mono text-foreground">
                  {formatProductVersionLabel(result.latestVersion)}
                </span>
              </p>
            )}
            {!result.latestVersion && !loading && (
              <p className="mt-3 text-sm text-muted">
                No published GitHub releases found yet, or the API is unavailable.
              </p>
            )}
          </section>

          {isUpdateAvailable && (
            <div
              role="alert"
              className="rounded-xl border-2 border-primary bg-primary px-5 py-4 text-background shadow-lg shadow-primary/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-background/80">
                    Update available
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    Esiana core{' '}
                    {result.latestVersion
                      ? formatProductVersionLabel(result.latestVersion)
                      : 'update'}{' '}
                    is ready
                  </p>
                  <p className="mt-1 text-sm text-background/90">
                    Your instance is on{' '}
                    {formatProductVersionLabel(result.currentVersion)}. Review the
                    release notes below, then deploy from the official repository.
                  </p>
                </div>
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-background px-4 py-2 text-sm font-semibold text-primary hover:bg-surface transition-colors"
                  >
                    View release
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {!isUpdateAvailable && result.latestVersion && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              You are up to date with the latest published release (
              {formatProductVersionLabel(result.latestVersion)}).
            </p>
          )}

          {isUpdateAvailable && result.changelog && (
            <section className="rounded-xl border border-border bg-surface/40 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                Release notes
              </h2>
              <div className="mt-4">
                <WikiMarkdown
                  content={result.changelog}
                  emptyLabel="No release notes provided."
                />
              </div>
            </section>
          )}

          {isUpdateAvailable && !result.changelog && result.htmlUrl && (
            <section className="rounded-xl border border-border bg-surface/40 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                Release notes
              </h2>
              <p className="mt-4 text-sm text-muted">
                Release notes are available on GitHub.
              </p>
              <a
                href={result.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View release notes on GitHub
                <ExternalLink className="size-4" />
              </a>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
