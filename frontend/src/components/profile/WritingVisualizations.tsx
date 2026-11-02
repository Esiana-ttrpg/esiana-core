import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  WritingHeatmapDay,
  WritingVisualizations as WritingVisualizationsPayload,
} from '@shared/statsTypes';
import { META_SECTION_LABEL_CLASS, META_TABLE_HEAD_CLASS } from '@/lib/surfaceLayout';

const WEEKDAY_KEYS = [
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
  'weekdaySun',
] as const;

const CELL = 12;
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

function ChartTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">{caption}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className={`${META_TABLE_HEAD_CLASS} pr-3`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join('|')} className="border-t border-border/40">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className="py-1 pr-3 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function HourStrip({
  label,
  buckets,
}: {
  label: string;
  buckets: Array<{ hour: number; value: number }>;
}) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.value));
  const width = 24 * 14;
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} 64`} className="h-16 w-full max-w-xl">
      {buckets.map((bucket) => {
        const barHeight = (bucket.value / max) * 48;
        const x = bucket.hour * 14;
        return (
          <g key={bucket.hour}>
            <rect
              x={x}
              y={52 - barHeight}
              width={10}
              height={barHeight}
              rx={1}
              fill="var(--stats-writing)"
            />
            {bucket.hour % 6 === 0 ? (
              <text x={x} y={62} fill="var(--color-text-muted)" fontSize="8">
                {String(bucket.hour).padStart(2, '0')}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function BarRowChart({
  label,
  items,
  value,
}: {
  label: string;
  items: Array<{ key: string; label: string; value: number }>;
  value: (item: { value: number }) => number;
}) {
  const max = Math.max(1, ...items.map((item) => value(item)));
  const width = 320;
  const barHeight = 14;
  const height = items.length * (barHeight + 8);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-md"
    >
      {items.map((item, index) => {
        const barWidth = (value(item) / max) * 220;
        const y = index * (barHeight + 8);
        return (
          <g key={item.key}>
            <text x={0} y={y + 11} fill="var(--color-text-muted)" fontSize="11">
              {item.label}
            </text>
            <rect
              x={72}
              y={y}
              width={Math.max(barWidth, value(item) > 0 ? 2 : 0)}
              height={barHeight}
              rx={2}
              fill="var(--stats-writing)"
            />
            <text x={80 + barWidth} y={y + 11} fill="var(--color-focal-foreground)" fontSize="11">
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function WritingVisualizations({
  visualizations,
}: {
  visualizations: WritingVisualizationsPayload;
}) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
      columns[columns.length - 1] = [...last, ...Array.from({ length: 7 - last.length }, () => null)];
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
    return <p className="text-sm text-muted">{t('profile.creatorstats.chartsEmpty')}</p>;
  }

  const trendWidth = Math.max(320, visualizations.addedRemovedTrend.length * 4);
  const trendMax = Math.max(
    1,
    ...visualizations.addedRemovedTrend.map((point) =>
      Math.max(point.wordsAdded, point.wordsRemoved),
    ),
  );
  const addedPath = visualizations.addedRemovedTrend
    .map((point, index) => {
      const x = (index / Math.max(1, visualizations.addedRemovedTrend.length - 1)) * (trendWidth - 24) + 12;
      const y = 88 - (point.wordsAdded / trendMax) * 76;
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
  const removedPath = visualizations.addedRemovedTrend
    .map((point, index) => {
      const x = (index / Math.max(1, visualizations.addedRemovedTrend.length - 1)) * (trendWidth - 24) + 12;
      const y = 88 - (point.wordsRemoved / trendMax) * 76;
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.heatmapTitle')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.heatmapHelp')}</p>
        <div className="overflow-x-auto">
          <svg
            role="img"
            aria-label={t('profile.creatorstats.heatmapTitle')}
            width={weeks.length * (CELL + GAP) + 28}
            height={7 * (CELL + GAP) + 8}
          >
            {WEEKDAY_KEYS.map((key, row) => (
              <text
                key={key}
                x={0}
                y={row * (CELL + GAP) + 10}
                fill="var(--color-text-muted)"
                fontSize="9"
              >
                {t(`profile.creatorstats.${key}`).slice(0, 2)}
              </text>
            ))}
            {weeks.map((column, col) =>
              column.map((day, row) => {
                const x = 28 + col * (CELL + GAP);
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
        {selectedDate ? (
          <div className="space-y-2">
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
                          <Link key={doc.id} to={doc.href} className="text-primary hover:underline">
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
        <ChartTable
          caption={t('profile.creatorstats.tableAlternative')}
          headers={[
            t('profile.creatorstats.colDate'),
            t('profile.creatorstats.colWordsAdded'),
            t('profile.creatorstats.colSessions'),
            t('profile.creatorstats.colMinutes'),
          ]}
          rows={visualizations.heatmap
            .filter((day) => day.wordsAdded > 0 || day.sessionCount > 0)
            .map((day) => [
              day.date,
              String(day.wordsAdded),
              String(day.sessionCount),
              String(day.sessionMinutes),
            ])}
        />
      </section>

      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.weeklyTitle')}</h3>
        <BarRowChart
          label={t('profile.creatorstats.weeklyTitle')}
          items={visualizations.weeklyRhythm.map((bucket) => ({
            key: String(bucket.weekday),
            label: weekdayLabel(bucket.weekday),
            value: bucket.sessionMinutes,
          }))}
          value={(item) => item.value}
        />
        <ChartTable
          caption={t('profile.creatorstats.tableAlternative')}
          headers={[
            t('profile.creatorstats.colWeekday'),
            t('profile.creatorstats.colWordsAdded'),
            t('profile.creatorstats.colMinutes'),
          ]}
          rows={visualizations.weeklyRhythm.map((bucket) => [
            weekdayLabel(bucket.weekday),
            String(bucket.wordsAdded),
            String(bucket.sessionMinutes),
          ])}
        />
      </section>

      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.hourlyTitle')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.hourlyHelp')}</p>
        <HourStrip
          label={t('profile.creatorstats.hourlyTitle')}
          buckets={visualizations.hourly.map((bucket) => ({
            hour: bucket.hour,
            value: bucket.sessionMinutes,
          }))}
        />
        <ChartTable
          caption={t('profile.creatorstats.tableAlternative')}
          headers={[
            t('profile.creatorstats.colHour'),
            t('profile.creatorstats.colWordsAdded'),
            t('profile.creatorstats.colMinutes'),
          ]}
          rows={visualizations.hourly.map((bucket) => [
            String(bucket.hour),
            String(bucket.wordsAdded),
            String(bucket.sessionMinutes),
          ])}
        />
      </section>

      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.trendTitle')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.trendHelp')}</p>
        <div className="overflow-x-auto">
          <svg
            role="img"
            aria-label={t('profile.creatorstats.trendTitle')}
            viewBox={`0 0 ${trendWidth} 96`}
            className="h-24 w-full min-w-[20rem]"
          >
            <path d={addedPath} fill="none" stroke="var(--stats-writing)" strokeWidth="2" />
            <path d={removedPath} fill="none" stroke="var(--stats-worldbuilding)" strokeWidth="2" />
          </svg>
        </div>
        <p className="text-xs text-muted">
          <span className="mr-3">{t('profile.creatorstats.trendAdded')}</span>
          <span>{t('profile.creatorstats.trendRemoved')}</span>
        </p>
        <ChartTable
          caption={t('profile.creatorstats.tableAlternative')}
          headers={[
            t('profile.creatorstats.colDate'),
            t('profile.creatorstats.colWordsAdded'),
            t('profile.creatorstats.colWordsRemoved'),
          ]}
          rows={visualizations.addedRemovedTrend
            .filter((point) => point.wordsAdded > 0 || point.wordsRemoved > 0)
            .map((point) => [
              point.date,
              String(point.wordsAdded),
              String(point.wordsRemoved),
            ])}
        />
      </section>
    </div>
  );
}
