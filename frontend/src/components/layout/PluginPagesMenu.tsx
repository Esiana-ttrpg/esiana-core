import { Puzzle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOptionalWiki } from '@/contexts/WikiContext';
import {
  listHeaderPages,
  meetsPluginRequires,
} from '@/lib/pluginContributions';
import {
  globalPluginPagePath,
  pluginPagePath,
  resolvePluginSidebarIcon,
} from '@/lib/pluginNavigation';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';

/**
 * Puzzle icon + dropdown of registered plugin pages for the current context.
 * Absent when no applicable registrations.
 */
export function PluginPagesMenu({
  alignControlsToAvatar = false,
}: {
  alignControlsToAvatar?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const wiki = useOptionalWiki();
  const campaign = wiki?.campaign ?? null;
  const { mode, loading, plugins } = usePluginRuntime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const context: 'global' | 'campaign' =
    mode === 'campaign' && campaign?.handle ? 'campaign' : 'global';

  const entries = useMemo(() => {
    if (loading) return [];
    return listHeaderPages({ context }).filter((entry) =>
      meetsPluginRequires(entry.requires, {
        isAuthenticated,
        campaignRole: campaign?.role,
      }),
    );
  }, [context, loading, isAuthenticated, campaign?.role, plugins]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) return;
      if (!rootRef.current.contains(target)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  if (entries.length === 0) return null;

  const controlClass = alignControlsToAvatar
    ? 'inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70'
    : 'inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={controlClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Plugin pages"
        title="Plugin pages"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Puzzle className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden rounded-lg border border-border bg-elevated py-1 shadow-lg"
        >
          {entries.map((entry) => {
            const Icon = resolvePluginSidebarIcon(entry.icon);
            const to =
              context === 'campaign' && campaign?.handle
                ? pluginPagePath(campaign.handle, entry.pluginId, entry.pageId)
                : globalPluginPagePath(entry.pluginId, entry.pageId);
            return (
              <Link
                key={`${entry.pluginId}:${entry.id}`}
                role="menuitem"
                to={to}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-canvas/40"
                onClick={() => setOpen(false)}
              >
                {Icon ? <Icon className="size-4 shrink-0 text-muted" aria-hidden /> : null}
                <span className="truncate">{entry.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
