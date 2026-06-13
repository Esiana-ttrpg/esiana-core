import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSessionNotesIndex } from '@/lib/wiki';
import { campaignNotesPath } from '@/lib/campaignPaths';
import { SessionScheduleEditor } from '@/components/session/SessionScheduleEditor';
import { controlClasses } from '@/components/ui/formStyles';

interface SessionOption {
  id: string;
  title: string;
}

interface SessionDatesSectionProps {
  campaignHandle: string;
}

function SessionDateSelector({
  sessions,
  loading,
  value,
  onChange,
}: {
  sessions: SessionOption[];
  loading: boolean;
  value: string | null;
  onChange: (timelinePointId: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">Session</span>
      <select
        className={controlClasses}
        disabled={loading || sessions.length === 0}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">
          {loading ? 'Loading sessions…' : 'Select a session'}
        </option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SessionDatesSection({ campaignHandle }: SessionDatesSectionProps) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimelinePointId, setSelectedTimelinePointId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSessionNotesIndex(campaignHandle)
      .then((payload) => {
        if (cancelled) return;
        const options: SessionOption[] = [];
        for (const notebook of payload.notebooks) {
          for (const page of notebook.pages) {
            if (page.timelinePointId) {
              options.push({ id: page.timelinePointId, title: page.title });
            }
          }
        }
        for (const page of payload.uncategorized) {
          if (page.timelinePointId) {
            options.push({ id: page.timelinePointId, title: page.title });
          }
        }
        options.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }),
        );
        setSessions(options);
        setSelectedTimelinePointId((current) => {
          if (current && options.some((option) => option.id === current)) {
            return current;
          }
          return options[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSelectedTimelinePointId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const editorKey = useMemo(
    () => selectedTimelinePointId ?? 'none',
    [selectedTimelinePointId],
  );

  if (!loading && sessions.length === 0) {
    return (
      <p className="text-sm text-muted">
        No timeline sessions yet.{' '}
        <Link to={campaignNotesPath(campaignHandle)} className="text-primary hover:underline">
          Create a session in Session Notes
        </Link>{' '}
        to schedule OOC dates.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <SessionDateSelector
        sessions={sessions}
        loading={loading}
        value={selectedTimelinePointId}
        onChange={setSelectedTimelinePointId}
      />
      {selectedTimelinePointId ? (
        <SessionScheduleEditor
          key={editorKey}
          campaignHandle={campaignHandle}
          timelinePointId={selectedTimelinePointId}
          canManage
        />
      ) : null}
    </div>
  );
}
