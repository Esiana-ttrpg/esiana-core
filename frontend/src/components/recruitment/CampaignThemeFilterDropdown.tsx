import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import {
  CAMPAIGN_THEME_CATEGORIES,
  CAMPAIGN_THEMES,
  getCampaignThemeLabel,
} from '@shared/campaignThemes';

export interface CampaignThemeFilterDropdownProps {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  id?: string;
}

export function CampaignThemeFilterDropdown({
  selectedSlugs,
  onChange,
  id = 'recruitment-theme-filter',
}: CampaignThemeFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const map = new Map<string, typeof CAMPAIGN_THEMES>();
    for (const category of CAMPAIGN_THEME_CATEGORIES) {
      const entries = CAMPAIGN_THEMES.filter((entry) => {
        if (entry.category !== category) return false;
        if (!normalizedQuery) return true;
        return (
          entry.label.toLowerCase().includes(normalizedQuery) ||
          entry.slug.includes(normalizedQuery)
        );
      });
      if (entries.length > 0) map.set(category, entries);
    }
    return map;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function toggleSlug(slug: string) {
    if (selectedSlugs.includes(slug)) {
      onChange(selectedSlugs.filter((value) => value !== slug));
    } else {
      onChange([...selectedSlugs, slug]);
    }
  }

  function clearAll() {
    onChange([]);
    setQuery('');
  }

  const visibleBadges = selectedSlugs.slice(0, 2);
  const hiddenCount = Math.max(0, selectedSlugs.length - visibleBadges.length);

  return (
    <div ref={rootRef} className="relative min-w-[220px] flex-1 sm:max-w-xs">
      <span className="mb-1 block META_SECTION_LABEL_CLASS">Genre themes</span>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 text-left text-sm text-foreground"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selectedSlugs.length === 0 ? (
            <span className="text-muted">All themes</span>
          ) : (
            <>
              {visibleBadges.map((slug) => (
                <span
                  key={slug}
                  className="inline-flex max-w-[140px] truncate rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {getCampaignThemeLabel(slug)}
                </span>
              ))}
              {hiddenCount > 0 ? (
                <span className="text-xs text-muted">+{hiddenCount} more</span>
              ) : null}
            </>
          )}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search themes…"
                className="h-9 w-full rounded border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
            {selectedSlugs.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selectedSlugs.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleSlug(slug)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {getCampaignThemeLabel(slug)}
                    <X className="size-3" aria-hidden />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-72 overflow-y-auto p-2"
          >
            {grouped.size === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">No themes match your search.</p>
            ) : (
              Array.from(grouped.entries()).map(([category, entries]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {category}
                  </p>
                  <ul className="space-y-0.5">
                    {entries.map((entry) => {
                      const selected = selectedSlugs.includes(entry.slug);
                      return (
                        <li key={entry.slug}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => toggleSlug(entry.slug)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                              selected
                                ? 'bg-primary/15 text-primary'
                                : 'text-foreground hover:bg-elevated'
                            }`}
                          >
                            <span
                              className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? 'border-primary bg-primary text-background'
                                  : 'border-border bg-background'
                              }`}
                              aria-hidden
                            >
                              {selected ? '✓' : ''}
                            </span>
                            <span className="min-w-0 truncate">{entry.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
