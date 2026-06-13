import { useState } from 'react';
import {
  AlertTriangle,
  LayoutGrid,
  MoreHorizontal,
  PanelRight,
  Pin,
  Settings,
  Trash2,
} from 'lucide-react';
import type { PageContinuitySummary } from '@/lib/pageCodexDiagnostics';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function menuItemClass(danger = false): string {
  return `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
    danger
      ? 'text-red-500 hover:bg-red-500/10'
      : 'text-foreground hover:bg-surface/80'
  }`;
}

interface WikiPageMoreMenuProps {
  isDMUser?: boolean;
  isTagsHub: boolean;
  isPinned: boolean;
  isCodexRailOpen: boolean;
  isEditingPage: boolean;
  showGridLines: boolean;
  canDeleteWikiPage: boolean;
  onTogglePin: () => void;
  onToggleCodexRail: () => void;
  onOpenPageSettings?: () => void;
  onToggleGridLines?: () => void;
  onCodexDiagnosticsClick?: () => void;
  codexDiagnosticsSummary?: PageContinuitySummary | null;
  onDeletePage?: () => void;
  showPlayerCodexRail?: boolean;
}

export function WikiPageMoreMenu({
  isDMUser: isDMUserProp,
  isTagsHub,
  isPinned,
  isCodexRailOpen,
  isEditingPage,
  showGridLines,
  canDeleteWikiPage,
  onTogglePin,
  onToggleCodexRail,
  onOpenPageSettings,
  onToggleGridLines,
  onCodexDiagnosticsClick,
  codexDiagnosticsSummary,
  onDeletePage,
  showPlayerCodexRail,
}: WikiPageMoreMenuProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [open, setOpen] = useState(false);
  const issueCount = codexDiagnosticsSummary?.totalIssueCount ?? 0;

  if (!isDMUser && !showPlayerCodexRail) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="More actions"
        className="inline-flex size-10 items-center justify-center rounded-md border border-transparent text-muted transition-all hover:border-border/60 hover:bg-surface/60 hover:text-foreground sm:size-8"
      >
        <MoreHorizontal className="size-3.5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
            role="menu"
          >
            {isDMUser && !isTagsHub ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass()}
                  onClick={() => {
                    onTogglePin();
                    setOpen(false);
                  }}
                >
                  <Pin className="size-3.5" />
                  {isPinned ? 'Unpin from home' : 'Pin to home'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass()}
                  onClick={() => {
                    onToggleCodexRail();
                    setOpen(false);
                  }}
                >
                  <PanelRight className="size-3.5" />
                  {isCodexRailOpen ? 'Close context' : 'Open context'}
                </button>
                {onOpenPageSettings ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass()}
                    onClick={() => {
                      onOpenPageSettings();
                      setOpen(false);
                    }}
                  >
                    <Settings className="size-3.5" />
                    Page settings
                  </button>
                ) : null}
                {onCodexDiagnosticsClick ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass()}
                    onClick={() => {
                      onCodexDiagnosticsClick();
                      setOpen(false);
                    }}
                  >
                    <AlertTriangle className="size-3.5" />
                    Codex diagnostics
                    {issueCount > 0 ? (
                      <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        {issueCount}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                {isEditingPage && onToggleGridLines ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass()}
                    onClick={() => {
                      onToggleGridLines();
                      setOpen(false);
                    }}
                  >
                    <LayoutGrid className="size-3.5" />
                    {showGridLines ? 'Exit arrange mode' : 'Arrange blocks'}
                  </button>
                ) : null}
                {canDeleteWikiPage && onDeletePage ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(true)}
                    onClick={() => {
                      onDeletePage();
                      setOpen(false);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete page
                  </button>
                ) : null}
              </>
            ) : showPlayerCodexRail ? (
              <button
                type="button"
                role="menuitem"
                className={menuItemClass()}
                onClick={() => {
                  onToggleCodexRail();
                  setOpen(false);
                }}
              >
                <PanelRight className="size-3.5" />
                {isCodexRailOpen ? 'Close context' : 'Open context'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
