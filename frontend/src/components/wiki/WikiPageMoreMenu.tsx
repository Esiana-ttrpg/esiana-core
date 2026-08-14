import { useState } from 'react';
import { MoreHorizontal, Pin, Settings, Trash2 } from 'lucide-react';
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
  canDeleteWikiPage: boolean;
  onTogglePin: () => void;
  onOpenPageSettings?: () => void;
  onDeletePage?: () => void;
}

export function WikiPageMoreMenu({
  isDMUser: isDMUserProp,
  isTagsHub,
  isPinned,
  canDeleteWikiPage,
  onTogglePin,
  onOpenPageSettings,
  onDeletePage,
}: WikiPageMoreMenuProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [open, setOpen] = useState(false);

  if (!isDMUser || isTagsHub) return null;

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
          </div>
        </>
      ) : null}
    </div>
  );
}
