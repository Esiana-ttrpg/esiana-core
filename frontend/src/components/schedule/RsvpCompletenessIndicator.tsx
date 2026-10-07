import type { AttendanceSummary } from '@/types/userSchedule';

export function rsvpCompletenessLabel(summary: AttendanceSummary): string {
  if (summary.awaiting === 0) return 'Everyone responded';
  if (summary.awaiting === 1) return '1 awaiting RSVP';
  return `${summary.awaiting} awaiting RSVP`;
}

export function rsvpRespondedFraction(summary: AttendanceSummary): string {
  const responded = summary.total - summary.awaiting;
  return `${responded} of ${summary.total} responded`;
}

type AwaitingMember = { label: string; away: boolean };

export function AwaitingRsvpTooltip({ members }: { members: AwaitingMember[] }) {
  return (
    <div className="max-w-xs space-y-1 rounded-md border border-border bg-elevated px-3 py-2 text-left text-xs text-foreground shadow-lg">
      <p className="font-medium text-muted">Awaiting RSVP</p>
      <ul className="space-y-0.5">
        {members.map((m) => (
          <li key={m.label + (m.away ? '-away' : '')}>
            {m.label}
            {m.away ? ' · Away' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RsvpCompletenessIndicator({
  summary,
  compact = false,
}: {
  summary: AttendanceSummary;
  compact?: boolean;
}) {
  const complete = summary.awaiting === 0;
  const label = rsvpCompletenessLabel(summary);
  const dotClass = complete
    ? 'bg-[color:var(--color-status-legend-fg,#22c55e)]'
    : 'bg-[color:var(--color-status-warning-fg,#eab308)]';

  return (
    <span className="group relative inline-flex items-center gap-1.5">
      <span
        className={`inline-block size-2.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden
      />
      <span className={compact ? 'sr-only' : 'text-xs text-muted'}>{label}</span>
      {!complete ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden group-focus-within:block group-hover:block"
        >
          <AwaitingRsvpTooltip members={summary.awaitingMembers} />
        </span>
      ) : null}
    </span>
  );
}
