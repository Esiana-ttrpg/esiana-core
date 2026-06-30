import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteSessionNotePage,
  deleteWikiPage,
  fetchWikiDeletePreview,
  type ChildReparentPlanEntry,
  type WikiDeleteMode,
  type WikiDeletePreview,
} from '@/lib/wiki';

const RULE_LABELS: Record<ChildReparentPlanEntry['ruleApplied'], string> = {
  geographical: 'Location tier-up',
  contained: 'Contained entity',
  structural: 'Structural',
  fallback: 'Fallback',
};

interface WikiPageDeleteDialogProps {
  open: boolean;
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  variant?: 'wiki' | 'session-note';
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}

export function WikiPageDeleteDialog({
  open,
  campaignHandle,
  pageId,
  pageTitle,
  variant = 'wiki',
  onClose,
  onDeleted,
}: WikiPageDeleteDialogProps) {
  const [preview, setPreview] = useState<WikiDeletePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WikiDeleteMode>('orphan');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [showReparentPlan, setShowReparentPlan] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
      setMode('orphan');
      setConfirmPhrase('');
      setShowReparentPlan(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWikiDeletePreview(campaignHandle, pageId)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load delete preview');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle, pageId]);

  const needsRecursiveConfirm =
    mode === 'recursive' && (preview?.descendantCount ?? 0) > 0;
  const recursiveConfirmed =
    !needsRecursiveConfirm || confirmPhrase.trim() === pageTitle.trim();
  const canSubmit =
    !loading &&
    !deleting &&
    !error &&
    preview &&
    recursiveConfirmed &&
    !(mode === 'recursive' && preview.hasReservedInSubtree);

  async function handleDelete() {
    if (!canSubmit) return;
    setDeleting(true);
    setError(null);
    try {
      const payload = {
        mode,
        confirm: true as const,
        ...(needsRecursiveConfirm ? { confirmPhrase: confirmPhrase.trim() } : {}),
      };
      if (variant === 'session-note') {
        await deleteSessionNotePage(campaignHandle, pageId, payload);
      } else {
        await deleteWikiPage(campaignHandle, pageId, payload);
      }
      await onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-2xl"
        role="dialog"
        aria-labelledby="wiki-delete-title"
      >
        <h2 id="wiki-delete-title" className={TYPE_DISPLAY_CLASS}>
          Delete “{pageTitle}”
        </h2>

        {loading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading subtree preview…
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {preview && !loading && (
          <>
            <p className="mt-3 text-sm text-muted">
              {preview.directChildCount} direct sub-page
              {preview.directChildCount === 1 ? '' : 's'}
              {preview.descendantCount > preview.directChildCount
                ? ` (${preview.descendantCount} total in subtree)`
                : ''}
              .
            </p>

            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">Deletion mode</legend>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 hover:bg-surface">
                <input
                  type="radio"
                  name="delete-mode"
                  checked={mode === 'orphan'}
                  onChange={() => setMode('orphan')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Remove this page only (context-aware reparent)
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Locations tier up; NPCs and items follow their location or taxonomic
                    folders; quests and factions keep narrative lineage.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-red-900/40 p-3 hover:bg-red-950/20">
                <input
                  type="radio"
                  name="delete-mode"
                  checked={mode === 'recursive'}
                  onChange={() => setMode('recursive')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Delete this page and all sub-pages
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Permanently removes the entire subtree. Cannot be undone.
                  </span>
                </span>
              </label>
            </fieldset>

            {mode === 'orphan' && preview.childReparentPlan.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowReparentPlan((prev) => !prev)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {showReparentPlan ? 'Hide' : 'Show'} reparent plan (
                  {preview.childReparentPlan.length})
                </button>
                {showReparentPlan && (
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface p-2 text-xs">
                    {preview.childReparentPlan.map((entry) => (
                      <li key={entry.childId} className="text-foreground">
                        <span className="font-medium">{entry.childTitle}</span>
                        <span className="text-muted"> → </span>
                        <span>{entry.proposedParentTitle ?? 'Campaign root'}</span>
                        <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                          {RULE_LABELS[entry.ruleApplied]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {mode === 'recursive' && preview.hasReservedInSubtree && (
              <p className="mt-3 text-sm text-red-400">
                This subtree contains system pages and cannot be recursively deleted.
              </p>
            )}

            {needsRecursiveConfirm && (
              <div className="mt-4">
                <label className="block text-sm text-foreground">
                  Type <strong>{pageTitle}</strong> to confirm recursive delete:
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(event) => setConfirmPhrase(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-red-500/60"
                  autoComplete="off"
                />
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!canSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
