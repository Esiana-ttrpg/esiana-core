import type { MetricValue } from '@shared/metricValue';
import { readMetricAmount } from '@shared/metricValue';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';

export type FormattedMetric = {
  display: string;
  tone: 'value' | 'zero' | 'estimated' | 'partial' | 'unavailable';
  detail: string | null;
};

export function formatMetricValue(
  value: MetricValue | undefined,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): FormattedMetric {
  if (!value || value.status === 'unavailable') {
    return {
      display: '—',
      tone: 'unavailable',
      detail: null,
    };
  }
  if (value.status === 'zero') {
    return {
      display: formatCompactCount(0, locale),
      tone: 'zero',
      detail: null,
    };
  }
  const amount = readMetricAmount(value) ?? 0;
  if (value.status === 'estimated' || value.status === 'partial') {
    return {
      display: formatCompactCount(amount, locale),
      tone: value.status,
      detail: null,
    };
  }
  return {
    display: formatCompactCount(amount, locale),
    tone: 'value',
    detail: null,
  };
}
