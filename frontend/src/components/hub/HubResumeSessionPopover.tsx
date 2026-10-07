import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { patchMySessionAttendance } from '@/lib/notifications';
import type { SessionAttendanceStatus } from '@/types/notifications';

export type HubSessionInteractionMode = 'rsvp' | 'checkin';

interface HubResumeSessionPopoverProps {
  open: boolean;
  onClose: () => void;
  campaignHandle: string;
  sessionTitle: string;
  plannedStartAt: string;
  timelinePointId: string;
  mode: HubSessionInteractionMode;
  onCompleted: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

function formatSessionWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function HubResumeSessionPopover({
  open,
  onClose,
  campaignHandle,
  sessionTitle,
  plannedStartAt,
  timelinePointId,
  mode,
  onCompleted,
  anchorRef,
}: HubResumeSessionPopoverProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const heading =
    mode === 'checkin' ? `Check in · ${sessionTitle}` : `RSVP for ${sessionTitle}`;
  const prompt =
    mode === 'checkin' ? 'Confirm your attendance for this session.' : 'Will you be attending?';
  const primaryLabel = 'Attending';
  const secondaryLabel = "Can't attend";

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 288;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const top = Math.max(8, rect.top - 8);
    setCoords({ top, left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>('button[data-rsvp-primary]')?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open || !coords) return null;

  async function submit(status: SessionAttendanceStatus) {
    setBusy(true);
    setError(null);
    try {
      await patchMySessionAttendance(campaignHandle, timelinePointId, { status });
      onCompleted();
      onClose();
    } catch {
      setError(mode === 'checkin' ? 'Could not save check-in. Try again.' : 'Could not save RSVP. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        aria-label="Dismiss session dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hub-resume-session-popover fixed z-50 w-72 -translate-y-full rounded-lg border border-border bg-elevated p-3 shadow-lg"
        style={{ top: coords.top, left: coords.left }}
      >
        <p id={titleId} className="text-sm font-semibold text-foreground">
          {heading}
        </p>
        <p className="mt-0.5 text-xs text-muted">{formatSessionWhen(plannedStartAt)}</p>
        <p className="mt-3 text-xs text-foreground/90">{prompt}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            data-rsvp-primary
            disabled={busy}
            onClick={() => void submit('ATTENDING')}
            className="rounded-md border border-[color:var(--color-status-legend-border)] bg-[color:var(--color-status-legend-bg)] px-2 py-1.5 text-xs font-medium text-[color:var(--color-status-legend-fg)] disabled:opacity-50"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit('ABSENT')}
            className="rounded-md border border-border bg-background/70 px-2 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        </div>
        {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-2 w-full py-1 text-center text-[11px] text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </>,
    document.body,
  );
}

/** @deprecated Use HubResumeSessionPopover */
export const HubResumeRsvpPopover = HubResumeSessionPopover;
