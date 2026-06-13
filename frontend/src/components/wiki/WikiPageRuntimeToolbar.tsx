import { Pencil, Plus, Save, Search } from 'lucide-react';
import { usePageBlockDraftRegistry } from '@/contexts/PageBlockDraftRegistry';
import type { WikiPageBlock } from '@/types/wiki';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import { WikiPageEditStatusHint } from '@/components/wiki/WikiPageEditStatusHint';
import type { BlockDisplayState } from '@/lib/blockDisplayState';
import type { PageContinuitySummary } from '@/lib/pageCodexDiagnostics';
import { WikiPageMoreMenu } from '@/components/wiki/WikiPageMoreMenu';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function toolbarButtonClass(active: boolean): string {
  return `inline-flex size-10 sm:size-8 items-center justify-center rounded-md border transition-all ${
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
  isCodexRailOpen: boolean;
  isEditingPage: boolean;
  showGridLines: boolean;
  workspaceMode: WorkspaceMode;
  canDeleteWikiPage: boolean;
  blockDisplayState: BlockDisplayState;
  widgetOptions: Array<{ value: string; label: string; group?: string }>;
  onTogglePin: () => void;
  onToggleSearch: () => void;
  onToggleCodexRail: () => void;
  onCodexDiagnosticsClick?: () => void;
  codexDiagnosticsSummary?: PageContinuitySummary | null;
  codexDiagnosticsLoading?: boolean;
  codexDiagnosticsError?: string | null;
  showPlayerCodexRail?: boolean;
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
  isCodexRailOpen,
  isEditingPage,
  showGridLines,
  workspaceMode,
  canDeleteWikiPage,
  blockDisplayState,
  widgetOptions,
  onTogglePin,
  onToggleSearch,
  onToggleCodexRail,
  onCodexDiagnosticsClick,
  codexDiagnosticsSummary = null,
  showPlayerCodexRail = false,
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

  return (
    <div className="flex w-full shrink-0 flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <div
        className="flex max-w-full flex-wrap items-center justify-start gap-1 sm:justify-end sm:gap-0.5"
        role="toolbar"
        aria-label="Page tools"
      >
        <button
          type="button"
          onClick={onToggleSearch}
          aria-pressed={isSearchOpen}
          title="Search page"
          className={toolbarButtonClass(isSearchOpen)}
        >
          <Search className="size-3.5" />
        </button>

        {isDMUser && !isTagsHub ? (
          <button
            type="button"
            onClick={() => void onToggleEditPage()}
            disabled={isSaving}
            aria-pressed={isEditingPage}
            title={isEditingPage ? 'Done editing' : 'Edit page'}
            className={`${toolbarButtonClass(isEditingPage)} disabled:opacity-50`}
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}

        <WikiPageMoreMenu
          isTagsHub={isTagsHub}
          isPinned={isPinned}
          isCodexRailOpen={isCodexRailOpen}
          isEditingPage={isEditingPage}
          showGridLines={showGridLines}
          canDeleteWikiPage={canDeleteWikiPage}
          onTogglePin={onTogglePin}
          onToggleCodexRail={onToggleCodexRail}
          onOpenPageSettings={onOpenPageSettings}
          onToggleGridLines={onToggleGridLines}
          onCodexDiagnosticsClick={onCodexDiagnosticsClick}
          codexDiagnosticsSummary={codexDiagnosticsSummary}
          onDeletePage={onDeletePage}
          showPlayerCodexRail={showPlayerCodexRail}
        />
      </div>

      {isDMUser && isEditingPage && !isTagsHub ? (
        <div
          className="flex w-full flex-wrap items-center justify-start gap-1 border-t border-border/40 pt-1.5 sm:w-auto sm:justify-end sm:gap-0.5 sm:border-0 sm:pt-0"
          role="toolbar"
          aria-label="Editing tools"
        >
          <div className="relative">
            <button
              type="button"
              title="Add block"
              className={toolbarButtonClass(false)}
            >
              <Plus className="size-3.5" />
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
              aria-label="Add block"
            >
              <option value="">Add block</option>
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

          {hasUnsavedWork && onSavePage ? (
            <button
              type="button"
              onClick={() => void onSavePage()}
              disabled={isSaving}
              title="Save page changes"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs font-medium text-primary transition-all hover:bg-primary/15 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              Save
            </button>
          ) : null}
        </div>
      ) : null}

      {isDMUser && isEditingPage ? (
        <WikiPageEditStatusHint
          workspaceMode={workspaceMode}
          isEditingPage={isEditingPage}
          showGridLines={showGridLines}
          blockDisplayState={blockDisplayState}
          className="max-w-[14rem] text-right"
        />
      ) : null}
    </div>
  );
}
