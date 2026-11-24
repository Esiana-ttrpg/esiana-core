import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  PersonalStatisticsRangeMode,
  WritingHeatmapDay,
  WritingVisualizations as WritingVisualizationsPayload,
} from '@shared/statsTypes';
import { StatsChartFrame, StatsEmptyState } from '@/components/profile/stats/StatsChartFrame';
import {
  AreaTrendChart,
  VerticalColumnChart,
} from '@/components/profile/stats/StatsBarCharts';
import {
  alignDailySeriesByDayOfMonth,
  alignDailySeriesByIndex,
  alignDailySeriesByMonth,
} from '@/lib/previousStatisticsRange';
import { FOCAL_ELEVATED_CLASS } from '@/lib/surfaceLayout';

const WEEKDAY_KEYS = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
] as const;

const CELL = 14;
const GAP = 3;

function heatFill(day: WritingHeatmapDay, maxWords: number): string {
  if (day.wordsAdded <= 0 && day.sessionCount <= 0) return 'var(--color-depth-2)';
  if (maxWords <= 0) return 'var(--stats-writing-1)';
  const t = day.wordsAdded / maxWords;
  if (t > 0.75) return 'var(--stats-writing-4)';
  if (t > 0.5) return 'var(--stats-writing-3)';
  if (t > 0.25) return 'var(--stats-writing-2)';
  return 'var(--stats-writing-1)';
}

function HourColumnChart({
  label,
  buckets,
  currentLabel,
  previousLabel,
}: {
  label: string;
  buckets: Array<{ hour: number; value: number; previous?: number }>;
  currentLabel?: string;
  previousLabel?: string;
}) {
  const hasPrevious = buckets.some((bucket) => bucket.previous != null);
  const max = Math.max(
    1,
    ...buckets.map((bucket) => Math.max(bucket.value, bucket.previous ?? 0)),
  );
  const barWidth = hasPrevious ? 5 : 10;
  const pairGap = 2;
  const gap = hasPrevious ? 5 : 4;
  const chartHeight = 100;
  const labelBand = 22;
  const groupWidth = hasPrevious ? barWidth * 2 + pairGap : barWidth;
  const width = buckets.length * (groupWidth + gap);

  return (
    <div className="space-y-2">
      {hasPrevious && currentLabel && previousLabel ? (
        <p className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-[var(--stats-writing)]" />
            {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-[var(--stats-worldbuilding)] opacity-70" />
            {previousLabel}
          </span>
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${chartHeight + labelBand}`}
          className="h-32 w-full min-w-[18rem]"
        >
          {buckets.map((bucket, index) => {
            const groupX = index * (groupWidth + gap);
            const barHeight = (bucket.value / max) * (chartHeight - 6);
            const prev = bucket.previous ?? 0;
            const prevHeight = (prev / max) * (chartHeight - 6);
            return (
              <g key={bucket.hour}>
                {hasPrevious ? (
                  <rect
                    x={groupX}
                    y={chartHeight - prevHeight}
                    width={barWidth}
                    height={Math.max(prevHeight, prev > 0 ? 2 : 0)}
                    rx={1.5}
                    fill="var(--stats-worldbuilding)"
                    fillOpacity={0.55}
                  >
                    <title>
                      {`${String(bucket.hour).padStart(2, '0')}:00 · ${previousLabel ?? 'Previous'} — ${prev}`}
                    </title>
                  </rect>
                ) : null}
                <rect
                  x={hasPrevious ? groupX + barWidth + pairGap : groupX}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={Math.max(barHeight, bucket.value > 0 ? 2 : 0)}
                  rx={2}
                  fill="var(--stats-writing)"
                >
                  <title>
                    {`${String(bucket.hour).padStart(2, '0')}:00${currentLabel ? ` · ${currentLabel}` : ''} — ${bucket.value}`}
                  </title>
                </rect>
                {bucket.hour % 3 === 0 ? (
                  <text
                    x={groupX + groupWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    fill="var(--color-recessed-foreground, var(--color-text-muted))"
                    fontSize="9"
                  >
                    {String(bucket.hour).padStart(2, '0')}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function activeHourWindow(
  buckets: Array<{ hour: number; value: number }>,
): { start: number; end: number } {
  const active = buckets.filter((bucket) => bucket.value > 0).map((bucket) => bucket.hour);
  if (active.length === 0) return { start: 9, end: 17 };
  const min = Math.min(...active);
  const max = Math.max(...active);
  // Ignore a single extreme outlier when the rest of activity is clustered.
  const clustered = active.filter((hour) => hour >= min + (max - min > 14 ? 2 : 0));
  const core = clustered.length >= Math.max(2, active.length - 1) ? clustered : active;
  const coreMin = Math.min(...core);
  const coreMax = Math.max(...core);
  return {
    start: Math.max(0, coreMin - 1),
    end: Math.min(23, coreMax + 1),
  };
}

export function WritingVisualizations({
  visualizations,
  previousVisualizations,
  rangeMode,
  currentPeriodLabel,
  previousPeriodLabel,
}: {
  visualizations: WritingVisualizationsPayload;
  previousVisualizations?: WritingVisualizationsPayload | null;
  rangeMode: PersonalStatisticsRangeMode;
  currentPeriodLabel?: string | null;
  previousPeriodLabel?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAllHours, setShowAllHours] = useState(false);

  const maxWords = useMemo(
    () => Math.max(0, ...visualizations.heatmap.map((day) => day.wordsAdded)),
    [visualizations.heatmap],
  );

  const weeks = useMemo(() => {
    const days = visualizations.heatmap;
    if (days.length === 0) return [];
    const pad = days[0]?.weekday ?? 0;
    const cells: Array<WritingHeatmapDay | null> = [
      ...Array.from({ length: pad }, () => null),
      ...days,
    ];
    const columns: Array<Array<WritingHeatmapDay | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      columns.push(cells.slice(i, i + 7));
    }
    const last = columns[columns.length - 1];
    if (last && last.length < 7) {
      columns[columns.length - 1] = [
        ...last,
        ...Array.from({ length: 7 - last.length }, () => null),
      ];
    }
    return columns;
  }, [visualizations.heatmap]);

  const selectedSessions = useMemo(
    () => visualizations.sessions.filter((session) => session.date === selectedDate),
    [selectedDate, visualizations.sessions],
  );

  const weekdayLabel = (weekday: number) =>
    t(`profile.creatorstats.${WEEKDAY_KEYS[weekday] ?? 'weekdayMon'}`);

  if (visualizations.heatmap.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.chartsEmpty')} />;
  }

  const activeHeatRows = visualizations.heatmap.filter(
    (day) => day.wordsAdded > 0 || day.sessionCount > 0,
  );

  const currentTrend = visualizations.addedRemovedTrend.map((point) => ({
    date: point.date,
    value: point.wordsAdded,
  }));
  const previousTrend =
    previousVisualizations?.addedRemovedTrend.map((point) => ({
      date: point.date,
      value: point.wordsAdded,
    })) ?? [];
  const alignedTrend =
    previousTrend.length > 0
      ? rangeMode === 'year'
        ? alignDailySeriesByMonth(currentTrend, previousTrend, i18n.language)
        : rangeMode === 'month'
          ? alignDailySeriesByDayOfMonth(currentTrend, previousTrend)
          : alignDailySeriesByIndex(currentTrend, previousTrend)
      : currentTrend.map((row) => ({
          key: row.date,
          label: row.date,
          current: row.value,
          previous: 0,
        }));
  const comparePeriods = Boolean(
    previousVisualizations && currentPeriodLabel && previousPeriodLabel,
  );
  const trendPoints = comparePeriods
    ? alignedTrend.map((row) => ({
        date: row.key,
        label: row.label,
        primary: row.current,
        secondary: row.previous,
      }))
    : visualizations.addedRemovedTrend.map((point) => ({
        date: point.date,
        label: point.date,
        primary: point.wordsAdded,
        secondary: point.wordsRemoved,
      }));

  return (
    <div className="space-y-6">
      <article
        className={`${FOCAL_ELEVATED_CLASS} space-y-4 rounded-lg border border-border p-4 sm:p-5`}
      >
        <h4 className="text-sm text-foreground">{t('profile.creatorstats.heatmapTitle')}</h4>
        <div className="overflow-x-auto pb-1">
          <svg
            role="img"
            aria-label={t('profile.creatorstats.heatmapTitle')}
            width={weeks.length * (CELL + GAP) + 32}
            height={7 * (CELL + GAP) + 8}
            className="max-w-none"
          >
            {WEEKDAY_KEYS.map((key, row) =>
              row % 2 === 0 ? (
                <text
                  key={key}
                  x={0}
                  y={row * (CELL + GAP) + 11}
                  fill="var(--color-recessed-foreground, var(--color-text-muted))"
                  fontSize="9"
                >
                  {t(`profile.creatorstats.${key}`).slice(0, 2)}
                </text>
              ) : null,
            )}
            {weeks.map((column, col) =>
              column.map((day, row) => {
                const x = 30 + col * (CELL + GAP);
                const y = row * (CELL + GAP);
                if (!day) {
                  return (
                    <rect
                      key={`empty-${col}-${row}`}
                      x={x}
                      y={y}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill="transparent"
                    />
                  );
                }
                const selected = selectedDate === day.date;
                return (
                  <rect
                    key={day.date}
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={heatFill(day, maxWords)}
                    stroke={selected ? 'var(--color-focal-foreground)' : 'transparent'}
                    strokeWidth={selected ? 1.5 : 0}
                    tabIndex={0}
                    role="button"
                    aria-label={t('profile.creatorstats.heatmapCell', {
                      date: day.date,
                      words: day.wordsAdded,
                      sessions: day.sessionCount,
                    })}
                    aria-pressed={selected}
                    onClick={() => setSelectedDate(day.date)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedDate(day.date);
                      }
                    }}
                  />
                );
              }),
            )}
          </svg>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{t('profile.creatorstats.heatmapLegendLess')}</span>
          <span className="inline-flex items-center gap-1">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className="inline-block size-3 rounded-sm"
                style={{ background: `var(--stats-writing-${step})` }}
              />
            ))}
          </span>
          <span>{t('profile.creatorstats.heatmapLegendMore')}</span>
        </div>
        {selectedDate ? (
          <div className="space-y-2 border-t border-border/30 pt-3">
            <p className="text-sm text-foreground">
              {t('profile.creatorstats.sessionsForDay', { date: selectedDate })}
            </p>
            {selectedSessions.length === 0 ? (
              <p className="text-sm text-muted">{t('profile.creatorstats.sessionsEmpty')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {selectedSessions.map((session) => (
                  <li key={session.id}>
                    <span className="text-foreground">
                      {new Date(session.startedAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {t('profile.creatorstats.sessionMinutes', {
                        count: Math.max(0, Math.round(session.activeDurationMs / 60_000)),
                      })}
                    </span>
                    {session.documents.length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {session.documents.map((doc) => (
                          <Link
                            key={doc.id}
                            to={doc.href}
                            className="text-primary hover:underline"
                          >
                            {doc.title}
                          </Link>
                        ))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.heatmapHint')}</p>
        )}
        <ul className="sr-only">
          {activeHeatRows.map((day) => (
            <li key={day.date}>
              {day.date}: {day.wordsAdded} words, {day.sessionCount} sessions,{' '}
              {day.sessionMinutes} minutes
            </li>
          ))}
        </ul>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChartFrame title={t('profile.creatorstats.weeklyTitle')}>
          {visualizations.weeklyRhythm.some((bucket) => bucket.sessionMinutes > 0) ||
          (previousVisualizations?.weeklyRhythm.some(
            (bucket) => bucket.sessionMinutes > 0,
          ) ??
            false) ? (
            <VerticalColumnChart
              label={t('profile.creatorstats.weeklyTitle')}
              category="writing"
              previousCategory="worldbuilding"
              currentLabel={comparePeriods ? currentPeriodLabel ?? undefined : undefined}
              previousLabel={comparePeriods ? previousPeriodLabel ?? undefined : undefined}
              items={visualizations.weeklyRhythm.map((bucket) => {
                const prior = previousVisualizations?.weeklyRhythm.find(
                  (row) => row.weekday === bucket.weekday,
                );
                return {
                  key: String(bucket.weekday),
                  label: weekdayLabel(bucket.weekday),
                  shortLabel: weekdayLabel(bucket.weekday).slice(0, 2),
                  value: bucket.sessionMinutes,
                  previous: comparePeriods ? (prior?.sessionMinutes ?? 0) : undefined,
                };
              })}
            />
          ) : (
            <p className="text-sm text-muted">{t('profile.creatorstats.emptyChart')}</p>
          )}
          <ul className="sr-only">
            {visualizations.weeklyRhythm.map((bucket) => (
              <li key={bucket.weekday}>
                {weekdayLabel(bucket.weekday)}: {bucket.sessionMinutes} minutes,{' '}
                {bucket.wordsAdded} words
              </li>
            ))}
          </ul>
        </StatsChartFrame>

        <HourlyActivityPanel
          visualizations={visualizations}
          previousVisualizations={comparePeriods ? previousVisualizations : null}
          currentPeriodLabel={currentPeriodLabel}
          previousPeriodLabel={previousPeriodLabel}
          showAllHours={showAllHours}
          onToggleAllHours={() => setShowAllHours((value) => !value)}
          t={t}
        />
      </div>

      <StatsChartFrame
        title={
          comparePeriods
            ? t('profile.creatorstats.trendTitleCompared')
            : t('profile.creatorstats.trendTitle')
        }
      >
        {trendPoints.some((point) => point.primary > 0 || point.secondary > 0) ? (
          <AreaTrendChart
            label={
              comparePeriods
                ? t('profile.creatorstats.trendTitleCompared')
                : t('profile.creatorstats.trendTitle')
            }
            points={trendPoints}
            primaryKey="current"
            secondaryKey={comparePeriods ? 'previous' : 'removed'}
            primaryLabel={
              comparePeriods
                ? (currentPeriodLabel ?? t('profile.creatorstats.trendAdded'))
                : t('profile.creatorstats.trendAdded')
            }
            secondaryLabel={
              comparePeriods
                ? (previousPeriodLabel ?? t('profile.creatorstats.trendPrevious'))
                : t('profile.creatorstats.trendRemoved')
            }
            primaryCategory="writing"
            secondaryCategory="worldbuilding"
          />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.emptyChart')}</p>
        )}
        <ul className="sr-only">
          {trendPoints
            .filter((point) => point.primary > 0 || point.secondary > 0)
            .map((point) => (
              <li key={point.date}>
                {point.label ?? point.date}: {point.primary} / {point.secondary}
              </li>
            ))}
        </ul>
      </StatsChartFrame>
    </div>
  );
}

function HourlyActivityPanel({
  visualizations,
  previousVisualizations,
  currentPeriodLabel,
  previousPeriodLabel,
  showAllHours,
  onToggleAllHours,
  t,
}: {
  visualizations: WritingVisualizationsPayload;
  previousVisualizations?: WritingVisualizationsPayload | null;
  currentPeriodLabel?: string | null;
  previousPeriodLabel?: string | null;
  showAllHours: boolean;
  onToggleAllHours: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const buckets = visualizations.hourly.map((bucket) => {
    const prior = previousVisualizations?.hourly.find((row) => row.hour === bucket.hour);
    return {
      hour: bucket.hour,
      value: bucket.sessionMinutes,
      previous: previousVisualizations ? (prior?.sessionMinutes ?? 0) : undefined,
      words: bucket.wordsAdded,
    };
  });
  const window = activeHourWindow(
    buckets.map((bucket) => ({
      hour: bucket.hour,
      value: Math.max(bucket.value, bucket.previous ?? 0),
    })),
  );
  const visible = showAllHours
    ? buckets
    : buckets.filter((bucket) => bucket.hour >= window.start && bucket.hour <= window.end);
  const hasActivity = buckets.some(
    (bucket) => bucket.value > 0 || (bucket.previous ?? 0) > 0,
  );

  return (
    <StatsChartFrame title={t('profile.creatorstats.hourlyTitle')}>
      {hasActivity ? (
        <HourColumnChart
          label={t('profile.creatorstats.hourlyTitle')}
          currentLabel={currentPeriodLabel ?? undefined}
          previousLabel={previousPeriodLabel ?? undefined}
          buckets={visible.map((bucket) => ({
            hour: bucket.hour,
            value: bucket.value,
            previous: bucket.previous,
          }))}
        />
      ) : (
        <p className="text-sm text-muted">{t('profile.creatorstats.emptyChart')}</p>
      )}
      {hasActivity ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            className="text-sm text-primary"
            onClick={onToggleAllHours}
          >
            {showAllHours
              ? t('profile.creatorstats.hourlyShowActive')
              : t('profile.creatorstats.hourlyShowAll')}
          </button>
        </div>
      ) : null}
      <ul className="sr-only">
        {visible.map((bucket) => (
          <li key={bucket.hour}>
            {formatHourLabel(bucket.hour)}: {bucket.value} minutes, {bucket.words} words
          </li>
        ))}
      </ul>
    </StatsChartFrame>
  );
}

function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}
