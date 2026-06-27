import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SessionTimelineSelect } from '@/components/session/SessionTimelineSelect';
import { ensureSessionAuthorNote } from '@/lib/wiki';
import { campaignNotePath } from '@/lib/campaignPaths';

interface CreateSessionNoteDialogProps {
  open: boolean;
  campaignHandle: string;
  canManageRole: boolean;
  hasSessions: boolean;
  onClose: () => void;
  onCreateNewSession: () => void;
}

export function CreateSessionNoteDialog({
  open,
  campaignHandle,
  canManageRole,
  hasSessions,
  onClose,
  onCreateNewSession,
}: CreateSessionNoteDialogProps) {
  const navigate = useNavigate();
  const [timelinePointId, setTimelinePointId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTimelinePointId(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleCreate() {
    if (!timelinePointId) return;
    setCreating(true);
    setError(null);
    try {
      await ensureSessionAuthorNote(campaignHandle, timelinePointId);
      onClose();
      navigate(campaignNotePath(campaignHandle, timelinePointId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create session note page.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className={TYPE_DISPLAY_CLASS}>Create New Page</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {hasSessions ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Choose which session this note belongs to. You will write in your own column for that
              session.
            </p>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs text-muted">Session</span>
              <SessionTimelineSelect
                campaignHandle={campaignHandle}
                value={timelinePointId}
                onChange={setTimelinePointId}
                placeholder="Select a session"
              />
            </label>
            {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!timelinePointId || creating}
                onClick={() => void handleCreate()}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Opening…' : 'Create page'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              No sessions on the timeline yet.
              {canManageRole
                ? ' Create the first session before adding session notes.'
                : ' Ask your GM to create the first session.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Close
              </button>
              {canManageRole ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNewSession();
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90"
                >
                  Create New Session
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
