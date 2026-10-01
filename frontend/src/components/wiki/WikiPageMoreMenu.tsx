import { useMemo, useState } from 'react';
import { MoreHorizontal, Pin, Settings, Trash2 } from 'lucide-react';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { PluginPageActions } from '@/components/plugins/PluginPageActions';
import {
  listPageActions,
  meetsPluginRequires,
  type PluginPageTarget,
} from '@/lib/pluginContributions';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useOptionalWiki } from '@/contexts/WikiContext';

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
  canDeleteWikiPage: boolean;
  onTogglePin: () => void;
  onOpenPageSettings?: () => void;
  onDeletePage?: () => void;
  /** When set, plugin page actions for this target appear in the menu. */
  pageTarget?: PluginPageTarget;
}

export function WikiPageMoreMenu({
  isDMUser: isDMUserProp,
  isTagsHub,
  isPinned,
  canDeleteWikiPage,
  onTogglePin,
  onOpenPageSettings,
  onDeletePage,
  pageTarget,
}: WikiPageMoreMenuProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [open, setOpen] = useState(false);
  const { plugins } = usePluginRuntime();
  const { isAuthenticated } = useAuth();
  const wiki = useOptionalWiki();

  const hasPluginActions = useMemo(() => {
    if (!pageTarget) return false;
    return listPageActions(pageTarget).some((action) =>
      meetsPluginRequires(action.requires, {
        isAuthenticated,
        campaignRole: wiki?.campaign?.role,
      }),
    );
  }, [pageTarget, plugins, isAuthenticated, wiki?.campaign?.role]);

  if (isTagsHub) return null;
  if (!isDMUser && !hasPluginActions) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="More actions"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted transition-all hover:border-border/60 hover:bg-surface/60 hover:text-foreground"
      >
        <MoreHorizontal className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only sm:not-sr-only">More</span>
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
            {isDMUser ? (
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
            ) : null}
            {pageTarget ? (
              <PluginPageActions target={pageTarget} onSelect={() => setOpen(false)} />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
