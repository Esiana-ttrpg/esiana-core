import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchTimeTracking,
  formatCampaignDateLabel,
  masterCalendarFromBundle,
} from '@/lib/timeTrackingApi';
import { createNewSessionTimeline } from '@/lib/wiki';
import { campaignNotePath } from '@/lib/campaignPaths';
import { flattenTimelineSessions } from '@/lib/sessionNotesIndex';
import { SessionTimelinePreview } from '@/components/session/SessionTimelinePreview';
import { SessionTimeAdvancePanel } from '@/components/session/SessionTimeAdvancePanel';
import type { SessionNotesIndexPayload } from '@/types/wiki';

interface CreateNewSessionDialogProps {
  open: boolean;
  campaignHandle: string;
  sessionDuration?: string | null;
  indexData: SessionNotesIndexPayload | null;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateNewSessionDialog({
  open,
  campaignHandle,
  sessionDuration,
  indexData,
  onClose,
  onCreated,
}: CreateNewSessionDialogProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<'preview' | 'advance'>('preview');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [advancePanelKey, setAdvancePanelKey] = useState(0);

  const timelineSessions = useMemo(
    () => (indexData ? flattenTimelineSessions(indexData) : []),
    [indexData],
  );

  const nextSessionTitle = useMemo(() => {
    const maxOrder = timelineSessions.reduce(
      (max, session) => Math.max(max, session.sequenceOrder ?? 0),
      0,
    );
    return `Session ${maxOrder + 1}`;
  }, [timelineSessions]);

  useEffect(() => {
    if (!open) {
      setView('preview');
      setError(null);
      return;
    }
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        setCurrentDateLabel(formatCampaignDateLabel(masterCalendarFromBundle(bundle)));
      })
      .catch(() => {
        if (!cancelled) setCurrentDateLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle]);

  if (!open) return null;

  async function handleCreateSession() {
    setCreating(true);
    setError(null);
    try {
      const created = await createNewSessionTimeline(campaignHandle);
      onCreated();
      onClose();
      navigate(campaignNotePath(campaignHandle, created.timelinePointId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create session.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className={TYPE_DISPLAY_CLASS}>
              {view === 'preview' ? 'Create New Session' : 'Advance Time'}
            </h2>
            {view === 'preview' ? (
              <p className="mt-1 text-sm text-muted">
                Add a new session to the campaign timeline.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Move the campaign clock forward before creating the next session.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {view === 'preview' ? (
          <>
            {currentDateLabel ? (
              <div className="mb-4 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 text-sm">
                <span className="text-muted">Current campaign date: </span>
                <span className="text-foreground">{currentDateLabel}</span>
              </div>
            ) : null}

            <SessionTimelinePreview
              sessions={timelineSessions}
              nextSessionTitle={nextSessionTitle}
              currentCampaignDateLabel={currentDateLabel}
            />

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdvancePanelKey((key) => key + 1);
                  setView('advance');
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Advance Time
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreateSession()}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create session'}
              </button>
            </div>
          </>
        ) : (
          <SessionTimeAdvancePanel
            key={advancePanelKey}
            campaignHandle={campaignHandle}
            sessionDuration={sessionDuration}
            variant="confirm"
            showCurrentDate
            onCancel={() => setView('preview')}
            onAdvanced={(response) => {
              const master = response ? masterCalendarFromBundle(response) : null;
              setCurrentDateLabel(formatCampaignDateLabel(master));
              setView('preview');
            }}
          />
        )}
      </div>
    </div>
  );
}
