import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  dismissVisitSuggestion,
  fetchSinceLastVisit,
  fetchVisitSuggestions,
  markPartyVisited,
  promoteVisitSuggestion,
} from '@/lib/visitSnapshotsApi';
import type { RegionDiffV1, VisitSuggestion } from '@/types/visitSnapshots';

type SinceLastVisitPanelProps = {
  campaignHandle: string;
  locationPageId: string;
  memberRole?: string;
};

export function SinceLastVisitPanel({
  campaignHandle,
  locationPageId,
  memberRole,
}: SinceLastVisitPanelProps) {
  const { can } = useWiki();
  const canMark = can(CampaignCapabilities.CHRONOLOGY_EDIT);
  const isDm = memberRole === 'GAMEMASTER' || memberRole === 'WRITER';

  const [diff, setDiff] = useState<RegionDiffV1 | null>(null);
  const [suggestions, setSuggestions] = useState<VisitSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVisit, setHasVisit] = useState<boolean | null>(null);

  const loadDiff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSinceLastVisit(
        campaignHandle,
        locationPageId,
        isDm ? 'GAMEMASTER' : undefined,
      );
      setDiff(result);
      setHasVisit(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        setHasVisit(false);
        setDiff(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, isDm, locationPageId]);

  const loadSuggestions = useCallback(async () => {
    if (!isDm) return;
    try {
      const res = await fetchVisitSuggestions(campaignHandle, locationPageId);
      setSuggestions(res.suggestions);
    } catch {
      setSuggestions([]);
    }
  }, [campaignHandle, isDm, locationPageId]);

  useEffect(() => {
    void loadDiff();
    void loadSuggestions();
  }, [loadDiff, loadSuggestions]);

  const handleMarkVisited = async () => {
    setLoading(true);
    setError(null);
    try {
      await markPartyVisited(campaignHandle, locationPageId);
      await loadDiff();
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark visit');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (suggestionId: string) => {
    try {
      await promoteVisitSuggestion(campaignHandle, locationPageId, suggestionId);
      await loadDiff();
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote');
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await dismissVisitSuggestion(campaignHandle, locationPageId, suggestionId);
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 text-muted" aria-hidden />
        Since last visit
      </div>

      {canMark ? (
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={loading}
          onClick={() => void handleMarkVisited()}
        >
          Mark party visited
        </button>
      ) : null}

      {isDm && suggestions.length > 0 ? (
        <div className="space-y-2 text-xs">
          <p className="text-muted uppercase tracking-wide">Suggested visits</p>
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded border border-border/60 px-2 py-1.5"
            >
              <span>{s.sourceLabel ?? 'Session'} may have visited here</span>
              <button
                type="button"
                className="text-primary underline"
                onClick={() => void handlePromote(s.id)}
              >
                Promote
              </button>
              <button
                type="button"
                className="text-muted underline"
                onClick={() => void handleDismiss(s.id)}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {loading && !diff ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : null}

      {hasVisit === false ? (
        <p className="text-xs text-muted">
          No canonical visit recorded yet.{' '}
          {canMark ? 'Mark party visited to capture a baseline.' : ''}
        </p>
      ) : null}

      {diff ? (
        <div className="space-y-2">
          {isDm && diff.versionWarnings && diff.versionWarnings.length > 0 ? (
            <div className="flex gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
              <ul className="list-disc pl-4 space-y-1">
                {diff.versionWarnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {diff.summaryLines.length > 0 ? (
            <ul className="list-disc pl-4 text-sm space-y-1">
              {diff.summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">No notable changes since your last visit.</p>
          )}

          {isDm && diff.truncation ? (
            <p className="text-xs text-muted">
              Some facets were truncated at capture due to region size limits.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
