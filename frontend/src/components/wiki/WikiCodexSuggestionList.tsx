import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';

interface WikiCodexSuggestionListProps {
  matches: WikiLinkIndexEntry[];
  onSelect: (entry: WikiLinkIndexEntry) => void;
  emptyLabel?: string;
}

export function WikiCodexSuggestionList({
  matches,
  onSelect,
  emptyLabel = 'No matches',
}: WikiCodexSuggestionListProps) {
  if (matches.length === 0) {
    return <li className="px-3 py-2 text-xs text-muted">{emptyLabel}</li>;
  }

  return (
    <>
      {matches.map((entry) => (
        <li key={`${entry.pageId}-${entry.label}`}>
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/30"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(entry);
            }}
          >
            {entry.label}
            {entry.label !== entry.title ? (
              <span className="ml-1 text-xs text-muted">({entry.title})</span>
            ) : null}
            {entry.templateType ? (
              <span className="ml-1 text-[10px] uppercase text-muted">
                {entry.templateType}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  );
}
