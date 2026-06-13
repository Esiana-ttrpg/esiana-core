import { NavLink } from 'react-router-dom';
import { SCENES_VIEWS, scenesViewHref, type ScenesViewId } from '@/lib/progressionLayout';

interface ScenesViewTabsProps {
  basePath: string;
  activeView: ScenesViewId;
}

export function ScenesViewTabs({ basePath, activeView }: ScenesViewTabsProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-elevated/40 p-0.5"
      role="tablist"
      aria-label="Scenes views"
    >
      {SCENES_VIEWS.map((view) => (
        <NavLink
          key={view.id}
          to={scenesViewHref(basePath, view.id)}
          role="tab"
          aria-selected={activeView === view.id}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          {view.label}
        </NavLink>
      ))}
    </div>
  );
}
