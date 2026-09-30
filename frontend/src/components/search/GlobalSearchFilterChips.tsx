import type { GlobalSearchFilterChip } from '@shared/globalSearchQuery';
import { X } from 'lucide-react';

interface GlobalSearchFilterChipsProps {
  chips: GlobalSearchFilterChip[];
  onRemove: (chip: GlobalSearchFilterChip) => void;
}

export function GlobalSearchFilterChips({
  chips,
  onRemove,
}: GlobalSearchFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto border-b border-border/40 px-3 py-2"
      aria-label="Active search filters"
    >
      {chips.map((chip) => (
        <button
          key={`${chip.kind}:${chip.value}`}
          type="button"
          onClick={() => onRemove(chip)}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-xs text-foreground hover:bg-elevated/80"
          aria-label={`Remove filter ${chip.label}`}
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3 shrink-0 opacity-70" aria-hidden />
        </button>
      ))}
    </div>
  );
}
