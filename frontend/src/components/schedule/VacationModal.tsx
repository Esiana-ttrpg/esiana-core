import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { controlClasses } from '@/components/ui/formStyles';

export interface VacationModalProps {
  open: boolean;
  initialStart: string | null;
  initialEnd: string | null;
  onClose: () => void;
  onSave: (start: string, end: string) => Promise<void>;
  onClear: () => Promise<void>;
}

export function VacationModal({
  open,
  initialStart,
  initialEnd,
  onClose,
  onSave,
  onClear,
}: VacationModalProps) {
  const [start, setStart] = useState(initialStart ?? '');
  const [end, setEnd] = useState(initialEnd ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStart(initialStart ?? '');
    setEnd(initialEnd ?? '');
    setError(null);
  }, [open, initialStart, initialEnd]);

  if (!open) return null;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!start || !end) {
      setError('Choose both first and last day away.');
      return;
    }
    if (start > end) {
      setError('First day must be on or before last day.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(start, end);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vacation.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError(null);
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end vacation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vacation-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-elevated hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <h2 id="vacation-title" className="text-lg font-semibold text-foreground">
          Vacation
        </h2>
        <p className="mt-1 text-sm text-muted">
          Day-level availability only. Vacation does not change RSVPs.
        </p>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">First day away</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={controlClasses}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Last day away</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={controlClasses}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {initialStart && initialEnd ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleClear()}
                className="mr-auto rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
              >
                End vacation
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
