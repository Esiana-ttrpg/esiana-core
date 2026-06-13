import { useEffect, useMemo, useState } from 'react';
import { fetchSessionNotesIndex } from '@/lib/wiki';
import { flattenTimelineSessions } from '@/lib/sessionNotesIndex';

interface SessionOption {
  id: string;
  title: string;
  sequenceOrder?: number;
}

interface SessionTimelineSelectProps {
  campaignHandle: string;
  value: string | null;
  disabled?: boolean;
  placeholder?: string;
  onChange: (timelinePointId: string | null) => void;
}

export function SessionTimelineSelect({
  campaignHandle,
  value,
  disabled = false,
  placeholder = 'None',
  onChange,
}: SessionTimelineSelectProps) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSessionNotesIndex(campaignHandle)
      .then((payload) => {
        if (cancelled) return;
        const options: SessionOption[] = flattenTimelineSessions(payload).map((page) => ({
          id: page.timelinePointId!,
          title: page.title,
          sequenceOrder: page.sequenceOrder,
        }));
        setSessions(options);
        if (!value && options.length > 0) {
          onChange(options[options.length - 1]?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const selectValue = useMemo(() => value ?? '', [value]);

  return (
    <select
      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60 disabled:opacity-60"
      disabled={disabled || loading}
      value={selectValue}
      onChange={(event) => {
        onChange(event.target.value || null);
      }}
    >
      <option value="">{loading ? 'Loading sessions…' : placeholder}</option>
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.title}
        </option>
      ))}
    </select>
  );
}
