import { useMemo, useState } from 'react';
import type { ForeshadowingStage } from '@shared/narrativeForeshadowingTracker';
import type { StoryThreadHistoryProjection } from '@shared/storyThreadHistoryProjection';
import type { ThreadKind } from '@shared/threadMetadata';
import { StoryThreadHistoryCard } from '@/components/adventure/StoryThreadHistoryCard';
import { FORESHADOWING_STAGE_LABELS } from '@/lib/storyThreadHistoryVisualTokens';

interface StoryThreadHistorySectionProps {
  campaignHandle: string;
  data?: StoryThreadHistoryProjection;
}

const STAGE_FILTER_OPTIONS: Array<{ value: ForeshadowingStage | 'all'; label: string }> = [
  { value: 'all', label: 'All stages' },
  { value: 'introduced', label: FORESHADOWING_STAGE_LABELS.introduced },
  { value: 'reinforced', label: FORESHADOWING_STAGE_LABELS.reinforced },
  { value: 'payoff_pending', label: FORESHADOWING_STAGE_LABELS.payoff_pending },
  { value: 'resolved', label: FORESHADOWING_STAGE_LABELS.resolved },
  { value: 'abandoned', label: FORESHADOWING_STAGE_LABELS.abandoned },
];

export function StoryThreadHistorySection({
  campaignHandle,
  data,
}: StoryThreadHistorySectionProps) {
  const projection = data ?? {
    threads: [],
    stageCounts: {
      introduced: 0,
      reinforced: 0,
      payoff_pending: 0,
      resolved: 0,
      abandoned: 0,
    },
    kindFilterOptions: [],
    anchorSessionId: null,
  };

  const [kindFilter, setKindFilter] = useState<Set<ThreadKind> | null>(null);
  const [stageFilter, setStageFilter] = useState<ForeshadowingStage | 'all'>('all');

  const effectiveKindFilter = useMemo(() => {
    if (kindFilter != null) return kindFilter;
    return new Set(projection.kindFilterOptions.map((option) => option.kind));
  }, [kindFilter, projection.kindFilterOptions]);

  const filteredThreads = useMemo(() => {
    return projection.threads.filter((entry) => {
      if (effectiveKindFilter.size > 0 && !effectiveKindFilter.has(entry.threadKind)) {
        return false;
      }
      if (stageFilter !== 'all' && entry.stage !== stageFilter) return false;
      return true;
    });
  }, [effectiveKindFilter, projection.threads, stageFilter]);

  function toggleKind(kind: ThreadKind) {
    setKindFilter((current) => {
      const base =
        current ?? new Set(projection.kindFilterOptions.map((option) => option.kind));
      const next = new Set(base);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }

  const activeThreadCount = projection.threads.filter(
    (entry) => entry.stage !== 'resolved' && entry.stage !== 'abandoned',
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Thread History</h2>
        <p className="text-sm text-muted-foreground">
          Foreshadowing progression across sessions — setup, reminders, payoff, and resolution.
          {projection.threads.length > 0
            ? ` ${activeThreadCount} active thread${activeThreadCount === 1 ? '' : 's'}.`
            : null}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-elevated/20 p-3">
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Kind
          </span>
          <div className="flex flex-wrap gap-1">
            {projection.kindFilterOptions.map((option) => {
              const active = effectiveKindFilter.has(option.kind);
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => toggleKind(option.kind)}
                  className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-elevated/60'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Stage
          </span>
          <select
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value as ForeshadowingStage | 'all')
            }
            className="block rounded border border-border bg-surface px-2 py-1 text-sm"
          >
            {STAGE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredThreads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {projection.threads.length === 0
            ? 'No tracked narrative threads yet. Create mysteries, promises, or foreshadowing threads in Threads Hub and assign session metadata on each thread page.'
            : 'No threads match the current filters.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredThreads.map((entry) => (
            <li key={entry.threadPageId}>
              <StoryThreadHistoryCard campaignHandle={campaignHandle} entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
