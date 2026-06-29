import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CategoryIndexSearchInput } from '@/components/wiki/indexBrowse/CategoryIndexSearchInput';
import type {
  CategoryIndexFacetDef,
  CategoryIndexRefineState,
} from '@/lib/categoryIndexBrowse';
import {
  deriveFacetOptions,
  hasActiveCategoryIndexRefine,
  resetCategoryIndexRefine,
} from '@/lib/categoryIndexBrowse';
import type { CategoryIndexChild } from '@/lib/wiki';

interface CategoryIndexRefinePopoverProps {
  facetDefs: CategoryIndexFacetDef[];
  refineState: CategoryIndexRefineState;
  children: CategoryIndexChild[];
  categoryTitle: string;
  onRefineChange: (next: CategoryIndexRefineState) => void;
  /** Quest hub or other custom refine UI inside the popover. */
  customBody?: ReactNode;
  activeCount?: number;
  onResetRefine?: () => void;
  /** In-popover list filter — only when meaningful refine (facets or custom body) exists */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

function chipClass(active: boolean): string {
  return active
    ? 'bg-primary/15 text-primary'
    : 'text-muted hover:text-foreground';
}

export function CategoryIndexRefinePopover({
  facetDefs,
  refineState,
  children,
  categoryTitle,
  onRefineChange,
  customBody,
  activeCount,
  onResetRefine,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: CategoryIndexRefinePopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasTextFilter = Boolean(onSearchChange && (searchQuery?.trim() ?? '').length > 0);
  const hasFacetRefine = hasActiveCategoryIndexRefine(
    refineState,
    facetDefs,
    children,
    categoryTitle,
  );
  const hasActive =
    activeCount !== undefined
      ? activeCount > 0
      : hasFacetRefine || hasTextFilter;

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

  if (facetDefs.length === 0 && !customBody) return null;

  const showInPopoverSearch = Boolean(onSearchChange && searchPlaceholder);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
          hasActive
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border text-muted hover:text-foreground'
        }`}
      >
        <SlidersHorizontal className="size-4" />
        Refine
        {hasActive && (
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium">
            {activeCount ?? '•'}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Refine results"
          className="absolute right-0 z-30 mt-2 max-h-[min(70vh,24rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-lg border border-border bg-elevated p-3 shadow-lg"
        >
          {showInPopoverSearch ? (
            <div className="mb-3">
              <CategoryIndexSearchInput
                value={searchQuery ?? ''}
                placeholder={searchPlaceholder ?? 'Filter list…'}
                onChange={onSearchChange!}
              />
            </div>
          ) : null}

          {customBody ?? (
            <div className="space-y-4">
              {facetDefs.map((facet) => {
                const options = deriveFacetOptions(children, facet, categoryTitle);
                if (options.length === 0) return null;
                const facetState = refineState[facet.id] ?? {};
                return (
                  <div key={facet.id}>
                    <p className={`mb-1.5 ${META_SECTION_LABEL_CLASS}`}>{facet.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {options.map((option) => (
                        <label
                          key={option}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${chipClass(facetState[option] !== false)}`}
                        >
                          <input
                            type="checkbox"
                            className="size-3 accent-primary"
                            checked={facetState[option] !== false}
                            onChange={(event) =>
                              onRefineChange({
                                ...refineState,
                                [facet.id]: {
                                  ...facetState,
                                  [option]: event.target.checked,
                                },
                              })
                            }
                          />
                          {option === '(unset)' ? 'Unset' : option}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasActive && (
            <button
              type="button"
              onClick={() => {
                if (onResetRefine) {
                  onResetRefine();
                } else {
                  onRefineChange(
                    resetCategoryIndexRefine(facetDefs, children, categoryTitle),
                  );
                }
                onSearchChange?.('');
              }}
              className="mt-3 text-xs text-muted underline-offset-2 hover:text-primary hover:underline"
            >
              Reset refine
            </button>
          )}

          <p className="mt-3 text-[11px] text-muted">
            Jump anywhere — <kbd className="rounded border border-border px-1">Ctrl+K</kbd>
          </p>
        </div>
      )}
    </div>
  );
}
