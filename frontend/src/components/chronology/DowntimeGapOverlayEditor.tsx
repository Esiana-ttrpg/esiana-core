import { useState } from 'react';
import type { DowntimeGapOverlay } from '@shared/downtimeAnnotations';
import { putDowntimeGapOverlay } from '@/lib/downtimeGapOverlayApi';

interface DowntimeGapOverlayEditorProps {
  campaignHandle: string;
  gapId: string;
  onSaved?: () => void;
}

export function DowntimeGapOverlayEditor({
  campaignHandle,
  gapId,
  onSaved,
}: DowntimeGapOverlayEditorProps) {
  const [promotedLabel, setPromotedLabel] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmedLabel = promotedLabel.trim();
    const trimmedNote = locationNote.trim();
    if (!trimmedLabel && !trimmedNote) return;

    setSaving(true);
    setError(null);
    try {
      const overlay: DowntimeGapOverlay = {
        gapId,
        promotedLabel: trimmedLabel || null,
        locationMentions: trimmedNote
          ? [{ note: trimmedNote, source: 'authored' }]
          : [],
      };
      await putDowntimeGapOverlay(campaignHandle, overlay);
      setPromotedLabel('');
      setLocationNote('');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save overlay');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded border border-border/60 bg-surface/30 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Annotate period
      </p>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Period label (optional)</span>
        <input
          type="text"
          value={promotedLabel}
          onChange={(e) => setPromotedLabel(e.target.value)}
          placeholder="e.g. The Frost Months"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Location mention (optional)</span>
        <textarea
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
          placeholder="e.g. Northwall remained under reconstruction."
          rows={2}
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </label>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={saving || (!promotedLabel.trim() && !locationNote.trim())}
        onClick={() => void handleSave()}
        className="rounded border border-primary/40 px-2 py-1 text-xs text-primary disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save annotation'}
      </button>
    </div>
  );
}
