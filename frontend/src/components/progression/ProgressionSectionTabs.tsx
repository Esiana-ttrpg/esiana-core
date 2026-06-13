import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  PROGRESSION_SECTIONS,
  progressionSectionHref,
  type ProgressionSectionId,
} from '@/lib/progressionLayout';
import { workspaceRailTabClass } from '@/lib/workspaceRailTabs';

interface ProgressionSectionTabsProps {
  basePath: string;
  activeSection: ProgressionSectionId;
}

export function ProgressionSectionTabs({
  basePath,
  activeSection,
}: ProgressionSectionTabsProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const activeLabel =
    PROGRESSION_SECTIONS.find((section) => section.id === activeSection)?.label ??
    PROGRESSION_SECTIONS[0]?.label ??
    'Scenes';

  useEffect(() => {
    if (!menuOpen) return;
    const activeIndex = PROGRESSION_SECTIONS.findIndex(
      (section) => section.id === activeSection,
    );
    setHighlightIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [menuOpen, activeSection]);

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
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="relative min-w-0 flex-1 max-md:hidden">
        <div
          className="workspace-rail__tablist scrollbar-thin flex gap-1 overflow-x-auto scroll-smooth pb-px [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Progression sections"
        >
          {PROGRESSION_SECTIONS.map((section) => (
            <NavLink
              key={section.id}
              to={progressionSectionHref(basePath, section.id)}
              role="tab"
              aria-selected={activeSection === section.id}
              className={({ isActive }) => workspaceRailTabClass(isActive)}
            >
              {section.label}
            </NavLink>
          ))}
        </div>
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
            aria-label="Progression sections"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
          >
            {PROGRESSION_SECTIONS.map((section, index) => {
              const isSelected = activeSection === section.id;
              const isHighlighted = index === highlightIndex;
              return (
                <NavLink
                  key={section.id}
                  to={progressionSectionHref(basePath, section.id)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setMenuOpen(false)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm ${
                    isHighlighted ? 'bg-elevated/80' : ''
                  } ${isSelected ? 'font-medium text-primary' : 'text-foreground hover:bg-elevated/60'}`}
                >
                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
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
