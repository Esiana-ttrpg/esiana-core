import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { DOWNTIME_HUB_TITLE } from '@shared/downtimeHub';
import {
  DOWNTIME_SECTIONS,
  downtimeSectionHref,
  type DowntimeSectionId,
} from '@/lib/downtimeLayout';
import { workspaceRailTabClass } from '@/lib/workspaceRailTabs';

interface DowntimeSectionTabsProps {
  basePath: string;
  activeSection: DowntimeSectionId | null;
}

type DowntimeTabEntry =
  | { kind: 'overview'; label: string; href: string }
  | { kind: 'section'; id: DowntimeSectionId; label: string; href: string };

export function DowntimeSectionTabs({ basePath, activeSection }: DowntimeSectionTabsProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const tabs: DowntimeTabEntry[] = useMemo(
    () => [
      { kind: 'overview', label: DOWNTIME_HUB_TITLE, href: basePath },
      ...DOWNTIME_SECTIONS.map((section) => ({
        kind: 'section' as const,
        id: section.id,
        label: section.label,
        href: downtimeSectionHref(basePath, section.id),
      })),
    ],
    [basePath],
  );

  const activeLabel =
    tabs.find((tab) =>
      tab.kind === 'overview'
        ? activeSection == null
        : tab.id === activeSection,
    )?.label ?? DOWNTIME_HUB_TITLE;

  useEffect(() => {
    if (!menuOpen) return;
    const activeIndex = tabs.findIndex((tab) =>
      tab.kind === 'overview' ? activeSection == null : tab.id === activeSection,
    );
    setHighlightIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [menuOpen, activeSection, tabs]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!menuOpen) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, tabs.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (tabs[highlightIndex]) {
          setMenuOpen(false);
          triggerRef.current?.focus();
        }
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, highlightIndex, tabs]);

  function isTabActive(tab: DowntimeTabEntry): boolean {
    if (tab.kind === 'overview') return activeSection == null;
    return activeSection === tab.id;
  }

  return (
    <>
      <div className="relative min-w-0 flex-1 max-md:hidden">
        <div
          className="workspace-rail__tablist scrollbar-thin flex gap-1 overflow-x-auto scroll-smooth pb-px [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Downtime sections"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.kind === 'overview' ? 'overview' : tab.id}
              to={tab.href}
              end={tab.kind === 'overview'}
              role="tab"
              aria-selected={isTabActive(tab)}
              className={({ isActive }) => workspaceRailTabClass(isActive)}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas/70 to-transparent lg:hidden"
          aria-hidden
        />
      </div>

      <div className="relative min-w-0 flex-1 md:hidden">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={listboxId}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-sm font-medium text-foreground hover:border-primary/50"
        >
          <span className="min-w-0 flex-1 truncate">{activeLabel}</span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {menuOpen ? (
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label="Downtime sections"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
          >
            {tabs.map((tab, index) => {
              const isSelected = isTabActive(tab);
              const isHighlighted = index === highlightIndex;
              return (
                <NavLink
                  key={tab.kind === 'overview' ? 'overview' : tab.id}
                  to={tab.href}
                  end={tab.kind === 'overview'}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setMenuOpen(false)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${
                    isHighlighted ? 'bg-elevated/80' : ''
                  } ${isSelected ? 'font-medium text-primary' : 'text-foreground hover:bg-elevated/60'}`}
                >
                  <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
