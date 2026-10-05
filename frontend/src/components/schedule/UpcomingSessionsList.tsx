import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { MaterializedScheduleEntry } from '@/types/userSchedule';
import { resolveCampaignAccentColor } from '@/lib/hubAmbientTheme';
import type { CampaignSummary } from '@/types/campaign';
import { patchMySessionAttendance } from '@/lib/notifications';
import {
  RsvpCompletenessIndicator,
  rsvpRespondedFraction,
} from '@/components/schedule/RsvpCompletenessIndicator';

function campaignAccent(appearanceProfile: unknown): string {
  return resolveCampaignAccentColor({
    appearanceProfile,
  } as CampaignSummary);
}

function formatDayHeader(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(iso))
    .toUpperCase();
}

function formatWhen(iso: string | null, timeZone?: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || undefined,
  }).format(new Date(iso));
}

function formatPrevDate(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function ownRsvpLabel(entry: MaterializedScheduleEntry): string {
  if (entry.status === 'SKIPPED') {
    return entry.skipReason ? `No session · ${entry.skipReason}` : 'No session';
  }
  if (entry.myAttendance === 'ATTENDING' || entry.myAttendance === 'LATE') {
    return 'Attending';
  }
  if (entry.myAttendance === 'ABSENT') return 'Not attending';
  if (entry.myAttendance === 'MAYBE') return 'Maybe';
  return 'RSVP needed';
}

export interface UpcomingSessionsListProps {
  upcoming: MaterializedScheduleEntry[];
  onRsvpChanged: () => void;
}

export function UpcomingSessionsList({ upcoming, onRsvpChanged }: UpcomingSessionsListProps) {
  if (upcoming.length === 0) {
    return (
      <p className="text-sm text-muted">No upcoming sessions across your campaigns.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {upcoming.map((entry) => {
        const accent = campaignAccent(entry.appearanceProfile);
        const summary = entry.attendanceSummary;
        const isSkipped = entry.status === 'SKIPPED';

        return (
          <li
            key={entry.id}
            className="rounded-xl border border-border bg-surface/50 px-4 py-3"
            style={{ borderLeftWidth: 3, borderLeftColor: accent }}
          >
            <div className="flex items-start justify-between gap-3 text-xs font-semibold tracking-wide text-muted">
              <span>{formatDayHeader(entry.plannedStartAt)}</span>
              <span className="text-right">{entry.gameSystemLabel.toUpperCase()}</span>
            </div>
            <div className="mt-0.5 flex items-start justify-between gap-3">
              <Link
                to={entry.deepLinkPath}
                className="line-clamp-2 min-w-0 text-base font-semibold text-foreground hover:text-primary"
              >
                {entry.campaignName}
              </Link>
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                {entry.membershipRoleLabel}
              </span>
            </div>
            <p className="text-sm text-muted">
              {isSkipped
                ? entry.skipReason
                  ? `No session · ${entry.skipReason}`
                  : 'No session'
                : `Session ${entry.sessionNumber} · ${formatWhen(entry.plannedStartAt, entry.timezone)}`}
            </p>

            {!isSkipped ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {entry.myAttendance === 'ATTENDING' || entry.myAttendance === 'LATE' ? (
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <Check className="size-3.5 text-primary" aria-hidden />
                    Attending
                  </span>
                ) : (
                  <span className="text-muted">{ownRsvpLabel(entry)}</span>
                )}
                {entry.away ? (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-200">
                    Away
                  </span>
                ) : null}
                {!entry.myAttendance && entry.status === 'PUBLISHED' ? (
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-elevated"
                    onClick={() => {
                      void patchMySessionAttendance(entry.campaignHandle, entry.timelinePointId, {
                        status: 'ATTENDING',
                      }).then(onRsvpChanged);
                    }}
                  >
                    RSVP Attending
                  </button>
                ) : null}
              </div>
            ) : null}

            {summary && !isSkipped ? (
              <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <RsvpCompletenessIndicator summary={summary} />
                  {summary.awaiting > 0 ? (
                    <span className="text-xs text-muted">{rsvpRespondedFraction(summary)}</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">
                  {summary.attending} attending · {summary.notAttending} not attending
                  {summary.awaiting > 0 ? ` · ${summary.awaiting} waiting` : ''}
                </p>
              </div>
            ) : null}

            {entry.previousSession ? (
              <p className="mt-2 text-xs text-muted">
                Last session {entry.previousSession.sessionNumber}
                {entry.previousSession.plannedStartAt
                  ? ` · ${formatPrevDate(entry.previousSession.plannedStartAt)}`
                  : ''}
                {' · '}
                <Link
                  to={entry.previousSession.deepLinkPath}
                  className="text-primary hover:underline"
                >
                  View notes
                </Link>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
