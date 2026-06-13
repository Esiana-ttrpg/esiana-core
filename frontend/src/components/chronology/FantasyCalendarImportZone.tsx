import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  importFantasyCalendarJson,
  previewFantasyCalendarImport,
  type FantasyCalendarImportPreview,
  type FantasyCalendarImportResult,
} from '@/lib/fantasyCalendarImportApi';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function formatPreviewSummary(preview: FantasyCalendarImportPreview): string {
  const { resolvedDate } = preview;
  return `${preview.calendarName}: ${preview.monthCount} months, ${preview.weekdayCount} weekdays, ${preview.moonCount} moons. Date Y${resolvedDate.year} M${resolvedDate.monthIndex + 1} D${resolvedDate.day}.`;
}

interface FantasyCalendarImportZoneProps {
  campaignHandle?: string;
  mode: 'preview' | 'import';
  selectedFile?: File | null;
  onFileSelected?: (file: File | null) => void;
  onImportComplete?: (result: FantasyCalendarImportResult) => void;
  disabled?: boolean;
  importing?: boolean;
  className?: string;
}

export function FantasyCalendarImportZone({
  campaignHandle,
  mode,
  selectedFile = null,
  onFileSelected,
  onImportComplete,
  disabled = false,
  importing = false,
  className = '',
}: FantasyCalendarImportZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<FantasyCalendarImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [localImporting, setLocalImporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPreview = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.json')) {
        setPreviewError('Please choose a .json file exported from Fantasy-Calendar.com.');
        setPreview(null);
        return;
      }

      setPreviewing(true);
      setPreviewError(null);
      try {
        const text = await readFileAsText(file);
        const parsed = JSON.parse(text) as unknown;
        const result = await previewFantasyCalendarImport(parsed, campaignHandle);
        setPreview(result);
      } catch (error) {
        setPreview(null);
        setPreviewError(
          error instanceof Error ? error.message : 'Failed to preview calendar export.',
        );
      } finally {
        setPreviewing(false);
      }
    },
    [campaignHandle],
  );

  const handleFile = useCallback(
    (file: File | null) => {
      onFileSelected?.(file);
      setImportSummary(null);
      if (!file) {
        setPreview(null);
        setPreviewError(null);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runPreview(file);
      }, 250);
    },
    [onFileSelected, runPreview],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleImport = async () => {
    if (!campaignHandle || !selectedFile || mode !== 'import') return;
    setLocalImporting(true);
    setImportSummary(null);
    try {
      const text = await readFileAsText(selectedFile);
      const parsed = JSON.parse(text) as unknown;
      const result = await importFantasyCalendarJson(campaignHandle, parsed);
      const timelineNote = result.createdNewTimeline
        ? ` Added new timeline “${result.calendarName}”.`
        : ` Set master timeline “${result.calendarName}”.`;
      const summary = `Imported successfully.${timelineNote} ${formatPreviewSummary(result)}${
        result.isMasterTime ? ` Epoch minute ${result.currentEpochMinute}.` : ''
      }`;
      setImportSummary(summary);
      setPreview(result);
      onImportComplete?.(result);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : 'Failed to import Fantasy-Calendar JSON.',
      );
    } finally {
      setLocalImporting(false);
    }
  };

  const busy = disabled || importing || localImporting || previewing;
  const showImportButton = mode === 'import' && Boolean(campaignHandle);

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const file = event.dataTransfer.files?.[0] ?? null;
        handleFile(file);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center text-xs sm:text-sm ${
        dragOver
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface/40 text-foreground'
      } ${className}`}
    >
      <div className="flex items-center gap-2 text-primary">
        <span className="text-base">📥</span>
        <span className="font-semibold">Import World Config (.json)</span>
      </div>
      <p className="max-w-xl text-[11px] text-muted">
        Drag a Fantasy-Calendar.com export here or choose a .json file. Import adds a new timeline
        when one already exists, or sets the master timeline on a fresh campaign.
      </p>

      {previewing && (
        <p className="flex items-center gap-2 text-[11px] text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Previewing export…
        </p>
      )}

      {preview && !previewing && (
        <p className="max-w-xl rounded-lg border border-border bg-background/60 px-3 py-2 text-[11px] text-foreground">
          {formatPreviewSummary(preview)}
          {preview.warnings.length > 0 && (
            <span className="mt-1 block text-amber-200/90">
              Warnings: {preview.warnings.join(' ')}
            </span>
          )}
        </p>
      )}

      {previewError && (
        <p className="max-w-xl rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-[11px] text-red-200">
          {previewError}
        </p>
      )}

      {importSummary && (
        <p className="max-w-xl rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200">
          {importSummary}
        </p>
      )}

      {selectedFile && (
        <p className="text-[11px] text-muted">Selected: {selectedFile.name}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/70 hover:text-primary">
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              handleFile(file);
              event.target.value = '';
            }}
          />
          {busy && !localImporting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Working…
            </>
          ) : (
            <>
              <span className="text-base">📂</span>
              Choose .json file
            </>
          )}
        </label>

        {showImportButton && (
          <button
            type="button"
            disabled={busy || !selectedFile || !preview}
            onClick={() => void handleImport()}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            {localImporting || importing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Importing…
              </>
            ) : (
              'Apply import'
            )}
          </button>
        )}
      </div>
    </section>
  );
}
