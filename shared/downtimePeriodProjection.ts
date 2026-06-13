/**
 * Derived downtime period projection helpers (browser-safe).
 * @see docs/architecture-internal/downtime-timeline.md
 */

const MINUTES_PER_DAY = 1440n;

export type DowntimePeriodGapBounds = {
  gapId: string;
  startEpochMinute: string;
  endEpochMinute: string;
  isOpen: boolean;
  sessionBeforeId: string | null;
  sessionAfterId: string | null;
  sessionBeforeSequenceOrder: number | null;
};

export type DowntimePeriodEnrichmentCounts = {
  advanceRunCount: number;
  projectCompletions: number;
  projectFailures: number;
};

export function elapsedDaysBetweenEpochMinutes(
  startEpochMinute: string,
  endEpochMinute: string,
): bigint {
  try {
    const start = BigInt(startEpochMinute);
    const end = BigInt(endEpochMinute);
    const diff = end - start;
    if (diff <= 0n) return 0n;
    return diff / MINUTES_PER_DAY;
  } catch {
    return 0n;
  }
}

export function formatDowntimeElapsedLabel(days: bigint): string {
  if (days <= 0n) return 'less than a day';
  if (days === 1n) return '1 day';
  if (days < 7n) return `${days.toString()} days`;
  const weeks = days / 7n;
  if (weeks === 1n) return '1 week';
  if (weeks < 5n) return `${weeks.toString()} weeks`;
  const months = days / 30n;
  if (months === 1n) return '1 month';
  return `${months.toString()} months`;
}

export function formatDowntimePeriodTitle(input: {
  isOpen: boolean;
  startEpochMinute: string;
  endEpochMinute: string;
  promotedLabel?: string | null;
}): string {
  const promoted = input.promotedLabel?.trim();
  if (promoted) return promoted;
  const days = elapsedDaysBetweenEpochMinutes(
    input.startEpochMinute,
    input.endEpochMinute,
  );
  const elapsed = formatDowntimeElapsedLabel(days);
  if (input.isOpen) {
    return `Current downtime — ${elapsed} since last session`;
  }
  return `${elapsed} between sessions`;
}

export function formatDowntimePeriodRollupHeadline(input: {
  isOpen: boolean;
  startEpochMinute: string;
  endEpochMinute: string;
  counts: DowntimePeriodEnrichmentCounts;
}): string {
  const days = elapsedDaysBetweenEpochMinutes(
    input.startEpochMinute,
    input.endEpochMinute,
  );
  const elapsed = formatDowntimeElapsedLabel(days);

  const activityParts: string[] = [];
  if (input.counts.advanceRunCount > 0) {
    activityParts.push(
      input.counts.advanceRunCount === 1
        ? '1 time advance'
        : `${input.counts.advanceRunCount} time advances`,
    );
  }
  if (input.counts.projectCompletions > 0) {
    activityParts.push(
      input.counts.projectCompletions === 1
        ? '1 project completed'
        : `${input.counts.projectCompletions} projects completed`,
    );
  }
  if (input.counts.projectFailures > 0) {
    activityParts.push(
      input.counts.projectFailures === 1
        ? '1 project failed'
        : `${input.counts.projectFailures} projects failed`,
    );
  }

  const calm =
    activityParts.length === 0
      ? 'relative calm'
      : activityParts.join(' · ');

  if (input.isOpen) {
    return `${elapsed} of downtime since the last session — ${calm}.`;
  }
  return `${elapsed} passed between sessions — ${calm}.`;
}

export function deriveDowntimePeriodGapsFromSessionEpochs(input: {
  sessionEpochs: Array<{
    timelinePointId: string;
    sequenceOrder: number;
    epochMinute: string;
  }>;
  fallbackStartEpochMinute: string | null;
  currentEpochMinute: string;
}): DowntimePeriodGapBounds[] {
  const current = input.currentEpochMinute;
  const sessions = [...input.sessionEpochs].sort(
    (a, b) => a.sequenceOrder - b.sequenceOrder,
  );

  if (sessions.length === 0) {
    const start = input.fallbackStartEpochMinute ?? '0';
    if (BigInt(current) <= BigInt(start)) return [];
    return [
      {
        gapId: `gap:${start}:${current}`,
        startEpochMinute: start,
        endEpochMinute: current,
        isOpen: true,
        sessionBeforeId: null,
        sessionAfterId: null,
        sessionBeforeSequenceOrder: null,
      },
    ];
  }

  const gaps: DowntimePeriodGapBounds[] = [];

  for (let i = 0; i < sessions.length - 1; i += 1) {
    const before = sessions[i]!;
    const after = sessions[i + 1]!;
    if (BigInt(after.epochMinute) <= BigInt(before.epochMinute)) continue;
    gaps.push({
      gapId: `gap:${before.epochMinute}:${after.epochMinute}`,
      startEpochMinute: before.epochMinute,
      endEpochMinute: after.epochMinute,
      isOpen: false,
      sessionBeforeId: before.timelinePointId,
      sessionAfterId: after.timelinePointId,
      sessionBeforeSequenceOrder: before.sequenceOrder,
    });
  }

  const last = sessions[sessions.length - 1]!;
  if (BigInt(current) > BigInt(last.epochMinute)) {
    gaps.push({
      gapId: `gap:${last.epochMinute}:${current}`,
      startEpochMinute: last.epochMinute,
      endEpochMinute: current,
      isOpen: true,
      sessionBeforeId: last.timelinePointId,
      sessionAfterId: null,
      sessionBeforeSequenceOrder: last.sequenceOrder,
    });
  }

  return gaps;
}
