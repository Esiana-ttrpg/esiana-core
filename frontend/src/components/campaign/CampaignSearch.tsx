import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useWikiLinkIndex } from '@/components/wiki/hooks/useWikiLinkIndex';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  formatCampaignSearchResultHint,
  useCampaignSearch,
} from '@/hooks/useCampaignSearch';
import { fetchPluginSearchResults } from '@/lib/pluginSearchApi';
import { pluginPagePath } from '@/lib/pluginNavigation';

interface CampaignSearchProps {
  campaignHandle: string;
  className?: string;
  inputId?: string;
  autoFocus?: boolean;
  onClose?: () => void;
  /** Match input height to UserAvatar sm (h-8). */
  alignControlsToAvatar?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function CampaignSearch({
  campaignHandle,
  className = '',
  inputId = 'campaign-header-search',
  autoFocus = false,
  onClose,
  alignControlsToAvatar = false,
}: CampaignSearchProps) {
  const navigate = useNavigate();
  const { flatPages, campaign } = useWiki();
  const { index, loading } = useWikiLinkIndex(campaignHandle);
  const [draft, setDraft] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [pluginResults, setPluginResults] = useState<
    Awaited<ReturnType<typeof fetchPluginSearchResults>>
  >([]);

  const results = useCampaignSearch(index, debouncedQuery);

  useEffect(() => {
    if (!campaign?.id || !debouncedQuery.trim()) {
      setPluginResults([]);
      return;
    }
    let cancelled = false;
    void fetchPluginSearchResults(campaign.id, debouncedQuery).then((hits) => {
      if (!cancelled) setPluginResults(hits);
    });
    return () => {
      cancelled = true;
    };
  }, [campaign?.id, debouncedQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(draft);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, results.length]);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        return;
      }

      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  function clearSearch() {
    setDraft('');
    setDebouncedQuery('');
    setIsOpen(false);
    onClose?.();
  }

  function selectResult(pageId: string) {
    navigate(campaignWikiPath(campaignHandle, pageId, flatPages));
    clearSearch();
    inputRef.current?.blur();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      clearSearch();
      inputRef.current?.blur();
      return;
    }

    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const entry = results[activeIndex];
      if (entry) selectResult(entry.pageId);
    }
  }

  const showResults = isOpen && debouncedQuery.trim().length > 0;

  const searchIconClass = alignControlsToAvatar
    ? 'pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted'
    : 'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted';

  const inputClass = alignControlsToAvatar
    ? 'h-8 w-full rounded-lg border border-[rgb(var(--color-border-warm-rgb)/0.12)] bg-canvas/50 py-0 pl-8 pr-8 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30'
    : 'w-full rounded-lg border border-[rgb(var(--color-border-warm-rgb)/0.12)] bg-canvas/50 py-1.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30';

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <Search className={searchIconClass} aria-hidden />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        placeholder="Search campaign…"
        className={inputClass}
        autoComplete="off"
        aria-expanded={showResults}
        aria-controls={`${inputId}-results`}
        aria-autocomplete="list"
        role="combobox"
      />
      {draft.length > 0 && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showResults && (
        <div
          id={`${inputId}-results`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
        >
          {loading && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Loading campaign index…</p>
          ) : null}
          {!loading && results.length === 0 && pluginResults.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No matching pages.</p>
          ) : null}
          {results.map((entry, index) => {
            const hint = formatCampaignSearchResultHint(entry);
            return (
              <button
                key={entry.pageId}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(entry.pageId)}
                className={`block w-full px-3 py-2 text-left ${
                  index === activeIndex ? 'bg-elevated' : 'hover:bg-elevated/70'
                }`}
              >
                <span className="block truncate text-sm text-foreground">{entry.title}</span>
                {hint ? (
                  <span className="block truncate text-xs text-muted">{hint}</span>
                ) : null}
              </button>
            );
          })}
          {pluginResults.map((hit) => (
            <button
              key={`${hit.pluginId}:${hit.id}`}
              type="button"
              role="option"
              onClick={() => {
                if (hit.pageId) {
                  navigate(
                    pluginPagePath(
                      campaignHandle,
                      hit.pluginId,
                      hit.pageId,
                      hit.subpath,
                    ),
                  );
                }
                clearSearch();
              }}
              className="block w-full px-3 py-2 text-left hover:bg-elevated/70"
            >
              <span className="block truncate text-sm text-foreground">{hit.title}</span>
              <span className="block truncate text-xs text-muted">
                {hit.subtitle ?? hit.label} · Plugin
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
