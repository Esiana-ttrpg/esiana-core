import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  TAG_ICON_CATALOG,
  TAG_ICON_CATALOG_NAMES,
} from '@/lib/tagIconCatalog';
import { RotateCcw, Upload } from 'lucide-react';
import { useRef } from 'react';

interface IconAppearancePickerProps {
  activeLucide: string | null;
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  onLucidePick: (name: string) => void;
  onUpload: (file: File) => void;
  onReset: () => void;
  compact?: boolean;
}

export function IconAppearancePicker({
  activeLucide,
  disabled = false,
  saving = false,
  error,
  onLucidePick,
  onUpload,
  onReset,
  compact = false,
}: IconAppearancePickerProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isDisabled = disabled || saving;

  return (
    <div className={`space-y-3 ${compact ? 'p-2' : ''}`}>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {!compact && (
          <span className={META_SECTION_LABEL_CLASS}>
            Lucide icon
          </span>
        )}
        <div
          className={`grid grid-cols-8 gap-1 overflow-y-auto rounded-md border border-border bg-background p-2 sm:grid-cols-10 ${
            compact ? 'max-h-36' : 'max-h-40'
          }`}
        >
          {TAG_ICON_CATALOG_NAMES.map((name) => {
            const Icon = TAG_ICON_CATALOG[name];
            if (!Icon) return null;
            const isActive = activeLucide === name;
            return (
              <button
                key={name}
                type="button"
                disabled={isDisabled}
                title={name}
                onClick={() => onLucidePick(name)}
                className={`flex size-8 items-center justify-center rounded transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
        >
          <Upload className="size-3.5" aria-hidden />
          Upload SVG
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-surface disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </button>
      </div>
    </div>
  );
}
