import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';
import type { BracketSuggestionState } from './extensions/wikiBracketSuggestionPlugin';
import { resolveWikiSuggestion } from './extensions/wikiReferenceInsertion';
import { WikiCodexSuggestionList } from './WikiCodexSuggestionList';

interface WikiBracketSuggestionPopoverProps {
  portalContainer?: Element;
  state: BracketSuggestionState;
  index: WikiLinkIndexEntry[];
  onSelect: (entry: WikiLinkIndexEntry) => void;
  onCreateStub?: (label: string) => void;
  onClose: () => void;
}

export function WikiBracketSuggestionPopover({
  state,
  portalContainer,
  index,
  onSelect,
  onCreateStub,
  onClose,
}: WikiBracketSuggestionPopoverProps) {
  const matches = resolveWikiSuggestion(state.query, index);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [state.query]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      else if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); setSelectedIndex((value) => (value + 1) % matches.length); }
      else if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); setSelectedIndex((value) => (value - 1 + matches.length) % matches.length); }
      else if (event.key === 'Enter' && matches[selectedIndex]) { event.preventDefault(); onSelect(matches[selectedIndex]); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [matches, selectedIndex, onSelect, onClose]);

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
      <div className={`border-b border-border px-3 py-2 ${META_SECTION_LABEL_CLASS}`}>
        Link to codex
      </div>
      <ul className="max-h-48 overflow-y-auto py-1">
        <WikiCodexSuggestionList
          matches={matches}
          selectedIndex={selectedIndex}
          onHighlight={setSelectedIndex}
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
    portalContainer ?? document.body,
  );
}
