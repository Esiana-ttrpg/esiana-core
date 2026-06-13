import { X } from 'lucide-react';
import type { ActiveRefineChip } from '@/lib/categoryIndexBrowse';

interface CategoryIndexActiveRefineChipsProps {
  chips: ActiveRefineChip[];
  onRemove: (facetId: string, optionValue: string) => void;
}

export function CategoryIndexActiveRefineChips({
  chips,
  onRemove,
}: CategoryIndexActiveRefineChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={`${chip.facetId}-${chip.optionValue}`}
          type="button"
          onClick={() => onRemove(chip.facetId, chip.optionValue)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-foreground hover:border-primary/40"
        >
          <span className="text-muted">{chip.facetLabel}:</span>
          <span>{chip.optionValue === '(unset)' ? 'Unset' : chip.optionValue}</span>
          <X className="size-3 text-muted" aria-hidden />
        </button>
      ))}
    </div>
  );
}
