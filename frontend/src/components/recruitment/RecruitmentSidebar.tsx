import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo } from 'react';
import type { PublicDirectoryCampaign } from '@/types/recruitment';
import {
  buildScheduleSummary,
  computeUpcomingSessions,
  formatSessionDate,
} from '@/lib/recruitmentSchedule';
import {
  getLobbyTableCapacity,
  getOpenRecruitingSlots,
  getRecruitingPlayerCapacity,
} from '@shared/recruitmentSeats';
import { getContinuityLine } from './recruitmentContinuity';
import { RecruitmentBeforeApplyNote } from './RecruitmentBeforeApplyNote';

interface RecruitmentSidebarProps {
  campaign: PublicDirectoryCampaign;
  onRequestSeat: () => void;
  isFull: boolean;
}

export function RecruitmentSidebar({ campaign, onRequestSeat, isFull }: RecruitmentSidebarProps) {
  const r = campaign.recruitment;
  const seatLimits = { maxSeats: r.maxSeats, maxPlayers: r.maxPlayers };
  const tableCapacity = getLobbyTableCapacity(seatLimits);
  const spotsOpen = getOpenRecruitingSlots(r.filledSeats, seatLimits);
  const recruitingFor = getRecruitingPlayerCapacity(seatLimits);
  const continuity = getContinuityLine(campaign);
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const upcomingSessions = useMemo(
    () =>
      computeUpcomingSessions({
        scheduleFrequency: r.scheduleFrequency,
        scheduleDay: r.scheduleDay,
        scheduleTime: r.scheduleTime,
      }),
    [r.scheduleFrequency, r.scheduleDay, r.scheduleTime],
  );

  const scheduleSummary = buildScheduleSummary({
    scheduleFrequency: r.scheduleFrequency,
    scheduleDay: r.scheduleDay,
    scheduleTime: r.scheduleTime,
    scheduleTimezone: r.scheduleTimezone,
  });

  const updatedLabel = campaign.updatedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(campaign.updatedAt),
      )
    : null;

  return (
    <aside className="h-fit space-y-4 lg:sticky lg:top-24">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <p className={META_SECTION_LABEL_CLASS}>At the table</p>
        <p className="text-2xl font-semibold text-foreground">
          {tableCapacity > 0
            ? `${r.filledSeats}/${tableCapacity} players`
            : `${r.filledSeats} at table`}
        </p>
        <p className="mt-1 text-xs text-muted">
          {isFull
            ? 'This table is currently full.'
            : spotsOpen > 0
              ? `${spotsOpen} spot${spotsOpen === 1 ? '' : 's'} open.`
              : tableCapacity > 0
                ? 'No spots open.'
                : 'Set party size in campaign settings.'}
        </p>
        {r.maxSeats > 0 && recruitingFor !== tableCapacity ? (
          <p className="mt-2 text-xs text-muted">
            Recruiting for {recruitingFor} player{recruitingFor === 1 ? '' : 's'} (party size{' '}
            {r.maxPlayers})
          </p>
        ) : null}

        <div className="mt-5 space-y-2 border-t border-border/70 pt-4 text-sm">
          <p className="font-medium text-foreground">{scheduleSummary}</p>
          {viewerTz ? (
            <p className="text-xs text-muted">Times also shown in your timezone ({viewerTz}).</p>
          ) : null}
          {continuity ? <p className="text-xs text-primary/90">{continuity}</p> : null}
          {r.sessionDuration?.trim() ? (
            <p className="text-xs text-muted">Sessions: {r.sessionDuration}</p>
          ) : null}
          {campaign.gameSystemLabel ? (
            <p className="text-xs text-muted">System: {campaign.gameSystemLabel}</p>
          ) : null}
        </div>

        <RecruitmentBeforeApplyNote campaign={campaign} className="mt-5 hidden lg:block" />

        <button
          type="button"
          disabled={isFull}
          onClick={onRequestSeat}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-elevated disabled:text-muted"
        >
          {isFull ? 'Table full' : 'Request a seat'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface/80 p-5">
        <h2 className="text-sm font-semibold text-foreground">Upcoming sessions</h2>
        {upcomingSessions.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {upcomingSessions.map((sessionDate, idx) => (
              <li
                key={sessionDate.toISOString()}
                className="rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              >
                <p className={META_SECTION_LABEL_CLASS}>Next {idx === 0 ? '' : `+${idx} `}session</p>
                <p className="text-sm text-foreground">
                  {formatSessionDate(sessionDate, r.scheduleTimezone)}
                </p>
                {r.scheduleTimezone && viewerTz !== r.scheduleTimezone ? (
                  <p className="mt-0.5 text-xs text-muted">
                    Your time: {formatSessionDate(sessionDate, viewerTz)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Schedule is set, but upcoming dates could not be calculated from the current day/time format.
          </p>
        )}
        {updatedLabel ? (
          <p className="mt-4 text-xs text-muted">Listing updated {updatedLabel}</p>
        ) : null}
      </div>
    </aside>
  );
}
