import {
  PARTICIPATION_DOMAINS,
  type ParticipationDomain,
  type ParticipationDomainStats,
  type ParticipationHistoryEntry,
  type PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import {
  metricEstimated,
  metricUnavailable,
  metricValue,
  type MetricValue,
} from '../../../../../shared/metricValue.js';

export type ParticipationCampaignRecord = {
  campaignId: string;
  at: Date;
};

export type ParticipationSessionRecord = {
  timelinePointId: string;
  campaignId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
};

function inRange(at: Date, start: Date | null, end: Date): boolean {
  return at >= (start ?? new Date(0)) && at < end;
}

function periodField(
  value: MetricValue,
  input: {
    skipPeriod: boolean;
    visibility: PersonalStatisticsVisibility;
    tracked?: boolean;
  },
): MetricValue {
  if (input.tracked === false) return metricUnavailable('not_yet_tracked');
  if (input.skipPeriod) return metricUnavailable('not_yet_tracked');
  if (input.visibility !== 'owner') return metricUnavailable('private');
  return value;
}

function plannedMinutes(session: ParticipationSessionRecord): number | null {
  if (!session.plannedStartAt || !session.plannedEndAt) return null;
  const delta = session.plannedEndAt.getTime() - session.plannedStartAt.getTime();
  if (!Number.isFinite(delta) || delta < 0) return null;
  return Math.floor(delta / 60_000);
}

function sumPlannedMinutes(sessions: ParticipationSessionRecord[]): MetricValue {
  let total = 0;
  let anyComplete = false;
  for (const session of sessions) {
    const minutes = plannedMinutes(session);
    if (minutes == null) continue;
    anyComplete = true;
    total += minutes;
  }
  if (sessions.length === 0) return metricEstimated(0);
  if (!anyComplete) return metricUnavailable('insufficient_data');
  return metricEstimated(total);
}

function distinctCampaignCount(rows: ParticipationCampaignRecord[]): number {
  return new Set(rows.map((row) => row.campaignId)).size;
}

function periodCampaignCount(
  rows: ParticipationCampaignRecord[],
  start: Date | null,
  end: Date,
): number {
  return new Set(
    rows.filter((row) => inRange(row.at, start, end)).map((row) => row.campaignId),
  ).size;
}

function sessionsInPeriod(
  sessions: ParticipationSessionRecord[],
  start: Date | null,
  end: Date,
): ParticipationSessionRecord[] {
  return sessions.filter(
    (session) => session.plannedStartAt != null && inRange(session.plannedStartAt, start, end),
  );
}

export function buildParticipationHistory(input: {
  attended: ParticipationSessionRecord[];
  hosted: ParticipationSessionRecord[];
  limit?: number;
}): ParticipationHistoryEntry[] {
  const byId = new Map<
    string,
    {
      session: ParticipationSessionRecord;
      roles: Set<'attended' | 'hosted'>;
    }
  >();
  for (const session of input.attended) {
    const existing = byId.get(session.timelinePointId);
    if (existing) existing.roles.add('attended');
    else byId.set(session.timelinePointId, { session, roles: new Set(['attended']) });
  }
  for (const session of input.hosted) {
    const existing = byId.get(session.timelinePointId);
    if (existing) existing.roles.add('hosted');
    else byId.set(session.timelinePointId, { session, roles: new Set(['hosted']) });
  }

  return [...byId.values()]
    .sort((a, b) => {
      const aTime = a.session.plannedStartAt?.getTime() ?? 0;
      const bTime = b.session.plannedStartAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, input.limit ?? 20)
    .map(({ session, roles }) => ({
      timelinePointId: session.timelinePointId,
      campaignId: session.campaignId,
      plannedStartAt: session.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: session.plannedEndAt?.toISOString() ?? null,
      roles: [...roles],
      plannedDurationMinutes: plannedMinutes(session),
    }));
}

export function assembleParticipationStats(input: {
  participatedCampaigns: ParticipationCampaignRecord[];
  gmedCampaigns: ParticipationCampaignRecord[];
  sessionsAttended: ParticipationSessionRecord[];
  sessionsHosted: ParticipationSessionRecord[];
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
}): ParticipationDomainStats[] {
  const periodAttended = sessionsInPeriod(
    input.sessionsAttended,
    input.rangeStart,
    input.rangeEnd,
  );
  const periodHosted = sessionsInPeriod(
    input.sessionsHosted,
    input.rangeStart,
    input.rangeEnd,
  );

  const totals: Record<ParticipationDomain, number> = {
    campaignsParticipated: distinctCampaignCount(input.participatedCampaigns),
    campaignsGmed: distinctCampaignCount(input.gmedCampaigns),
    sessionsAttended: input.sessionsAttended.length,
    sessionsHosted: input.sessionsHosted.length,
  };
  const periodTotals: Record<ParticipationDomain, number> = {
    campaignsParticipated: periodCampaignCount(
      input.participatedCampaigns,
      input.rangeStart,
      input.rangeEnd,
    ),
    campaignsGmed: periodCampaignCount(
      input.gmedCampaigns,
      input.rangeStart,
      input.rangeEnd,
    ),
    sessionsAttended: periodAttended.length,
    sessionsHosted: periodHosted.length,
  };

  return PARTICIPATION_DOMAINS.map((domain) => {
    const row: ParticipationDomainStats = {
      domain,
      total: metricValue(totals[domain]),
      periodTotal: periodField(metricValue(periodTotals[domain]), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
      }),
    };
    if (domain === 'sessionsAttended' || domain === 'sessionsHosted') {
      const lifetimeSessions =
        domain === 'sessionsAttended' ? input.sessionsAttended : input.sessionsHosted;
      const periodSessions = domain === 'sessionsAttended' ? periodAttended : periodHosted;
      row.plannedDurationMinutes = sumPlannedMinutes(lifetimeSessions);
      row.periodPlannedDurationMinutes = periodField(sumPlannedMinutes(periodSessions), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
      });
      row.playedDurationMinutes = metricUnavailable('not_yet_tracked');
    }
    return row;
  });
}
