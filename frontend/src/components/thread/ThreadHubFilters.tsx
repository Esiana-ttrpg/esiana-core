import type { ThreadHubFilterState } from '@/lib/threadHubFilters';
import { THREAD_KINDS, THREAD_STATUSES } from '@/lib/threadMetadata';
import { THREAD_KIND_LABELS } from '@/lib/threadVisualTokens';
import { NarrativeLifecycleStates } from '@shared/narrativeLifecycle';

interface ThreadHubFiltersProps {
  filters: ThreadHubFilterState;
  isDM: boolean;
  onChange: (next: ThreadHubFilterState) => void;
}

export function ThreadHubFiltersPanel({
  filters,
  isDM,
  onChange,
}: ThreadHubFiltersProps) {
  return (
    <div className="w-64 space-y-3 p-1 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={filters.playerSubmittedOnly}
          onChange={(event) => {
            onChange({ ...filters, playerSubmittedOnly: event.target.checked });
          }}
        />
        Player theories only
      </label>
      <div>
        <p className="mb-1 font-medium text-muted">Kind</p>
        {THREAD_KINDS.map((kind) => (
          <label key={kind} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              checked={filters.kinds[kind]}
              onChange={() => {
                onChange({
                  ...filters,
                  kinds: { ...filters.kinds, [kind]: !filters.kinds[kind] },
                });
              }}
            />
            {THREAD_KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      <div>
        <p className="mb-1 font-medium text-muted">Status</p>
        {THREAD_STATUSES.map((status) => (
          <label key={status} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              checked={filters.statuses[status]}
              onChange={() => {
                onChange({
                  ...filters,
                  statuses: {
                    ...filters.statuses,
                    [status]: !filters.statuses[status],
                  },
                });
              }}
            />
            {status}
          </label>
        ))}
      </div>
      {isDM ? (
        <div>
          <p className="mb-1 font-medium text-muted">Lifecycle</p>
          {(Object.values(NarrativeLifecycleStates) as string[]).map((state) => (
            <label key={state} className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={filters.lifecycles[state as keyof typeof filters.lifecycles]}
                onChange={() => {
                  const key = state as keyof typeof filters.lifecycles;
                  onChange({
                    ...filters,
                    lifecycles: {
                      ...filters.lifecycles,
                      [key]: !filters.lifecycles[key],
                    },
                  });
                }}
              />
              {state}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
