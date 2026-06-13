import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { isRegionLocationPage } from '@/lib/locationMetadata';
import type { WikiTreeNode } from '@/types/wiki';

const fieldSelectClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60 disabled:opacity-60';

interface IdentityPagePickerProps {
  flatPages: WikiTreeNode[];
  /** Shown when the search query is empty. Defaults to `flatPages`. */
  defaultOptions?: WikiTreeNode[];
  /** Full pool when the user types. Defaults to `flatPages`. */
  searchOptions?: WikiTreeNode[];
  /** Full wiki tree for resolving selected labels when the page is outside `flatPages`. */
  lookupPages?: WikiTreeNode[];
  value: string | null;
  disabled?: boolean;
  placeholder?: string;
  clearLabel?: string;
  createLabel?: string;
  onCreatePage?: (title: string) => void;
  onChange: (pageId: string | null) => void | Promise<void>;
}

function sortPages(pages: WikiTreeNode[]): WikiTreeNode[] {
  return [...pages].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

export function IdentityPagePicker({
  flatPages,
  defaultOptions,
  searchOptions,
  lookupPages,
  value,
  disabled = false,
  placeholder = 'Search wiki pages…',
  clearLabel = 'No page linked',
  createLabel = 'Create new region',
  onCreatePage,
  onChange,
}: IdentityPagePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resolvedDefaultOptions = useMemo(
    () => sortPages(defaultOptions ?? flatPages),
    [defaultOptions, flatPages],
  );

  const resolvedSearchOptions = useMemo(
    () => sortPages(searchOptions ?? flatPages),
    [searchOptions, flatPages],
  );

  const filteredOptions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return resolvedDefaultOptions;

    const matches = resolvedSearchOptions.filter((page) =>
      page.title.toLowerCase().includes(needle),
    );
    const regionMatches = matches.filter((page) => isRegionLocationPage(page));
    const otherMatches = matches.filter((page) => !isRegionLocationPage(page));
    return [...regionMatches, ...otherMatches];
  }, [searchQuery, resolvedDefaultOptions, resolvedSearchOptions]);

  const showCreateRow = useMemo(() => {
    if (!onCreatePage) return false;
    const needle = searchQuery.trim();
    if (!needle) return false;
    const lower = needle.toLowerCase();
    return !resolvedSearchOptions.some(
      (page) => page.title.toLowerCase() === lower,
    );
  }, [onCreatePage, searchQuery, resolvedSearchOptions]);

  const selectedPage = useMemo(() => {
    if (!value) return null;
    const pool = lookupPages ?? flatPages;
    return pool.find((page) => page.id === value) ?? null;
  }, [flatPages, lookupPages, value]);

  const selectedLabel = selectedPage?.title ?? clearLabel;
  const inputValue = isOpen ? searchQuery : selectedLabel;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  async function handleSelect(nextPageId: string | null) {
    if (nextPageId === value) {
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onChange(nextPageId);
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update identity page');
    } finally {
      setSaving(false);
    }
  }

  function handleCreateClick() {
    const title = searchQuery.trim();
    if (!title || !onCreatePage) return;
    onCreatePage(title);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  }

  return (
    <div ref={containerRef} className="relative min-w-[12rem] flex-1">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled || saving}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={fieldSelectClass}
        />
        {value && !disabled && (
          <button
            type="button"
            title="Clear linked page"
            disabled={saving}
            onClick={() => void handleSelect(null)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition hover:text-foreground disabled:opacity-60"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {saving && <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden />}
      </div>
      {isOpen && !disabled && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-elevated py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              className="w-full px-3 py-2 text-left text-sm text-muted hover:bg-background"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void handleSelect(null)}
            >
              {clearLabel}
            </button>
          </li>
          {filteredOptions.length === 0 && !showCreateRow ? (
            <li className="px-3 py-2 text-sm text-muted">No pages match your search.</li>
          ) : (
            filteredOptions.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={page.id === value}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-background ${
                    page.id === value ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleSelect(page.id)}
                >
                  {page.title}
                </button>
              </li>
            ))
          )}
          {showCreateRow ? (
            <li className="border-t border-border/60">
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-background"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCreateClick}
              >
                <Plus className="size-3.5 shrink-0" aria-hidden />
                {createLabel}
              </button>
            </li>
          ) : null}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
