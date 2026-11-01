import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';
import type { TimeTrackingBundle } from '@/lib/timeTrackingApi';
import { historicalClock, historicalNativeState } from '@/lib/historicalTimeline';
import { comparisonDateLabel, useComparisonText } from './comparisonText';

/** Comparison context is supplementary; native occurrence boundaries remain authoritative. */
export function OccurrenceReferenceDate({ occurrence, timeBundle }: {
  occurrence: TimelineOccurrenceRecord; timeBundle: TimeTrackingBundle;
}) {
  const text = useComparisonText();
  const source = timeBundle.calendars.find(row => row.id === occurrence.calendarId);
  const reference = timeBundle.calendars.find(row => row.isMasterTime);
  if (reference?.id === source?.id && source) return null;
  const sourceClock = source ? historicalClock(source) : null;
  const referenceClock = reference ? historicalClock(reference) : null;
  const start = occurrence.start.epochMinute;
  const end = start === null ? null : BigInt(start) + BigInt(occurrence.duration) * 1440n - 1n;
  const axis = referenceClock?.axis;
  if (!sourceClock?.aligned || !referenceClock?.aligned || !axis || start === null || end === null ||
    !historicalNativeState(axis, BigInt(start)) || !historicalNativeState(axis, end)) {
    return <p className="text-xs text-muted">Reference date unavailable; native dates are retained.</p>;
  }
  return <p className="text-xs text-muted">{reference!.name}: {comparisonDateLabel(axis, BigInt(start), text, true)} to {comparisonDateLabel(axis, end, text, true)}</p>;
}
