import { useMemo, useRef, useState } from 'react';
import { ChronologyEventForm } from './ChronologyEventManagePanel';
import { calendarRowToLike } from '@/lib/chronologyCalendar';
import {
  nowFromCalendarState,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import type { FantasyCalendarApiRow } from '@/lib/timeTrackingApi';
import type {
  TimelineBaseEventRecord,
  TimelineCategoryRecord,
} from '@/lib/chronologyApi';

export function ChronologyCreateEventDialog({
  campaignHandle,
  calendars,
  categories,
  events,
  initialDate,
  initialCalendarId,
  onClose,
  onMutated,
}: {
  campaignHandle: string;
  calendars: FantasyCalendarApiRow[];
  categories: TimelineCategoryRecord[];
  initialCalendarId?: string;
  events: TimelineBaseEventRecord[];
  initialDate: ChronologyDateParts | null;
  onClose: () => void;
  onMutated: () => void | Promise<void>;
}) {
  const [calendarId, setCalendarId] = useState(
    () =>
      (
        calendars.find((row) => row.id === initialCalendarId) ??
        calendars.find((row) => row.isMasterTime) ??
        calendars[0]
      )?.id,
  );
  const status = useRef({ dirty: false, busy: false });
  const calendar = calendars.find((row) => row.id === calendarId);
  const like = useMemo(
    () => (calendar ? calendarRowToLike(calendar) : null),
    [calendar],
  );
  const draft = useMemo(
    (): TimelineBaseEventRecord => ({
      id: '',
      calendarId: calendarId ?? '',
      title: '',
      description: '',
      categoryId: null,
      prerequisiteId: null,
      visibility: 'PARTY',
      importance: 'MINOR',
      duration: 1,
      isRepeating: false,
      repeatInterval: null,
      repeatUnit: null,
      limitRepetitions: null,
      conditions: null,
      moonOverrides: null,
      isRecurring: false,
      targetYear: null,
      targetMonth: null,
      targetDay: null,
      targetEpochMinute: null,
      recurrenceRule: null,
      createdAt: '',
      updatedAt: '',
      tags: [],
    }),
    [calendarId],
  );
  if (!calendar || !like) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="create-event-unavailable-title"
          className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl">
          <h2 id="create-event-unavailable-title" className="text-base font-semibold">Create Event</h2>
          <p className="mt-3 text-sm text-muted">A calendar is required before creating an event.</p>
          <div className="mt-4 flex justify-end">
            <button type="button" autoFocus onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <ChronologyEventForm
      key={calendarId}
      campaignHandle={campaignHandle}
      baseEvent={draft}
      categories={categories}
      editableEvents={events}
      calendarLike={like}
      canManage
      mode="create"
      dateSeed={initialDate ?? nowFromCalendarState(calendar.state)}
      onClose={onClose}
      onMutated={onMutated}
      onStateChange={(dirty, busy) => {
        status.current = { dirty, busy };
      }}
      calendarSelector={
        <label className="block space-y-1 text-xs">
          <span className="font-semibold text-muted">Calendar track</span>
          <select
            value={calendarId}
            className="block w-full rounded border border-border bg-background p-2"
            onChange={(event) => {
              if (
                status.current.busy ||
                (status.current.dirty &&
                  !window.confirm(
                    'Discard unsaved event changes and switch calendar?',
                  ))
              )
                return;
              status.current = { dirty: false, busy: false };
              setCalendarId(event.target.value);
            }}
          >
            {calendars.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      }
    />
  );
}
