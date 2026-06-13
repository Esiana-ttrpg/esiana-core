import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorldEventSuggestionLine } from '@shared/downtimeHub';
import {
  formatAwaitingReviewCount,
  WORLD_EVENT_CREATE_BUTTON,
  WORLD_EVENT_EDIT_BUTTON,
  WORLD_EVENT_IGNORE_BUTTON,
  WORLD_EVENT_PROMPTS_PANEL_TITLE,
} from '@shared/worldPressurePresentation';

interface PendingWorldEventPromptsPanelProps {
  suggestions: WorldEventSuggestionLine[];
  onCreate: (
    suggestion: WorldEventSuggestionLine,
    input?: { title?: string | null; narrative?: string | null },
  ) => void;
  onIgnore: (suggestion: WorldEventSuggestionLine) => void;
}

export function PendingWorldEventPromptsPanel({
  suggestions,
  onCreate,
  onIgnore,
}: PendingWorldEventPromptsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNarrative, setEditNarrative] = useState('');

  if (suggestions.length === 0) return null;

  function startEdit(suggestion: WorldEventSuggestionLine) {
    setEditingId(suggestion.id);
    setEditTitle(suggestion.title);
    setEditNarrative(suggestion.narrative ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditNarrative('');
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{WORLD_EVENT_PROMPTS_PANEL_TITLE}</h3>
        <span className="text-xs text-muted-foreground">
          {formatAwaitingReviewCount(suggestions.length)}
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
                  {suggestion.orgTitle ? (
                    <Link to={suggestion.orgHref ?? '#'} className="hover:text-primary">
                      {suggestion.orgTitle}
                    </Link>
                  ) : (
                    suggestion.title
                  )}
                  {suggestion.momentumLabel ? (
                    <span className="text-muted-foreground"> — {suggestion.momentumLabel}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.kindLabel}</p>
                {editingId !== suggestion.id && suggestion.narrative ? (
                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.narrative}</p>
                ) : null}
                {editingId === suggestion.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      placeholder="Event title"
                    />
                    <textarea
                      value={editNarrative}
                      onChange={(e) => setEditNarrative(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      placeholder="What happened in the world?"
                    />
                  </div>
                ) : null}
              </div>
              {suggestion.canResolve ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      editingId === suggestion.id
                        ? onCreate(suggestion, {
                            title: editTitle || null,
                            narrative: editNarrative || null,
                          })
                        : onCreate(suggestion)
                    }
                    className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
                  >
                    {WORLD_EVENT_CREATE_BUTTON}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editingId === suggestion.id ? cancelEdit() : startEdit(suggestion)
                    }
                    className="rounded border border-border px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
                  >
                    {WORLD_EVENT_EDIT_BUTTON}
                  </button>
                  <button
                    type="button"
                    onClick={() => onIgnore(suggestion)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    {WORLD_EVENT_IGNORE_BUTTON}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
