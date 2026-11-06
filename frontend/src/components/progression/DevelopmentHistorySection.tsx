import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DevelopmentHistoryRow } from '@shared/worldDevelopmentPresentation';
import type { WorldEventSuggestionTerminalStatus } from '@shared/worldEventSuggestionMetadata';
import {
  fetchDevelopmentHistory,
  requeueArchivedDevelopment,
} from '@/lib/worldDevelopmentApi';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { WorkspaceActionBar } from '@/components/layout/WorkspaceActionBar';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';

const FILTERS: { id: WorldEventSuggestionTerminalStatus; label: string }[] = [
  { id: 'accepted', label: 'Accepted' },
  { id: 'dismissed', label: 'Rejected' },
  { id: 'archived', label: 'Archived' },
  { id: 'obsolete', label: 'Obsolete' },
];

interface DevelopmentHistorySectionProps {
  campaignHandle: string;
}

export function DevelopmentHistorySection({ campaignHandle }: DevelopmentHistorySectionProps) {
  const { canManageWiki } = useWiki();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<DevelopmentHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [activeFilters, setActiveFilters] = useState<WorldEventSuggestionTerminalStatus[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDevelopmentHistory(campaignHandle, {
        status: activeFilters.length > 0 ? activeFilters : undefined,
        q: query.trim() || undefined,
      });
      if (currentRequest === requestId.current) setHistory(data.history);
    } catch (err) {
      if (currentRequest === requestId.current) {
        setHistory([]);
        setError(err instanceof Error ? err.message : 'Failed to load development history');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [activeFilters, campaignHandle, query]);

  useEffect(() => {
    if (!canManageWiki) {
      setLoading(false);
      setHistory([]);
      return;
    }
    void load();
    return () => { requestId.current += 1; };
  }, [canManageWiki, load]);

  if (!canManageWiki) {
    return null;
  }

  function toggleFilter(id: WorldEventSuggestionTerminalStatus) {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      <WorkspaceHeader compact title="History" subtitle="What developments happened?" actions={
        <WorkspaceActionBar refine={<CategoryIndexRefinePopover
          mobileFullWidth
          facetDefs={[]}
          refineState={{}}
          children={[]}
          categoryTitle="Development history"
          onRefineChange={() => {}}
          activeCount={activeFilters.length + Number(Boolean(query.trim()))}
          searchQuery={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search developments…"
          onResetRefine={() => { setActiveFilters([]); setQuery(''); }}
          customBody={<div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button key={filter.id} type="button" aria-pressed={activeFilters.includes(filter.id)}
                onClick={() => toggleFilter(filter.id)}
                className={`rounded-full border px-3 py-1 text-xs ${activeFilters.includes(filter.id)
                  ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                {filter.label}
              </button>
            ))}
          </div>}
        />} />
      } />

      {loading ? (
        <LoadingSpinner label="Loading history…" />
      ) : error ? (
        <div role="alert" className="text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 underline">Try again</button>
        </div>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching history entries.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((row) => (
            <li key={row.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{row.title}</span>
                <span className="text-xs text-muted-foreground">{row.statusLabel}</span>
              </div>
              {row.scopeLabel ? (
                <p className="text-xs text-muted-foreground">{row.scopeLabel}</p>
              ) : null}
              {row.obsoleteReason ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">{row.obsoleteReason}</p>
              ) : null}
              {row.resultSummary ? (
                <p className="mt-1 text-xs text-muted-foreground">{row.resultSummary}</p>
              ) : null}
              {row.acceptedEventHref ? (
                <Link to={row.acceptedEventHref} className="text-xs text-primary hover:underline">
                  View canon event
                </Link>
              ) : null}
              {row.status === 'archived' ? (
                <button
                  type="button"
                  className="mt-1 text-xs text-primary hover:underline"
                  onClick={() =>
                    void requeueArchivedDevelopment(campaignHandle, row.id)
                      .then(load)
                      .catch((err) => console.error('Failed to re-queue development', err))
                  }
                >
                  Re-queue to inbox
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
