import { LayoutGrid, Pencil, Plus, Save, Search } from 'lucide-react';
import { usePageBlockDraftRegistry } from '@/contexts/PageBlockDraftRegistry';
import type { WikiPageBlock } from '@/types/wiki';
import { WikiPageMoreMenu } from '@/components/wiki/WikiPageMoreMenu';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function toolbarButtonClass(active: boolean): string {
  return `inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-all ${
    active
      ? 'border-primary/50 bg-primary/10 text-primary'
      : 'border-transparent bg-transparent text-muted hover:border-border/60 hover:bg-surface/60 hover:text-foreground'
  }`;
}

interface WikiPageRuntimeToolbarProps {
  isDMUser?: boolean;
  isTagsHub: boolean;
  isLayoutDirty?: boolean;
  isSaving: boolean;
  onSavePage?: () => void | Promise<void>;
  isPinned: boolean;
  isSearchOpen: boolean;
  isEditingPage: boolean;
  showGridLines: boolean;
  canDeleteWikiPage: boolean;
  widgetOptions: Array<{ value: string; label: string; group?: string }>;
  onTogglePin: () => void;
  onToggleSearch: () => void;
  onToggleEditPage: () => void;
  onToggleGridLines: () => void;
  onOpenPageSettings?: () => void;
  onAddWidget: (type: WikiPageBlock['type']) => void;
  onDeletePage: () => void;
}

export function WikiPageRuntimeToolbar({
  isDMUser: isDMUserProp,
  isTagsHub,
  isLayoutDirty = false,
  isSaving,
  onSavePage,
  isPinned,
  isSearchOpen,
  isEditingPage,
  showGridLines,
  canDeleteWikiPage,
  widgetOptions,
  onTogglePin,
  onToggleSearch,
  onToggleEditPage,
  onToggleGridLines,
  onOpenPageSettings,
  onAddWidget,
  onDeletePage,
}: WikiPageRuntimeToolbarProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const draftRegistry = usePageBlockDraftRegistry();
  const hasUnsavedWork =
    isLayoutDirty || (draftRegistry?.hasSemanticDirty ?? false);

  const showReadBar = isDMUser || !isTagsHub;

  if (!showReadBar) return null;

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1.5">
      <div
        className="flex max-w-full flex-wrap items-center justify-end gap-0.5"
        role="toolbar"
        aria-label="Page tools"
      >
        {!isTagsHub ? (
          <button
            type="button"
            onClick={onToggleSearch}
            aria-pressed={isSearchOpen}
            title="Search page"
            className={toolbarButtonClass(isSearchOpen)}
          >
            <Search className="size-3.5 shrink-0" aria-hidden />
            <span>Search</span>
          </button>
        ) : null}

        {isDMUser && !isTagsHub ? (
          <button
            type="button"
            onClick={() => void onToggleEditPage()}
            disabled={isSaving}
            aria-pressed={isEditingPage}
            title={isEditingPage ? 'Done editing' : 'Edit page'}
            className={`${toolbarButtonClass(isEditingPage)} disabled:opacity-50`}
          >
            <Pencil className="size-3.5 shrink-0" aria-hidden />
            <span>{isEditingPage ? 'Done' : 'Edit'}</span>
          </button>
        ) : null}

        {isDMUser && !isTagsHub ? (
          <WikiPageMoreMenu
            isTagsHub={isTagsHub}
            isPinned={isPinned}
            canDeleteWikiPage={canDeleteWikiPage}
            onTogglePin={onTogglePin}
            onOpenPageSettings={onOpenPageSettings}
            onDeletePage={onDeletePage}
          />
        ) : null}
      </div>

      {isDMUser && isEditingPage && !isTagsHub ? (
        <div
          className="flex flex-wrap items-center justify-end gap-0.5"
          role="toolbar"
          aria-label="Editing tools"
        >
          <div className="relative">
            <button
              type="button"
              title="Add widget"
              className={toolbarButtonClass(false)}
            >
              <Plus className="size-3.5 shrink-0" aria-hidden />
              <span>Add Widget</span>
            </button>
            <select
              value=""
              onChange={(event) => {
                const type = event.target.value as WikiPageBlock['type'];
                if (type) {
                  onAddWidget(type);
                  event.target.value = '';
                }
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Add widget"
            >
              <option value="">Add widget</option>
              {widgetOptions.map((option) => (
                <option
                  key={`${option.group ?? 'widget'}-${option.value}`}
                  value={option.value}
                >
                  {option.group ? `${option.group}: ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleGridLines}
            aria-pressed={showGridLines}
            title={showGridLines ? 'Exit arrange mode' : 'Arrange blocks'}
            className={toolbarButtonClass(showGridLines)}
          >
            <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
            <span>{showGridLines ? 'Done arranging' : 'Arrange Blocks'}</span>
          </button>

          {onSavePage ? (
            <button
              type="button"
              onClick={() => void onSavePage()}
              disabled={isSaving || !hasUnsavedWork}
              title="Save page changes"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs font-medium text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="size-3.5 shrink-0" aria-hidden />
              Save
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
