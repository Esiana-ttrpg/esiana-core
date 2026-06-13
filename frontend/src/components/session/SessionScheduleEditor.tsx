import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Megaphone } from 'lucide-react';
import {
  fetchSessionSchedule,
  patchSessionSchedule,
  publishSessionSchedule,
} from '@/lib/notifications';
import { fetchUserProfile } from '@/lib/user';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { controlClasses } from '@/components/ui/formStyles';
import type { SessionScheduleRecord } from '@/types/notifications';

interface SessionScheduleEditorProps {
  campaignHandle: string;
  timelinePointId: string;
  canManage: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SessionScheduleEditor({
  campaignHandle,
  timelinePointId,
  canManage,
}: SessionScheduleEditorProps) {
  const [schedule, setSchedule] = useState<SessionScheduleRecord | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [preferredTimezone, setPreferredTimezone] = useState('UTC');

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile()
      .then((profile) => {
        if (!cancelled) {
          setPreferredTimezone(profile.effectiveTimezone ?? profile.timezone ?? 'UTC');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreferredTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [venueType, setVenueType] = useState('ONLINE');
  const [venueLabel, setVenueLabel] = useState('');
  const [venueUrl, setVenueUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSessionSchedule(campaignHandle, timelinePointId);
      setSchedule(data.schedule);
      setSessionTitle(data.sessionTitle);
      setPlannedStartAt(toLocalInput(data.schedule?.plannedStartAt ?? null));
      setTimezone(data.schedule?.timezone ?? preferredTimezone);
      setVenueType(data.schedule?.venueType ?? 'ONLINE');
      setVenueLabel(data.schedule?.venueLabel ?? '');
      setVenueUrl(data.schedule?.venueUrl ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, timelinePointId, preferredTimezone]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await patchSessionSchedule(campaignHandle, timelinePointId, {
        plannedStartAt: plannedStartAt ? new Date(plannedStartAt).toISOString() : null,
        timezone: timezone.trim() || null,
        venueType: venueType || null,
        venueLabel: venueLabel.trim() || null,
        venueUrl: venueUrl.trim() || null,
      });
      setSchedule(result.schedule);
      setMessage('Session schedule saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await handleSave();
      const result = await publishSessionSchedule(campaignHandle, timelinePointId);
      setSchedule(result.schedule);
      setMessage('Session published — the party has been notified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish session.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading session schedule…</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">OOC session schedule</h3>
        {schedule?.status === 'PUBLISHED' ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            Published
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-muted">{sessionTitle}</p>

      {canManage ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
              Start (local)
            </span>
            <input
              type="datetime-local"
              value={plannedStartAt}
              onChange={(event) => setPlannedStartAt(event.target.value)}
              className={controlClasses}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
              Timezone
            </span>
            <TimezoneSelect
              id={`session-timezone-${timelinePointId}`}
              value={timezone}
              onChange={setTimezone}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
              Venue type
            </span>
            <select
              value={venueType}
              onChange={(event) => setVenueType(event.target.value)}
              className={controlClasses}
            >
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In person</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
              Venue label
            </span>
            <input
              value={venueLabel}
              onChange={(event) => setVenueLabel(event.target.value)}
              placeholder="Discord voice, John's basement…"
              className={controlClasses}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
              Link
            </span>
            <input
              value={venueUrl}
              onChange={(event) => setVenueUrl(event.target.value)}
              placeholder="https://discord.gg/…"
              className={controlClasses}
            />
          </label>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {message ? <p className="text-sm text-primary">{message}</p> : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-elevated disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
            >
              <Megaphone className="size-4" />
              Publish to party
            </button>
          </div>
        </div>
      ) : schedule ? (
        <div className="space-y-2 text-sm">
          {schedule.plannedStartAt ? (
            <p>
              <strong>When:</strong>{' '}
              {new Date(schedule.plannedStartAt).toLocaleString(undefined, {
                timeZone: schedule.timezone ?? undefined,
              })}
            </p>
          ) : null}
          {schedule.venueLabel ? (
            <p>
              <strong>Where:</strong> {schedule.venueLabel}
            </p>
          ) : null}
          {schedule.venueUrl ? (
            <a
              href={schedule.venueUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Open session link
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">No OOC schedule published yet.</p>
      )}
    </div>
  );
}
