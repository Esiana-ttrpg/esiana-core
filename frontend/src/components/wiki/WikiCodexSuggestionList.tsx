import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';
import { formatWikiPageKind } from '@/lib/formatWikiPageKind';

interface WikiCodexSuggestionListProps {
  matches: WikiLinkIndexEntry[];
  onSelect: (entry: WikiLinkIndexEntry) => void;
  emptyLabel?: string;
  selectedIndex?: number;
  onHighlight?: (index: number) => void;
}

export function WikiCodexSuggestionList({
  matches,
  onSelect,
  emptyLabel = 'No matches',
  selectedIndex,
  onHighlight,
}: WikiCodexSuggestionListProps) {
  if (matches.length === 0) {
    return <li className="px-3 py-2 text-xs text-muted">{emptyLabel}</li>;
  }

  return (
    <>
      {matches.map((entry, index) => (
        <li key={`${entry.pageId}-${entry.label}`}>
          <button
            type="button"
            role="option"
            aria-selected={selectedIndex === index}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted/30 ${selectedIndex === index ? 'bg-primary/10' : ''}`}
            onMouseEnter={() => onHighlight?.(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(entry);
            }}
          >
            {entry.label}
            {entry.label !== entry.title ? (
              <span className="ml-1 text-xs text-muted">({entry.title})</span>
            ) : null}
            {entry.templateType && entry.templateType !== 'DEFAULT' ? (
              <span className="ml-1 text-[10px] uppercase text-muted">
                {formatWikiPageKind(entry.templateType)}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  );
}
