/**
 * Discriminated union for stat API values — distinguishes unknown, zero,
 * measured, estimated, and partial amounts.
 *
 * Campaign statistics continue to emit `value` / `zero` / `unavailable` only.
 */

export type MetricUnavailableReason =
  | 'not_yet_tracked'
  | 'insufficient_data'
  | 'private';

export type MetricValue =
  | { status: 'value'; amount: number }
  | { status: 'zero'; amount: 0 }
  | { status: 'estimated'; amount: number }
  | { status: 'partial'; amount: number }
  | { status: 'unavailable'; reason: MetricUnavailableReason };

export function metricValue(amount: number): MetricValue {
  if (amount === 0) return { status: 'zero', amount: 0 };
  return { status: 'value', amount };
}

export function metricEstimated(amount: number): MetricValue {
  return { status: 'estimated', amount };
}

export function metricPartial(amount: number): MetricValue {
  return { status: 'partial', amount };
}

export function metricUnavailable(reason: MetricUnavailableReason): MetricValue {
  return { status: 'unavailable', reason };
}

export function readMetricAmount(value: MetricValue | undefined): number | null {
  if (!value) return null;
  if (value.status === 'unavailable') return null;
  return value.amount;
}

export function isMetricZero(value: MetricValue | undefined): boolean {
  return value?.status === 'zero';
}
