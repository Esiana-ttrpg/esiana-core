import { useCallback, useRef, type KeyboardEvent } from 'react';
import type { AppearancePresentationOption } from '@/lib/entityAppearanceProjection';

interface AppearancePresentationSelectorProps {
  presentations: AppearancePresentationOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
}

function chipClass(isSelected: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    isSelected
      ? 'border-primary/40 bg-primary/15 text-primary'
      : 'border-border/50 bg-elevated/40 text-muted hover:border-border hover:text-foreground'
  }`;
}

export function AppearancePresentationSelector({
  presentations,
  selectedId,
  onSelect,
  ariaLabel = 'Character presentations',
}: AppearancePresentationSelectorProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const focusTab = useCallback((id: string) => {
    tabRefs.current.get(id)?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (presentations.length <= 1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % presentations.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + presentations.length) % presentations.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = presentations.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const next = presentations[nextIndex];
    if (!next) return;
    onSelect(next.id);
    focusTab(next.id);
  }

  if (presentations.length <= 1) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="tablist"
      aria-label={ariaLabel}
    >
      {presentations.map((presentation, index) => {
        const selected = presentation.id === selectedId;
        return (
          <button
            key={presentation.id}
            ref={(node) => {
              if (node) tabRefs.current.set(presentation.id, node);
              else tabRefs.current.delete(presentation.id);
            }}
            type="button"
            role="tab"
            id={`appearance-presentation-${presentation.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={chipClass(selected)}
            onClick={() => onSelect(presentation.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {presentation.label}
          </button>
        );
      })}
    </div>
  );
}
