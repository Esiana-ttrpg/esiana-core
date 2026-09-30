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
import {
  applyChipRemoval,
  applyTabSelection,
  deriveEffectiveSearchState,
} from '@/lib/globalSearchQueryState';
import {
  applyOperatorSuggestion,
  buildOperatorSuggestions,
  detectOperatorContext,
  reduceSuggestionKeyboard,
  type OperatorSuggestState,
  type OperatorSuggestion,
} from '@/lib/globalSearchOperatorSuggest';
import {
  fetchCampaignMembersForIdentity,
  type CampaignMemberIdentity,
} from '@/lib/campaignMemberIdentity';
import { GlobalSearchResultRow } from './GlobalSearchResultRow';
import { GlobalSearchTypeTabs } from './GlobalSearchTypeTabs';
import { GlobalSearchRecent } from './GlobalSearchRecent';
import { GlobalSearchFilterChips } from './GlobalSearchFilterChips';
import { GlobalSearchOperatorSuggestions } from './GlobalSearchOperatorSuggestions';
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
  const [uiType, setUiType] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);
  const [members, setMembers] = useState<CampaignMemberIdentity[]>([]);
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
  const [suggest, setSuggest] = useState<OperatorSuggestState>({
    open: false,
    activeIndex: 0,
    suggestions: [],
    context: null,
  });

  useBodyScrollLock(true);

  const effective = useMemo(
    () => deriveEffectiveSearchState(draft, uiType),
    [draft, uiType],
  );

  const { data, loading, error } = useGlobalSearchQuery(
    campaignHandle,
    effective.requestParams.q,
    effective.requestParams.type,
  );

  const results = data?.results ?? [];
  const types = data?.types ?? [];
  const queryTokens = useMemo(() => {
    const tokens = [
      ...effective.parsed.terms,
      ...effective.parsed.phrases.flatMap((p) => p.split(/\s+/)),
    ];
    return [...new Set(tokens.filter(Boolean))];
  }, [effective.parsed]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchCampaignMembersForIdentity(campaignHandle)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  useEffect(() => {
    const ctx = detectOperatorContext(draft, caret);
    if (!ctx) {
      setSuggest((prev) =>
        prev.open
          ? { open: false, activeIndex: 0, suggestions: [], context: null }
          : prev,
      );
      return;
    }
    const suggestions = buildOperatorSuggestions(ctx, { members });
    setSuggest({
      open: suggestions.length > 0,
      activeIndex: 0,
      suggestions,
      context: ctx,
    });
  }, [draft, caret, members]);

  useEffect(() => {
    const idx =
      effective.effectiveType == null
        ? 0
        : types.findIndex((t) => t.key === effective.effectiveType) + 1;
    setKeyboard((prev) => ({
      ...reduceGlobalSearchKeyboard(prev, {
        type: 'reset',
        resultCount: results.length,
        tabCount: 1 + types.length,
      }).state,
      activeTabIndex: Math.max(0, idx),
    }));
  }, [results.length, types, draft, effective.effectiveType]);

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

  function syncCaret() {
    const el = inputRef.current;
    if (el) setCaret(el.selectionStart ?? el.value.length);
  }

  function acceptSuggestion(suggestion: OperatorSuggestion) {
    if (!suggest.context) return;
    const { draft: next, caret: nextCaret } = applyOperatorSuggestion(
      draft,
      suggest.context,
      suggestion,
    );
    setDraft(next);
    setSuggest({ open: false, activeIndex: 0, suggestions: [], context: null });
    queueMicrotask(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
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

    if (key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    // Operator suggestions take priority for Up/Down/Enter/Escape.
    // Do not intercept Enter/Escape while an IME composition is active.
    if (
      suggest.open &&
      (key === 'ArrowDown' ||
        key === 'ArrowUp' ||
        key === 'Enter' ||
        key === 'Escape')
    ) {
      if (
        (key === 'Enter' || key === 'Escape') &&
        event.nativeEvent.isComposing
      ) {
        return;
      }
      event.preventDefault();
      const { state, effect } = reduceSuggestionKeyboard(suggest, {
        type: key as 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape',
      });
      setSuggest(state);
      if (effect.type === 'accept') {
        acceptSuggestion(effect.suggestion);
      }
      // Escape closes suggestions only; a subsequent Escape closes the overlay.
      return;
    }

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
      const next = applyTabSelection(draft, tabKey);
      setDraft(next.draft);
      setUiType(next.uiType);
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
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setCaret(event.target.selectionStart ?? event.target.value.length);
              setKeyboard((prev) => ({ ...prev, focusTarget: 'input' }));
            }}
            onSelect={syncCaret}
            onKeyUp={syncCaret}
            onClick={syncCaret}
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
          {suggest.open ? (
            <GlobalSearchOperatorSuggestions
              suggestions={suggest.suggestions}
              activeIndex={suggest.activeIndex}
              onHover={(index) =>
                setSuggest((prev) => ({ ...prev, activeIndex: index }))
              }
              onSelect={acceptSuggestion}
            />
          ) : null}
        </div>

        {showResults ? (
          <GlobalSearchTypeTabs
            types={types}
            activeType={effective.effectiveType}
            activeTabIndex={keyboard.activeTabIndex}
            onFocusTabs={() =>
              setKeyboard((prev) => ({ ...prev, focusTarget: 'tabs' }))
            }
            onChange={(typeKey, tabIndex) => {
              const next = applyTabSelection(draft, typeKey);
              setDraft(next.draft);
              setUiType(next.uiType);
              setKeyboard((prev) => ({
                ...prev,
                activeTabIndex: tabIndex,
                focusTarget: 'tabs',
                activeIndex: 0,
              }));
            }}
          />
        ) : null}

        {showResults ? (
          <GlobalSearchFilterChips
            chips={effective.chips}
            onRemove={(chip) => {
              const next = applyChipRemoval(draft, chip, uiType);
              setDraft(next.draft);
              setUiType(next.uiType);
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
                setUiType(null);
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
