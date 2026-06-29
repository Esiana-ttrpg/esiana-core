import type { MetricId } from './metricRegistry.js';
import { METRIC_REGISTRY } from './metricRegistry.js';
import type { MetricValue } from './metricValue.js';
import { readMetricAmount } from './metricValue.js';

export type MetricDisplayMode = 'show' | 'hide' | 'empty_state_encouraging';

export type CampaignActivitySignals = {
  totalWords: number;
  pageCount: number;
};

const DEFAULT_THRESHOLD = { minWords: 5_000, minPages: 20 };

function isEarlyCampaign(signals: CampaignActivitySignals, metricId: MetricId): boolean {
  const def = METRIC_REGISTRY[metricId];
  const threshold = def.relevanceThreshold ?? DEFAULT_THRESHOLD;
  if (signals.totalWords < (threshold.minWords ?? DEFAULT_THRESHOLD.minWords!)) {
    return true;
  }
  if (signals.pageCount < (threshold.minPages ?? DEFAULT_THRESHOLD.minPages!)) {
    return true;
  }
  return false;
}

export function shouldDisplayMetric(
  metricId: MetricId,
  value: MetricValue | undefined,
  activitySignals: CampaignActivitySignals,
): MetricDisplayMode {
  if (!value || value.status === 'unavailable') {
    return 'hide';
  }

  const def = METRIC_REGISTRY[metricId];
  if (def.displayPolicy === 'always') {
    if (value.status === 'zero') {
      return isEarlyCampaign(activitySignals, metricId)
        ? 'empty_state_encouraging'
        : 'hide';
    }
    return 'show';
  }

  const amount = readMetricAmount(value);
  if (amount == null || amount === 0) {
    return isEarlyCampaign(activitySignals, metricId)
      ? 'empty_state_encouraging'
      : 'hide';
  }

  return 'show';
}

export function formatCompactCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(value);
}
