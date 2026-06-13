import { createPortal } from 'react-dom';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';
import type { BracketSuggestionState } from './extensions/wikiBracketSuggestionPlugin';
import { resolveWikiSuggestion } from './extensions/wikiReferenceInsertion';
import { WikiCodexSuggestionList } from './WikiCodexSuggestionList';

interface WikiBracketSuggestionPopoverProps {
  state: BracketSuggestionState;
  index: WikiLinkIndexEntry[];
  onSelect: (entry: WikiLinkIndexEntry) => void;
  onCreateStub?: (label: string) => void;
  onClose: () => void;
}

export function WikiBracketSuggestionPopover({
  state,
  index,
  onSelect,
  onCreateStub,
  onClose,
}: WikiBracketSuggestionPopoverProps) {
  const matches = resolveWikiSuggestion(state.query, index);

  return createPortal(
    <div
      className="fixed z-[200] min-w-[220px] max-w-sm rounded-lg border border-border bg-background shadow-lg"
      style={{ top: state.top, left: state.left }}
      role="listbox"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        Link to codex
      </div>
      <ul className="max-h-48 overflow-y-auto py-1">
        <WikiCodexSuggestionList
          matches={matches}
          onSelect={(entry) => {
            onSelect(entry);
            onClose();
          }}
        />
      </ul>
      {state.query.trim() && onCreateStub ? (
        <button
          type="button"
          className="w-full border-t border-border px-3 py-2 text-left text-xs text-primary hover:bg-muted/20"
          onMouseDown={(e) => {
            e.preventDefault();
            onCreateStub(state.query.trim());
            onClose();
          }}
        >
          Create stub “{state.query.trim()}”
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
