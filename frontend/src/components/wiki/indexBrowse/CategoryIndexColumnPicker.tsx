import { useEffect, useRef, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  getCategoryColumnHeaderLabel,
  getCategoryDefaultColumns,
  getCategoryOptionalColumns,
} from '@/lib/metadataConfig';

interface CategoryIndexColumnPickerProps {
  categoryTitle: string;
  selectedOptionalKeys: string[];
  onSelectedOptionalKeysChange: (keys: string[]) => void;
}

export function CategoryIndexColumnPicker({
  categoryTitle,
  selectedOptionalKeys,
  onSelectedOptionalKeysChange,
}: CategoryIndexColumnPickerProps) {
  const optionalColumns = getCategoryOptionalColumns(categoryTitle);
  if (optionalColumns.length === 0) return null;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const defaultColumns = getCategoryDefaultColumns(categoryTitle);
  const selectedSet = new Set(selectedOptionalKeys);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function toggleOptional(key: string) {
    const next = selectedSet.has(key)
      ? selectedOptionalKeys.filter((k) => k !== key)
      : [...selectedOptionalKeys, key];
    onSelectedOptionalKeysChange(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated/50 px-2.5 py-1.5 text-sm transition-colors ${
          selectedOptionalKeys.length > 0
            ? 'text-primary'
            : 'text-muted hover:text-foreground'
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Columns3 className="size-4" />
        <span className="hidden sm:inline">Columns</span>
        {selectedOptionalKeys.length > 0 ? (
          <span className="rounded bg-primary/15 px-1.5 text-xs text-primary">
            {selectedOptionalKeys.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <p className={META_SECTION_LABEL_CLASS}>Default columns</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {defaultColumns.map((key) => (
              <li key={key} className="flex items-center gap-2 px-1 py-0.5">
                <input
                  type="checkbox"
                  checked
                  disabled
                  readOnly
                  className="size-3.5 rounded border-border"
                  aria-label={`${key} (always shown)`}
                />
                <span>{getCategoryColumnHeaderLabel(key)}</span>
              </li>
            ))}
          </ul>
          <p className={`${META_SECTION_LABEL_CLASS} mt-4`}>Optional columns</p>
          <ul className="mt-2 space-y-1 text-sm">
            {optionalColumns.map((key) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-elevated/60">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(key)}
                    onChange={() => toggleOptional(key)}
                    className="size-3.5 rounded border-border"
                  />
                  <span>{getCategoryColumnHeaderLabel(key)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
