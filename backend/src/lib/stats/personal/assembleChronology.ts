import {
  CHRONOLOGY_DOMAINS,
  type ChronologyDomain,
  type ChronologyDomainStats,
  type PersonalStatisticsVisibility,
} from '../../../../../shared/statsTypes.js';
import {
  metricUnavailable,
  metricValue,
  type MetricValue,
} from '../../../../../shared/metricValue.js';

export type ChronologyCreatedRecord = {
  createdAt: Date;
};

export type ChronologyAdvanceRecord = ChronologyCreatedRecord & {
  previousEpochMinute: bigint;
  nextEpochMinute: bigint;
};

function inRange(at: Date, start: Date | null, end: Date): boolean {
  return at >= (start ?? new Date(0)) && at < end;
}

function periodField(
  value: MetricValue,
  input: {
    skipPeriod: boolean;
    visibility: PersonalStatisticsVisibility;
    tracked: boolean;
  },
): MetricValue {
  if (!input.tracked) return metricUnavailable('not_yet_tracked');
  if (input.skipPeriod) return metricUnavailable('not_yet_tracked');
  if (input.visibility !== 'owner') return metricUnavailable('private');
  return value;
}

function countCreated(rows: ChronologyCreatedRecord[]): number {
  return rows.length;
}

function countPeriod(rows: ChronologyCreatedRecord[], start: Date | null, end: Date): number {
  return rows.filter((row) => inRange(row.createdAt, start, end)).length;
}

function sumMinutesAdvanced(rows: ChronologyAdvanceRecord[]): number {
  let total = 0n;
  for (const row of rows) {
    const delta = row.nextEpochMinute - row.previousEpochMinute;
    if (delta > 0n) total += delta;
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  return Number(total);
}

export function assembleChronologyStats(input: {
  events: ChronologyCreatedRecord[];
  eras: ChronologyCreatedRecord[];
  timelineContributions: ChronologyCreatedRecord[];
  timeAdvances: ChronologyAdvanceRecord[];
  periodEditsByDomain: Partial<Record<ChronologyDomain, number>>;
  hasEditInstrumentation: boolean;
  rangeStart: Date | null;
  rangeEnd: Date;
  skipPeriod: boolean;
  visibility: PersonalStatisticsVisibility;
}): ChronologyDomainStats[] {
  const created: Record<ChronologyDomain, ChronologyCreatedRecord[]> = {
    events: input.events,
    eras: input.eras,
    timelineContributions: input.timelineContributions,
    timeAdvances: input.timeAdvances,
  };

  return CHRONOLOGY_DOMAINS.map((domain) => {
    const rows = created[domain];
    const periodEditedTracked =
      domain !== 'timelineContributions' &&
      domain !== 'timeAdvances' &&
      input.hasEditInstrumentation;
    const row: ChronologyDomainStats = {
      domain,
      created: metricValue(countCreated(rows)),
      periodCreated: periodField(
        metricValue(countPeriod(rows, input.rangeStart, input.rangeEnd)),
        {
          skipPeriod: input.skipPeriod,
          visibility: input.visibility,
          tracked: true,
        },
      ),
      periodEdited: periodField(metricValue(input.periodEditsByDomain[domain] ?? 0), {
        skipPeriod: input.skipPeriod,
        visibility: input.visibility,
        tracked: periodEditedTracked,
      }),
    };
    if (domain === 'timeAdvances') {
      const advances = input.timeAdvances;
      const periodAdvances = advances.filter((item) =>
        inRange(item.createdAt, input.rangeStart, input.rangeEnd),
      );
      row.minutesAdvanced = metricValue(sumMinutesAdvanced(advances));
      row.periodMinutesAdvanced = periodField(
        metricValue(sumMinutesAdvanced(periodAdvances)),
        {
          skipPeriod: input.skipPeriod,
          visibility: input.visibility,
          tracked: true,
        },
      );
    }
    return row;
  });
}
