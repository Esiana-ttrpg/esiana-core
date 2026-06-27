import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';

interface MapDeleteDialogProps {
  open: boolean;
  mapTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function MapDeleteDialog({
  open,
  mapTitle,
  onClose,
  onConfirm,
}: MapDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Delete map"
      >
        <h3 className={TYPE_DISPLAY_CLASS}>Delete map?</h3>
        <p className="mt-2 text-sm text-muted">
          This permanently removes <strong>{mapTitle}</strong>, all pins on it,
          and stored image files. This cannot be undone.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-destructive px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void onConfirm()
                .then(onClose)
                .catch((err) => {
                  setError(
                    err instanceof Error ? err.message : 'Delete failed',
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Deleting…' : 'Delete map'}
          </button>
        </div>
      </div>
    </div>
  );
}
