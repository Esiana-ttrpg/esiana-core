import { QUEST_TYPE_PRESETS } from '@/lib/questMetadata';
import {
  DEFAULT_QUEST_HUB_STATUS_FILTERS,
  DEFAULT_QUEST_HUB_TYPE_FILTERS,
  QUEST_HUB_STATUS_FILTER_OPTIONS,
  type QuestHubStatusFilters,
  type QuestHubTypeFilters,
} from '@/lib/questHubFilters';

interface QuestHubFiltersProps {
  statusFilters: QuestHubStatusFilters;
  typeFilters: QuestHubTypeFilters;
  onStatusFiltersChange: (next: QuestHubStatusFilters) => void;
  onTypeFiltersChange: (next: QuestHubTypeFilters) => void;
  /** Board view uses columns for status — hide status toggles there. */
  showStatusFilters?: boolean;
}

function chipClass(active: boolean): string {
  return active
    ? 'bg-primary/15 text-primary'
    : 'text-muted hover:text-foreground';
}

export function QuestHubFilters({
  statusFilters,
  typeFilters,
  onStatusFiltersChange,
  onTypeFiltersChange,
  showStatusFilters = true,
}: QuestHubFiltersProps) {
  const defaultsDiffer =
    showStatusFilters &&
    (QUEST_HUB_STATUS_FILTER_OPTIONS.some(
      (o) => statusFilters[o.id] !== DEFAULT_QUEST_HUB_STATUS_FILTERS[o.id],
    ) ||
      QUEST_TYPE_PRESETS.some(
        (p) => typeFilters[p] !== DEFAULT_QUEST_HUB_TYPE_FILTERS[p],
      ));

  const typeOnlyDefaultsDiffer = QUEST_TYPE_PRESETS.some(
    (p) => typeFilters[p] !== DEFAULT_QUEST_HUB_TYPE_FILTERS[p],
  );

  const showReset = showStatusFilters ? defaultsDiffer : typeOnlyDefaultsDiffer;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted">
      {showStatusFilters && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 font-medium uppercase tracking-wide">Status</span>
          {QUEST_HUB_STATUS_FILTER_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 transition-colors ${chipClass(statusFilters[option.id])}`}
            >
              <input
                type="checkbox"
                className="size-2.5 accent-primary"
                checked={statusFilters[option.id]}
                onChange={(event) =>
                  onStatusFiltersChange({
                    ...statusFilters,
                    [option.id]: event.target.checked,
                  })
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      )}

      {showStatusFilters && (
        <span className="hidden text-border sm:inline" aria-hidden>
          |
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <span className="shrink-0 font-medium uppercase tracking-wide">Type</span>
        {QUEST_TYPE_PRESETS.map((preset) => (
          <label
            key={preset}
            className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 transition-colors ${chipClass(typeFilters[preset])}`}
          >
            <input
              type="checkbox"
              className="size-2.5 accent-primary"
              checked={typeFilters[preset]}
              onChange={(event) =>
                onTypeFiltersChange({
                  ...typeFilters,
                  [preset]: event.target.checked,
                })
              }
            />
            {preset}
          </label>
        ))}
      </div>

      {showReset && (
        <button
          type="button"
          onClick={() => {
            if (showStatusFilters) {
              onStatusFiltersChange({ ...DEFAULT_QUEST_HUB_STATUS_FILTERS });
            }
            onTypeFiltersChange({ ...DEFAULT_QUEST_HUB_TYPE_FILTERS });
          }}
          className="text-[10px] text-muted underline-offset-2 hover:text-primary hover:underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export {
  DEFAULT_QUEST_HUB_STATUS_FILTERS,
  DEFAULT_QUEST_HUB_TYPE_FILTERS,
};
