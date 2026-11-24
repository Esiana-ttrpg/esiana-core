import { Link } from 'react-router-dom';
import type {
  CartographyDomainStats,
  CartographyThumbnail,
  ParticipationDomainStats,
  ParticipationHistoryEntry,
  WorldbuildingDomainStats,
} from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';
import { StatsChartFrame, StatsEmptyState } from './StatsChartFrame';
import { HorizontalBarChart } from './StatsBarCharts';
import { formatMetricValue } from './statsMetricFormat';
import { META_TABLE_HEAD_CLASS } from '@/lib/surfaceLayout';

function amountOrZero(
  value: Parameters<typeof readMetricAmount>[0],
): number {
  return readMetricAmount(value) ?? 0;
}

export function WorldbuildingActivityChart({
  rows,
  locale,
  t,
}: {
  rows: WorldbuildingDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const chartRows = rows.filter(
    (row) =>
      amountOrZero(row.periodCreated) > 0 || amountOrZero(row.periodEdited) > 0,
  );
  if (rows.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.worldbuildingEmpty')} />;
  }
  return (
    <StatsChartFrame title={t('profile.creatorstats.worldbuildingChartTitle')}>
      {chartRows.length > 0 ? (
        <HorizontalBarChart
          label={t('profile.creatorstats.worldbuildingChartTitle')}
          category="worldbuilding"
          secondaryCategory="writing"
          valueLabel={t('profile.creatorstats.colPeriodCreated')}
          secondaryLabel={t('profile.creatorstats.colPeriodEdited')}
          items={chartRows.map((row) => ({
            key: row.domain,
            label: t(`profile.creatorstats.domain.${row.domain}`),
            value: amountOrZero(row.periodCreated),
            secondary: amountOrZero(row.periodEdited),
          }))}
        />
      ) : (
        <p className="text-sm text-muted">{t('profile.creatorstats.worldbuildingEmpty')}</p>
      )}
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.domain}>
            {t(`profile.creatorstats.domain.${row.domain}`)}:{' '}
            {formatMetricValue(row.periodCreated, locale, t).display} created,{' '}
            {formatMetricValue(row.periodEdited, locale, t).display} edited
          </li>
        ))}
      </ul>
    </StatsChartFrame>
  );
}

export function CartographyActivityChart({
  rows,
  thumbnails,
  locale,
  t,
}: {
  rows: CartographyDomainStats[];
  thumbnails: CartographyThumbnail[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (rows.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.cartographyEmpty')} />;
  }
  const chartRows = rows.filter(
    (row) =>
      amountOrZero(row.periodCreated) > 0 || amountOrZero(row.periodEdited) > 0,
  );
  return (
    <div className="space-y-4">
      <StatsChartFrame title={t('profile.creatorstats.cartographyChartTitle')}>
        {chartRows.length > 0 ? (
          <HorizontalBarChart
            label={t('profile.creatorstats.cartographyChartTitle')}
            category="maps"
            secondaryCategory="worldbuilding"
            valueLabel={t('profile.creatorstats.colPeriodCreated')}
            secondaryLabel={t('profile.creatorstats.colPeriodEdited')}
            items={chartRows.map((row) => ({
              key: row.domain,
              label: t(`profile.creatorstats.cartography.${row.domain}`),
              value: amountOrZero(row.periodCreated),
              secondary: amountOrZero(row.periodEdited),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.cartographyEmpty')}</p>
        )}
        <ul className="sr-only">
          {rows.map((row) => (
            <li key={row.domain}>
              {t(`profile.creatorstats.cartography.${row.domain}`)}:{' '}
              {formatMetricValue(row.periodCreated, locale, t).display} created,{' '}
              {formatMetricValue(row.periodEdited, locale, t).display} edited
            </li>
          ))}
        </ul>
      </StatsChartFrame>
      {thumbnails.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {thumbnails.map((thumb) => (
            <li key={thumb.id}>
              <Link
                to={thumb.href}
                className="block overflow-hidden rounded-md border border-border"
              >
                {thumb.thumbnailUrl ? (
                  <img
                    src={thumb.thumbnailUrl}
                    alt={thumb.label || t('profile.creatorstats.cartographyFallback')}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-border/30 text-xs text-muted">
                    {thumb.label || t('profile.creatorstats.cartographyFallback')}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ParticipationBreakdownTable({
  rows,
  history,
  locale,
  t,
}: {
  rows: ParticipationDomainStats[];
  history: ParticipationHistoryEntry[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-4">
      <StatsChartFrame
        title={t('profile.creatorstats.participationChartTitle')}
      >
        {rows.some((row) => amountOrZero(row.periodTotal) > 0) ? (
          <HorizontalBarChart
            label={t('profile.creatorstats.participationChartTitle')}
            category="campaigns"
            valueLabel={t('profile.creatorstats.colPeriodCreated')}
            items={rows
              .filter((row) => amountOrZero(row.periodTotal) > 0)
              .map((row) => ({
                key: row.domain,
                label: t(`profile.creatorstats.participation.${row.domain}`),
                value: amountOrZero(row.periodTotal),
              }))}
          />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.emptyChart')}</p>
        )}
        <ul className="sr-only">
          {rows.map((row) => (
            <li key={row.domain}>
              {t(`profile.creatorstats.participation.${row.domain}`)}:{' '}
              {formatMetricValue(row.periodTotal, locale, t).display}
            </li>
          ))}
        </ul>
      </StatsChartFrame>
      {history.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm text-muted">
            {t('profile.creatorstats.participationHistoryHeading')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm">
              <thead>
                <tr>
                  <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
                    {t('profile.creatorstats.colDate')}
                  </th>
                  <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
                    {t('profile.creatorstats.colRoles')}
                  </th>
                  <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
                    {t('profile.creatorstats.colPlannedMinutes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => {
                  const when = entry.plannedStartAt
                    ? new Date(entry.plannedStartAt).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—';
                  const roles = entry.roles
                    .map((role) =>
                      role === 'attended'
                        ? t('profile.creatorstats.participation.roleAttended')
                        : t('profile.creatorstats.participation.roleHosted'),
                    )
                    .join(', ');
                  return (
                    <tr key={entry.timelinePointId} className="border-t border-border/30">
                      <td className="py-1.5 pr-3 text-foreground">{when}</td>
                      <td className="py-1.5 pr-3 text-foreground">{roles}</td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {entry.plannedDurationMinutes != null
                          ? t('profile.creatorstats.sessionMinutes', {
                              count: entry.plannedDurationMinutes,
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
