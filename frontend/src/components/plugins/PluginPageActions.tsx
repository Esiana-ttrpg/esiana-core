import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOptionalWiki } from '@/contexts/WikiContext';
import {
  listPageActions,
  meetsPluginRequires,
  type PluginPageTarget,
} from '@/lib/pluginContributions';
import { pluginPagePath, resolvePluginSidebarIcon } from '@/lib/pluginNavigation';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';

/** Plugin actions for a page target — renders nothing when empty. */
export function PluginPageActions({
  target,
  onSelect,
}: {
  target: PluginPageTarget;
  /** Called after an in-menu action is chosen (e.g. close overflow). */
  onSelect?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const wiki = useOptionalWiki();
  const { loading, plugins } = usePluginRuntime();

  const actions = useMemo(() => {
    if (loading) return [];
    return listPageActions(target).filter((action) =>
      meetsPluginRequires(action.requires, {
        isAuthenticated,
        campaignRole: wiki?.campaign?.role,
      }),
    );
  }, [target, loading, isAuthenticated, wiki?.campaign?.role, plugins]);

  if (actions.length === 0) return null;

  const handle = wiki?.campaignHandle;

  return (
    <>
      <div className="my-1 border-t border-border/50" role="separator" />
      {actions.map((action) => {
        const Icon = resolvePluginSidebarIcon(action.icon);
        const className =
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-canvas/40';

        if (action.href) {
          return (
            <a
              key={`${action.pluginId}:${action.id}`}
              href={action.href}
              className={className}
              onClick={onSelect}
            >
              {Icon ? <Icon className="size-4 shrink-0 text-muted" aria-hidden /> : null}
              <span className="truncate">{action.label}</span>
            </a>
          );
        }

        if (action.pageId && handle) {
          return (
            <Link
              key={`${action.pluginId}:${action.id}`}
              to={pluginPagePath(handle, action.pluginId, action.pageId)}
              className={className}
              onClick={onSelect}
            >
              {Icon ? <Icon className="size-4 shrink-0 text-muted" aria-hidden /> : null}
              <span className="truncate">{action.label}</span>
            </Link>
          );
        }

        return null;
      })}
    </>
  );
}
