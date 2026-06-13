import type { LedgerSuggestionLine } from '@shared/downtimeHub';

interface PendingTreasurySuggestionsPanelProps {
  suggestions: LedgerSuggestionLine[];
  currencySuffix: string;
  onAccept: (suggestion: LedgerSuggestionLine) => void;
  onEdit: (suggestion: LedgerSuggestionLine) => void;
  onDismiss: (suggestion: LedgerSuggestionLine) => void;
}

export function PendingTreasurySuggestionsPanel({
  suggestions,
  currencySuffix,
  onAccept,
  onEdit,
  onDismiss,
}: PendingTreasurySuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Pending treasury events</h3>
        <span className="text-xs text-muted-foreground">
          {suggestions.length} awaiting review
        </span>
      </div>
      <ul className="space-y-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/70 bg-background/80 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {suggestion.amountLabel ??
                  `Amount needed — edit before accepting (${currencySuffix})`}
                {' · '}
                {suggestion.categoryLabel}
                {suggestion.confidence === 'inferred' ? ' · inferred' : ''}
              </p>
              {suggestion.narrative ? (
                <p className="mt-1 text-xs text-muted-foreground">{suggestion.narrative}</p>
              ) : null}
            </div>
            {suggestion.canResolve ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={suggestion.amount == null}
                  title={
                    suggestion.amount == null
                      ? 'Edit to set an amount before accepting'
                      : undefined
                  }
                  onClick={() => onAccept(suggestion)}
                  className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(suggestion)}
                  className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(suggestion)}
                  className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
