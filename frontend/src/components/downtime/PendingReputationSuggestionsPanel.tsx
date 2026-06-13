import { useState } from 'react';
import type { ReputationSuggestionLine } from '@shared/downtimeHub';

interface PendingReputationSuggestionsPanelProps {
  suggestions: ReputationSuggestionLine[];
  onAccept: (suggestion: ReputationSuggestionLine, narrative?: string | null) => void;
  onDismiss: (suggestion: ReputationSuggestionLine) => void;
}

export function PendingReputationSuggestionsPanel({
  suggestions,
  onAccept,
  onDismiss,
}: PendingReputationSuggestionsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNarrative, setEditNarrative] = useState('');

  if (suggestions.length === 0) return null;

  function startEdit(suggestion: ReputationSuggestionLine) {
    setEditingId(suggestion.id);
    setEditNarrative(suggestion.narrative ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNarrative('');
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Pending reputation shifts</h3>
        <span className="text-xs text-muted-foreground">
          {suggestions.length} awaiting review
        </span>
      </div>
      <ul className="space-y-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="rounded-md border border-border/70 bg-background/80 px-3 py-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {suggestion.factionTitle}{' '}
                  <span className="text-muted-foreground">
                    {suggestion.directionArrow} {suggestion.toBand ?? suggestion.title}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {suggestion.kind.replace('_', ' ')}
                  {suggestion.fromBand ? ` · ${suggestion.fromBand} → ${suggestion.toBand}` : ''}
                </p>
                {editingId !== suggestion.id && suggestion.narrative ? (
                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.narrative}</p>
                ) : null}
              </div>
              {suggestion.canResolve ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      editingId === suggestion.id
                        ? onAccept(suggestion, editNarrative || null)
                        : onAccept(suggestion)
                    }
                    className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editingId === suggestion.id ? cancelEdit() : startEdit(suggestion)
                    }
                    className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
                  >
                    {editingId === suggestion.id ? 'Cancel' : 'Edit'}
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
            </div>
            {editingId === suggestion.id ? (
              <label className="mt-2 block space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Narrative reason
                </span>
                <textarea
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  rows={2}
                  value={editNarrative}
                  onChange={(e) => setEditNarrative(e.target.value)}
                />
              </label>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
