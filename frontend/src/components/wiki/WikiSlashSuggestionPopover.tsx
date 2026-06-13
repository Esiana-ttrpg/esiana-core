import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WikiLinkIndexEntry } from '@/lib/wikiLoreGraph';
import type { SlashSuggestionState } from './extensions/slashSuggestionPlugin';
import {
  getRecentReferencePageIds,
  resolveWikiSuggestionSections,
  type ResolveWikiSuggestionOptions,
} from './extensions/wikiReferenceInsertion';
import { WikiCodexSuggestionList } from './WikiCodexSuggestionList';

type SlashMode = 'default' | 'codex-browse';

interface WikiSlashSuggestionPopoverProps {
  state: SlashSuggestionState;
  index: WikiLinkIndexEntry[];
  suggestionOptions?: Omit<ResolveWikiSuggestionOptions, 'limit'>;
  onSelect: (entry: WikiLinkIndexEntry) => void;
  onCreateStub?: (label: string) => void;
  onMentionPlayer: () => void;
  onClose: () => void;
}

export function WikiSlashSuggestionPopover({
  state,
  index,
  suggestionOptions,
  onSelect,
  onCreateStub,
  onMentionPlayer,
  onClose,
}: WikiSlashSuggestionPopoverProps) {
  const [mode, setMode] = useState<SlashMode>('default');
  const hasQuery = state.query.trim().length > 0;

  const sections = useMemo(() => {
    const recentPageIds =
      hasQuery || mode === 'codex-browse'
        ? undefined
        : getRecentReferencePageIds();
    return resolveWikiSuggestionSections(state.query, index, {
      ...suggestionOptions,
      recentPageIds,
      limit: hasQuery || mode === 'codex-browse' ? 12 : 8,
    });
  }, [state.query, index, mode, hasQuery, suggestionOptions]);

  const headerLabel = useMemo(() => {
    if (mode === 'codex-browse') return 'Link to codex';
    if (hasQuery) return 'Quick reference';
    return 'Recent entities';
  }, [mode, hasQuery]);

  const showUtilityActions = mode === 'default' && !hasQuery;
  const showStubAction = hasQuery && onCreateStub;

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
        {headerLabel}
      </div>

      <div className="max-h-48 overflow-y-auto py-1">
        {sections.map((section) => (
          <div key={section.key}>
            {sections.length > 1 || section.label !== 'Matches' ? (
              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted/80">
                {section.label}
              </div>
            ) : null}
            <ul>
              <WikiCodexSuggestionList
                matches={section.entries}
                onSelect={(entry) => {
                  onSelect(entry);
                  onClose();
                }}
                emptyLabel={
                  section.key === 'recent' && !hasQuery
                    ? 'No recent entities yet'
                    : 'No matches'
                }
              />
            </ul>
          </div>
        ))}
      </div>

      {showStubAction ? (
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

      {showUtilityActions ? (
        <div className="border-t border-border py-1">
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-xs text-muted hover:bg-muted/20 hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              setMode('codex-browse');
            }}
          >
            Link to codex…
          </button>
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-xs text-muted hover:bg-muted/20 hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              onMentionPlayer();
              onClose();
            }}
          >
            Mention player…
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
