import type { OperatorSuggestion } from '@/lib/globalSearchOperatorSuggest';

interface GlobalSearchOperatorSuggestionsProps {
  suggestions: OperatorSuggestion[];
  activeIndex: number;
  onSelect: (suggestion: OperatorSuggestion) => void;
  onHover: (index: number) => void;
}

export function GlobalSearchOperatorSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  onHover,
}: GlobalSearchOperatorSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Operator suggestions"
      className="absolute left-0 right-0 top-full z-10 max-h-48 overflow-y-auto rounded-b-lg border border-border/40 bg-overlay-elevated shadow-lg"
    >
      {suggestions.map((suggestion, index) => {
        const active = index === activeIndex;
        return (
          <li key={`${suggestion.insertValue}:${suggestion.detail ?? ''}:${index}`} role="option" aria-selected={active}>
            <button
              type="button"
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${
                active ? 'bg-elevated text-foreground' : 'text-foreground hover:bg-elevated/60'
              }`}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(suggestion)}
            >
              <span className="truncate font-medium">{suggestion.label}</span>
              {suggestion.detail ? (
                <span className="shrink-0 text-xs text-muted">{suggestion.detail}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
