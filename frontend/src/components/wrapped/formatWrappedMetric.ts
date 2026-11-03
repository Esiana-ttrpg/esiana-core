import { readMetricAmount, type MetricValue } from '@shared/metricValue';

export function formatCompactCount(
  value: MetricValue | undefined,
  locale: string,
): string | null {
  const amount = readMetricAmount(value);
  if (amount == null) return null;
  return new Intl.NumberFormat(locale, {
    notation: amount >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: amount >= 10_000 ? 1 : 0,
  }).format(amount);
}

export function monthLabel(month: number, locale: string): string {
  const date = new Date(Date.UTC(2020, month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    date,
  );
}
