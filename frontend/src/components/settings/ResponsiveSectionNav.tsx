import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionNavItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

export interface ResponsiveSectionNavProps<T extends string = string> {
  sections: SectionNavItem[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  mobileLabel?: string;
}

function SectionIcon({
  icon: Icon,
  className = 'size-3.5',
}: {
  icon?: LucideIcon;
  className?: string;
}) {
  if (!Icon) return <span className={`inline-block shrink-0 ${className}`} aria-hidden />;
  return <Icon className={`shrink-0 ${className}`} strokeWidth={2} aria-hidden />;
}

export function ResponsiveSectionNav<T extends string = string>({
  sections,
  activeId,
  onChange,
  ariaLabel = 'Sections',
  mobileLabel = 'Section',
}: ResponsiveSectionNavProps<T>) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const activeSection =
    sections.find((section) => section.id === activeId) ?? sections[0] ?? null;

  useEffect(() => {
    if (!menuOpen) return;
    const activeIndex = sections.findIndex((section) => section.id === activeId);
    setHighlightIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [menuOpen, activeId, sections]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
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
        setHighlightIndex((prev) => Math.min(prev + 1, sections.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const section = sections[highlightIndex];
        if (section) {
          onChange(section.id as T);
          setMenuOpen(false);
          triggerRef.current?.focus();
        }
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, highlightIndex, sections, onChange]);

  function selectSection(id: string) {
    onChange(id as T);
    setMenuOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="border-b border-border">
      {/* Desktop + tablet: horizontal tabs */}
      <div className="relative max-md:hidden">
        <div
          className="scrollbar-thin flex gap-1 overflow-x-auto scroll-smooth pb-px [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={ariaLabel}
        >
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(section.id as T)}
                className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-accent bg-accent/10 text-accent'
                    : 'border-b-2 border-transparent text-muted hover:bg-elevated/60 hover:text-accent'
                }`}
              >
                <SectionIcon icon={section.icon} />
                {section.label}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent lg:hidden"
          aria-hidden
        />
      </div>

      {/* Mobile: icon-aware listbox dropdown */}
      <div className="relative pb-3 md:hidden">
        <p className={`mb-1.5 ${META_FIELD_LABEL_CLASS}`}>
          {mobileLabel}
        </p>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={listboxId}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm font-medium text-foreground hover:border-primary/50"
        >
          <SectionIcon icon={activeSection?.icon} className="size-4 text-primary" />
          <span className="min-w-0 flex-1 truncate">{activeSection?.label ?? 'Select section'}</span>
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
            aria-label={ariaLabel}
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
          >
            {sections.map((section, index) => {
              const isSelected = section.id === activeId;
              const isHighlighted = index === highlightIndex;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectSection(section.id)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent/15 font-semibold text-accent'
                      : isHighlighted
                        ? 'bg-elevated/80 text-foreground'
                        : 'text-foreground hover:bg-elevated/60'
                  }`}
                >
                  <span className="flex w-5 shrink-0 justify-center">
                    <SectionIcon icon={section.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
