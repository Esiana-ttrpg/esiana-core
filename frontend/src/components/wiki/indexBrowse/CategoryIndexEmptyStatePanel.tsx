import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FileText, Plus } from 'lucide-react';
import {
  getCategoryEmptyState,
  mapSimilarEntries,
  type CategoryIndexEmptyStateInput,
} from '@/lib/categoryIndexEmptyState';
import type { CategoryIndexChild } from '@/lib/wiki';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface CategoryIndexEmptyStatePanelProps extends CategoryIndexEmptyStateInput {
  categoryTitle: string;
  itemLabel: string;
  campaignHandle: string;
  similarEntries: CategoryIndexChild[];
  onCreate: () => void;
  onCreateFromSearch: (title: string) => void;
  onClearSearch: () => void;
  onResetRefine: () => void;
  icon?: ReactNode;
}

export function CategoryIndexEmptyStatePanel({
  categoryTitle,
  itemLabel,
  campaignHandle,
  similarEntries,
  onCreate,
  onCreateFromSearch,
  onClearSearch,
  onResetRefine,
  icon,
  ...input
}: CategoryIndexEmptyStatePanelProps) {
  const { flatPages } = useWiki();
  const state = getCategoryEmptyState({
    ...input,
    categoryTitle,
    itemLabel,
  });

  if (!state.variant) return null;

  const similar = mapSimilarEntries(similarEntries);

  if (state.variant === 'no_entries') {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        {icon ?? <FileText className="mx-auto mb-3 size-10 text-muted" />}
        <p className="text-muted">{state.message}</p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Create your first {itemLabel.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
      <p className="text-muted">{state.message}</p>

      {similar.length > 0 && (
        <div className="mx-auto mt-4 max-w-md text-left">
          <p className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
            Similar entries
          </p>
          <ul className="space-y-1 text-sm">
            {similar.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={campaignCategoryChildPath(
                    campaignHandle,
                    entry.id,
                    categoryTitle,
                    flatPages,
                  )}
                  className="text-primary hover:underline"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {state.showClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="text-sm text-muted hover:text-foreground hover:underline"
          >
            Clear search
          </button>
        )}
        {state.showResetRefine && (
          <button
            type="button"
            onClick={onResetRefine}
            className="text-sm text-primary hover:underline"
          >
            Reset refine
          </button>
        )}
        {state.showCreateFromSearch && state.createLabel && (
          <button
            type="button"
            onClick={() => onCreateFromSearch(input.searchQuery.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover"
          >
            <Plus className="size-4" />
            {state.createLabel}
          </button>
        )}
      </div>
    </div>
  );
}
