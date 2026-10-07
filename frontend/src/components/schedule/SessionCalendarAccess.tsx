import { useCallback, useEffect, useState } from 'react';
import { CalendarSync, Copy, Download, RefreshCw, Unlink } from 'lucide-react';
import {
  SESSION_CALENDAR_DOWNLOAD_PATH,
  createCalendarSubscription,
  fetchCalendarSubscription,
  regenerateCalendarSubscription,
  revokeCalendarSubscription,
} from '@/lib/calendarSubscription';
import type { CalendarSubscriptionStatus } from '@/types/calendarSubscription';
import { META_SECTION_LABEL_CLASS, SURFACE_RECESSED_CLASS } from '@/lib/surfaceLayout';

type PendingAction = 'create' | 'regenerate' | 'revoke' | null;

export function SessionCalendarAccess() {
  const [subscription, setSubscription] = useState<
    CalendarSubscriptionStatus | null | undefined
  >(undefined);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStatusError(null);
    try {
      const result = await fetchCalendarSubscription();
      setSubscription(result.subscription);
    } catch (reason) {
      setSubscription(undefined);
      setStatusError(
        reason instanceof Error
          ? reason.message
          : 'Unable to load calendar subscription.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function issue(mode: 'create' | 'regenerate') {
    if (
      mode === 'regenerate' &&
      !window.confirm(
        'Regenerate your calendar subscription URL? The old URL will stop working immediately, and calendar apps using it will no longer receive updates.',
      )
    ) {
      return;
    }
    setPending(mode);
    setError(null);
    setCopied(false);
    try {
      const result =
        mode === 'create'
          ? await createCalendarSubscription()
          : await regenerateCalendarSubscription();
      setSubscription(result.subscription);
      setIssuedUrl(result.subscription.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create calendar subscription.');
    } finally {
      setPending(null);
    }
  }

  async function revoke() {
    if (
      !window.confirm(
        'Revoke your calendar subscription? Calendar apps using the current URL will stop receiving updates.',
      )
    ) {
      return;
    }
    setPending('revoke');
    setError(null);
    try {
      await revokeCalendarSubscription();
      setSubscription(null);
      setIssuedUrl(null);
      setCopied(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to revoke calendar subscription.');
    } finally {
      setPending(null);
    }
  }

  async function copyIssuedUrl() {
    if (!issuedUrl) return;
    try {
      await navigator.clipboard.writeText(issuedUrl);
      setCopied(true);
    } catch {
      setError('Unable to copy automatically. Select and copy the URL below.');
    }
  }

  return (
    <section className={`${SURFACE_RECESSED_CLASS} space-y-4 rounded-xl p-5`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <CalendarSync className="size-5 text-primary/80" aria-hidden />
          <h2 className={META_SECTION_LABEL_CLASS}>Session Calendar</h2>
        </div>
        <p className="text-sm text-muted">
          Keep your upcoming Esiana sessions in your preferred calendar app.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {subscription === undefined
                ? 'Calendar subscription'
                : subscription
                  ? 'Calendar subscription: Active'
                  : 'Subscribe to calendar'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {subscription === undefined
                ? 'Check whether your private calendar subscription is active.'
                : subscription
                ? 'Your calendar stays synchronized. The existing private URL cannot be shown again.'
                : 'Automatically keeps sessions up to date. Anyone with the private URL can view your calendar.'}
            </p>
          </div>

          {issuedUrl ? (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <p className="text-xs text-foreground">
                Copy this URL now. It will not be shown again.
              </p>
              <div className="flex items-start gap-2">
                <input
                  readOnly
                  aria-label="Calendar subscription URL"
                  value={issuedUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground"
                />
                <button
                  type="button"
                  onClick={() => void copyIssuedUrl()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <Copy className="size-3.5" aria-hidden />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <p className="text-xs text-muted">Checking subscription…</p>
          ) : statusError ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {statusError}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-elevated"
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Retry
              </button>
            </div>
          ) : subscription ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void issue('regenerate')}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {pending === 'regenerate' ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void revoke()}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Unlink className="size-3.5" aria-hidden />
                {pending === 'revoke' ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ) : subscription === null ? (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void issue('create')}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              <CalendarSync className="size-4" aria-hidden />
              {pending === 'create' ? 'Creating subscription…' : 'Subscribe to calendar'}
            </button>
          ) : null}
        </div>

        <div className="space-y-3 md:border-l md:border-border/40 md:pl-5">
          <div>
            <p className="text-sm font-medium text-foreground">Download .ics</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Download a one-time copy of your current session calendar.
            </p>
          </div>
          <a
            href={SESSION_CALENDAR_DOWNLOAD_PATH}
            download="esiana-sessions.ics"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated"
          >
            <Download className="size-4" aria-hidden />
            Download calendar (.ics)
          </a>
        </div>
      </div>
    </section>
  );
}
