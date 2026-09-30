import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  clearRecentSearches,
  listRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
} from '@/lib/searchRecency';
import {
  reduceGlobalSearchKeyboard,
  type GlobalSearchKeyboardState,
} from '@/lib/globalSearchKeyboard';
import { GlobalSearchResultRow } from './GlobalSearchResultRow';
import { GlobalSearchTypeTabs } from './GlobalSearchTypeTabs';
import { GlobalSearchRecent } from './GlobalSearchRecent';
import { useGlobalSearchQuery } from './useGlobalSearchQuery';

interface GlobalSearchOverlayProps {
  campaignHandle: string;
  campaignId: string | null;
  onClose: () => void;
}

export function GlobalSearchOverlay({
  campaignHandle,
  campaignId,
  onClose,
}: GlobalSearchOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() =>
    campaignId ? listRecentSearches(campaignId) : [],
  );
  const [keyboard, setKeyboard] = useState<GlobalSearchKeyboardState>({
    activeIndex: 0,
    activeTabIndex: 0,
    resultCount: 0,
    tabCount: 1,
    focusTarget: 'input',
  });

  useBodyScrollLock(true);

  const { data, loading, error } = useGlobalSearchQuery(
    campaignHandle,
    draft,
    activeType,
  );

  const results = data?.results ?? [];
  const types = data?.types ?? [];
  const queryTokens = useMemo(
    () =>
      draft
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0),
    [draft],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setKeyboard((prev) =>
      reduceGlobalSearchKeyboard(prev, {
        type: 'reset',
        resultCount: results.length,
        tabCount: 1 + types.length,
      }).state,
    );
  }, [results.length, types.length, draft, activeType]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!panelRef.current || !target) return;
      if (!panelRef.current.contains(target)) onClose();
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  function refreshRecent() {
    if (!campaignId) {
      setRecent([]);
      return;
    }
    setRecent(listRecentSearches(campaignId));
  }

  function openResult(index: number) {
    const result = results[index];
    if (!result) return;
    if (campaignId && draft.trim().length >= 2) {
      recordRecentSearch(campaignId, draft.trim());
    }
    navigate(result.href);
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const key = event.key;
    if (
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Home' &&
      key !== 'End' &&
      key !== 'Escape' &&
      key !== 'Enter'
    ) {
      return;
    }

    // Left/Right only when tabs are focused — don't steal caret movement in the input.
    if (
      (key === 'ArrowLeft' || key === 'ArrowRight') &&
      keyboard.focusTarget !== 'tabs'
    ) {
      return;
    }

    event.preventDefault();
    const { state, effect } = reduceGlobalSearchKeyboard(keyboard, {
      type: key as
        | 'ArrowDown'
        | 'ArrowUp'
        | 'ArrowLeft'
        | 'ArrowRight'
        | 'Home'
        | 'End'
        | 'Escape'
        | 'Enter',
    });
    setKeyboard(state);

    if (effect.type === 'close') {
      onClose();
      return;
    }
    if (effect.type === 'open') {
      openResult(effect.index);
      return;
    }
    if (effect.type === 'selectTab') {
      const tabKey =
        effect.index === 0 ? null : (types[effect.index - 1]?.key ?? null);
      setActiveType(tabKey);
      setKeyboard((prev) => ({
        ...prev,
        activeTabIndex: effect.index,
        focusTarget: 'tabs',
      }));
    }
  }

  const showResults = draft.trim().length >= 2;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-3 py-[8vh] sm:px-6"
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search this campaign"
        className="flex h-[min(85vh,52rem)] w-[min(96vw,64rem)] max-w-4xl flex-col overflow-hidden rounded-xl border border-border/40 bg-overlay-elevated shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setKeyboard((prev) => ({ ...prev, focusTarget: 'input' }));
            }}
            onFocus={() =>
              setKeyboard((prev) => ({ ...prev, focusTarget: 'input' }))
            }
            placeholder="Search this campaign…"
            className="min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-muted focus:outline-none"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="global-search-results"
            role="combobox"
            aria-expanded={showResults}
          />
          <kbd className="hidden shrink-0 rounded border border-border/50 px-1.5 py-0.5 text-[10px] text-muted sm:inline">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-elevated hover:text-foreground sm:hidden"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        {showResults ? (
          <GlobalSearchTypeTabs
            types={types}
            activeType={activeType}
            activeTabIndex={keyboard.activeTabIndex}
            onFocusTabs={() =>
              setKeyboard((prev) => ({ ...prev, focusTarget: 'tabs' }))
            }
            onChange={(typeKey, tabIndex) => {
              setActiveType(typeKey);
              setKeyboard((prev) => ({
                ...prev,
                activeTabIndex: tabIndex,
                focusTarget: 'tabs',
                activeIndex: 0,
              }));
            }}
          />
        ) : null}

        <div
          id="global-search-results"
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {!showResults ? (
            <GlobalSearchRecent
              items={recent}
              onSelect={(query) => {
                setDraft(query);
                inputRef.current?.focus();
              }}
              onRemove={(query) => {
                if (!campaignId) return;
                removeRecentSearch(campaignId, query);
                refreshRecent();
              }}
              onClear={() => {
                if (!campaignId) return;
                clearRecentSearches(campaignId);
                refreshRecent();
              }}
            />
          ) : loading && results.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">Searching…</p>
          ) : error ? (
            <p className="px-4 py-8 text-sm text-muted">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">No matching results.</p>
          ) : (
            results.map((result, index) => (
              <GlobalSearchResultRow
                key={result.id}
                result={result}
                active={index === keyboard.activeIndex}
                queryTokens={queryTokens}
                onHover={() =>
                  setKeyboard((prev) => ({
                    ...prev,
                    activeIndex: index,
                    focusTarget: 'results',
                  }))
                }
                onSelect={() => openResult(index)}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
