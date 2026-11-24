import type { ChronologyDomainStats } from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';
import { formatMetricValue } from './statsMetricFormat';
import { StatsChartFrame, StatsEmptyState } from './StatsChartFrame';

export function ChronologyTimeline({
  rows,
  locale,
  t,
}: {
  rows: ChronologyDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (rows.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.chronologyEmpty')} />;
  }

  const items = rows
    .map((row) => ({
      domain: row.domain,
      label: t(`profile.creatorstats.chronology.${row.domain}`),
      created: formatMetricValue(row.periodCreated, locale, t),
      edited: formatMetricValue(row.periodEdited, locale, t),
      amount: readMetricAmount(row.periodCreated) ?? 0,
      minutes:
        row.domain === 'timeAdvances'
          ? formatMetricValue(row.minutesAdvanced, locale, t)
          : null,
    }))
    .filter(
      (row) =>
        row.created.tone !== 'unavailable' ||
        row.edited.tone !== 'unavailable' ||
        row.amount > 0,
    );

  if (items.every((item) => item.amount === 0 && item.edited.display === '0')) {
    return <StatsEmptyState message={t('profile.creatorstats.chronologyEmpty')} />;
  }

  return (
    <StatsChartFrame title={t('profile.creatorstats.chronologyChartTitle')}>
      <ol className="relative space-y-4 border-l border-border pl-4">
        {items.map((item) => (
          <li key={item.domain} className="relative">
            <span
              className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-primary"
              aria-hidden
            />
            <p className="text-sm text-foreground">{item.label}</p>
            <p className="text-xs text-muted">
              {t('profile.creatorstats.colPeriodCreated')}: {item.created.display}
              {' · '}
              {t('profile.creatorstats.colPeriodEdited')}: {item.edited.display}
              {item.minutes
                ? ` · ${t('profile.creatorstats.colMinutesAdvanced')}: ${item.minutes.display}`
                : ''}
            </p>
          </li>
        ))}
      </ol>
    </StatsChartFrame>
  );
}
