import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useId, useRef, useState, useEffect } from 'react';
import {
  STORY_VIEWS,
  adventureViewHref,
  type StoryViewId,
} from '@/lib/adventureLayout';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface StoryViewTabsProps {
  basePath: string;
  activeView: StoryViewId;
  isDMUser?: boolean;
}

export function StoryViewTabs({ basePath, activeView, isDMUser: isDMUserProp }: StoryViewTabsProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleViews = STORY_VIEWS.filter(
    (view) => !('gmOnly' in view && view.gmOnly) || isDMUser,
  );
  const activeLabel =
    visibleViews.find((view) => view.id === activeView)?.label ?? 'Quests';

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const tabClass = (isActive: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive
        ? 'bg-accent/15 text-accent'
        : 'text-muted hover:bg-elevated/60 hover:text-foreground'
    }`;

  return (
    <>
      <div
        className="hidden flex-wrap gap-1 max-md:hidden md:flex"
        role="tablist"
        aria-label="Story views"
      >
        {visibleViews.map((view) => (
          <NavLink
            key={view.id}
            to={adventureViewHref(basePath, view.id)}
            role="tab"
            aria-selected={activeView === view.id}
            className={({ isActive }) => tabClass(isActive)}
          >
            {view.label}
          </NavLink>
        ))}
      </div>

      <div className="relative md:hidden">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={listboxId}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium"
        >
          <span className="flex-1 truncate text-left">{activeLabel}</span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {menuOpen ? (
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface py-1 shadow-xl"
          >
            {visibleViews.map((view) => (
              <NavLink
                key={view.id}
                to={adventureViewHref(basePath, view.id)}
                role="option"
                aria-selected={activeView === view.id}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm ${isActive ? 'font-medium text-primary' : 'text-foreground hover:bg-elevated/60'}`
                }
              >
                {view.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
