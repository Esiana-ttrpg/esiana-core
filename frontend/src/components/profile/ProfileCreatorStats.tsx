import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type {
  CartographyDomainStats,
  CartographyThumbnail,
  ChronologyDomainStats,
  CreatorAttributionResponse,
  ParticipationDomainStats,
  ParticipationHistoryEntry,
  PersonalStatisticsRangeMode,
  PersonalStatisticsResponse,
  WorldbuildingDomainStats,
} from '@shared/statsTypes';
import type { MetricId } from '@shared/metricRegistry';
import type { MetricValue } from '@shared/metricValue';
import { readMetricAmount } from '@shared/metricValue';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';
import { META_SECTION_LABEL_CLASS, META_TABLE_HEAD_CLASS } from '@/lib/surfaceLayout';
import {
  downloadOwnerStatisticsExport,
  fetchOwnerPersonalStatistics,
} from '@/lib/statsApi';
import { WritingVisualizations } from '@/components/profile/WritingVisualizations';

const CODEX_LABEL_KEYS: Record<string, string> = {
  CHARACTER: 'Characters',
  LOCATION: 'Locations',
  ORGANIZATION: 'Organizations',
  FAMILY: 'Families',
  QUEST: 'Quests',
  SCENE: 'Scenes',
};

interface ProfileCreatorStatsOverviewProps {
  attribution: CreatorAttributionResponse | null;
  displayName: string;
  isSelf: boolean;
}

export function ProfileCreatorStatsOverview({
  attribution,
  displayName,
  isSelf,
}: ProfileCreatorStatsOverviewProps) {
  const { t, i18n } = useTranslation();

  if (!attribution) {
    return null;
  }

  const words = readMetricAmount(attribution.metrics['attribution.totalWordsCreated']) ?? 0;
  const pages = readMetricAmount(attribution.metrics['attribution.pagesCreated']) ?? 0;
  const campaigns =
    readMetricAmount(attribution.metrics['attribution.campaignsContributedCount']) ?? 0;

  if (words === 0 && pages === 0) {
    return (
      <p className="text-sm text-muted">{t('profile.creatorstats.emptyEarly')}</p>
    );
  }

  const topMix = attribution.worldbuildingMix.slice(0, 2);
  const mixLabels = topMix.map((entry) => CODEX_LABEL_KEYS[entry.codexType] ?? entry.codexType);

  return (
    <section className="space-y-2">
      <p className="text-sm text-foreground">
        {isSelf
          ? t('profile.creatorstats.headlineSelf', {
              words: formatCompactCount(words, i18n.language),
              pages: formatCompactCount(pages, i18n.language),
            })
          : t('profile.creatorstats.headlineOther', {
              name: displayName,
              words: formatCompactCount(words, i18n.language),
              pages: formatCompactCount(pages, i18n.language),
            })}
      </p>
      {mixLabels.length > 0 ? (
        <p className="text-sm text-muted">
          {t('profile.creatorstats.mixLead', { types: mixLabels.join(' & ') })}
        </p>
      ) : null}
      {campaigns > 0 ? (
        <p className="text-xs text-muted">
          {t('profile.creatorstats.campaignsContributed', { count: campaigns })}
        </p>
      ) : null}
    </section>
  );
}

interface ProfileWritingTabProps {
  attribution: CreatorAttributionResponse | null;
}

function formatFavoriteHour(hourUtc: number, locale: string): string {
  const date = new Date(Date.UTC(2020, 0, 1, hourUtc, 0));
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric' }).format(date);
}

function renderMetricValue(
  metricId: MetricId,
  value: MetricValue | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
): ReactNode {
  const key = metricId.replace('attribution.', '');
  const amount = readMetricAmount(value);
  if (amount == null && value?.status === 'unavailable') {
    return (
      <>
        <dt className="text-xs text-muted">{t(`profile.creatorstats.${key}`)}</dt>
        <dd className="text-sm text-muted">{t('profile.creatorstats.notYetTracked')}</dd>
      </>
    );
  }

  let display: string;
  if (metricId === 'attribution.writingStreak') {
    display = t('profile.creatorstats.writingStreakDays', { count: amount ?? 0 });
  } else if (metricId === 'attribution.writingCadence') {
    display = t('profile.creatorstats.writingCadenceDays', { count: amount ?? 0 });
  } else if (metricId === 'attribution.favoriteWritingHour' && amount != null) {
    display = t('profile.creatorstats.favoriteWritingHourValue', {
      hour: formatFavoriteHour(amount, locale),
    });
  } else {
    display = formatCompactCount(amount ?? 0, locale);
  }

  return (
    <>
      <dt className="text-xs text-muted">{t(`profile.creatorstats.${key}`)}</dt>
      <dd className="text-lg font-semibold text-foreground">{display}</dd>
    </>
  );
}

function formatWorldbuildingCell(
  value: MetricValue | undefined,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const amount = readMetricAmount(value);
  if (amount == null) return t('profile.creatorstats.notYetTracked');
  return formatCompactCount(amount, locale);
}

function CartographyTable({
  rows,
  locale,
  t,
}: {
  rows: CartographyDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <table className="w-full min-w-0 text-left text-sm">
      <thead>
        <tr>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colDomain')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodEdited')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.domain} className="border-t border-border/40">
            <td className="py-1 pr-3 text-foreground">
              {t(`profile.creatorstats.cartography.${row.domain}`)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.created, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodCreated, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodEdited, locale, t)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CartographyThumbnails({
  thumbnails,
  t,
}: {
  thumbnails: CartographyThumbnail[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (thumbnails.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {thumbnails.map((map) => (
        <li key={map.id} className="w-24">
          <Link to={map.href} className="block min-w-0">
            {map.thumbnailUrl ? (
              <img
                src={map.thumbnailUrl}
                alt={map.label}
                className="h-16 w-24 rounded border border-border/40 object-cover"
              />
            ) : (
              <span className="flex h-16 w-24 items-center justify-center rounded border border-border/40 bg-elevated text-xs text-muted">
                {t('profile.creatorstats.cartographyFallback')}
              </span>
            )}
            <span className="mt-1 block truncate text-xs text-muted">{map.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ChronologyTable({
  rows,
  locale,
  t,
}: {
  rows: ChronologyDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <table className="w-full min-w-0 text-left text-sm">
      <thead>
        <tr>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colDomain')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodEdited')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colMinutesAdvanced')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.domain} className="border-t border-border/40">
            <td className="py-1 pr-3 text-foreground">
              {t(`profile.creatorstats.chronology.${row.domain}`)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.created, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodCreated, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodEdited, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {row.domain === 'timeAdvances'
                ? formatWorldbuildingCell(row.minutesAdvanced, locale, t)
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ParticipationTable({
  rows,
  locale,
  t,
}: {
  rows: ParticipationDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <table className="w-full min-w-0 text-left text-sm">
      <thead>
        <tr>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colDomain')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colTotal')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPlannedMinutes')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.domain} className="border-t border-border/40">
            <td className="py-1 pr-3 text-foreground">
              {t(`profile.creatorstats.participation.${row.domain}`)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.total, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodTotal, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {row.domain === 'sessionsAttended' || row.domain === 'sessionsHosted'
                ? formatWorldbuildingCell(row.plannedDurationMinutes, locale, t)
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ParticipationHistoryList({
  entries,
  locale,
  t,
}: {
  entries: ParticipationHistoryEntry[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm text-muted">
        {t('profile.creatorstats.participationHistoryHeading')}
      </h4>
      <ul className="space-y-1 text-sm text-foreground">
        {entries.map((entry) => {
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
          const minutes =
            entry.plannedDurationMinutes != null
              ? t('profile.creatorstats.sessionMinutes', {
                  count: entry.plannedDurationMinutes,
                })
              : null;
          return (
            <li key={entry.timelinePointId} className="border-t border-border/40 py-1">
              {when}
              {' · '}
              {roles}
              {minutes ? ` · ${minutes}` : ''}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorldbuildingTable({
  rows,
  locale,
  t,
}: {
  rows: WorldbuildingDomainStats[];
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <table className="w-full min-w-0 text-left text-sm">
      <thead>
        <tr>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colDomain')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodCreated')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodEdited')}
          </th>
          <th className={`${META_TABLE_HEAD_CLASS} pr-3`}>
            {t('profile.creatorstats.colPeriodContributed')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.domain} className="border-t border-border/40">
            <td className="py-1 pr-3 text-foreground">
              {t(`profile.creatorstats.domain.${row.domain}`)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.created, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodCreated, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodEdited, locale, t)}
            </td>
            <td className="py-1 pr-3 text-foreground">
              {formatWorldbuildingCell(row.periodContributed, locale, t)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProfileWritingTab({ attribution }: ProfileWritingTabProps) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<PersonalStatisticsRangeMode>('year');
  const [statistics, setStatistics] = useState<PersonalStatisticsResponse | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChartsLoading(true);
    void fetchOwnerPersonalStatistics({ range })
      .then((payload) => {
        if (!cancelled) setStatistics(payload);
      })
      .catch(() => {
        if (!cancelled) setStatistics(null);
      })
      .finally(() => {
        if (!cancelled) setChartsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const download = async (format: 'json' | 'csv') => {
    setExportError(null);
    try {
      await downloadOwnerStatisticsExport(format, { range });
    } catch {
      setExportError(t('profile.creatorstats.exportError'));
    }
  };

  if (!attribution) {
    return <p className="text-sm text-muted">{t('profile.creatorstats.emptyEarly')}</p>;
  }

  const lifetimeRows = [
    'attribution.totalWordsCreated',
    'attribution.pagesCreated',
    'attribution.totalEdits',
    'attribution.charactersCreated',
    'attribution.locationsCreated',
    'attribution.organizationsCreated',
    'attribution.connectionsCreated',
    'attribution.campaignsContributedCount',
  ] as const;

  const habitRows = [
    'attribution.wordsAdded',
    'attribution.writingStreak',
    'attribution.writingCadence',
    'attribution.substantialRevisions',
    'attribution.favoriteWritingHour',
  ] as const;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t('profile.creatorstats.writingIntro')}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {lifetimeRows.map((metricId) => (
          <div key={metricId} className="rounded border border-border p-3">
            {renderMetricValue(metricId, attribution.metrics[metricId], t, i18n.language)}
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.habitsSection')}</h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {habitRows.map((metricId) => (
            <div key={metricId} className="rounded border border-border p-3">
              {renderMetricValue(metricId, attribution.metrics[metricId], t, i18n.language)}
            </div>
          ))}
        </dl>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.worldbuildingSection')}</h3>
          <label className="text-sm text-muted">
            {t('profile.creatorstats.rangeLabel')}
            <select
              className="ml-2 rounded border border-border bg-background p-2 text-foreground"
              value={range}
              onChange={(event) => setRange(event.target.value as PersonalStatisticsRangeMode)}
            >
              <option value="year">{t('profile.creatorstats.rangeYear')}</option>
              <option value="month">{t('profile.creatorstats.rangeMonth')}</option>
              <option value="all_time">{t('profile.creatorstats.rangeAllTime')}</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-muted">{t('profile.creatorstats.worldbuildingHelp')}</p>
        {chartsLoading ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsLoading')}</p>
        ) : statistics?.worldbuilding?.length ? (
          <WorldbuildingTable rows={statistics.worldbuilding} locale={i18n.language} t={t} />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.worldbuildingEmpty')}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.cartographySection')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.cartographyHelp')}</p>
        {chartsLoading ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsLoading')}</p>
        ) : statistics?.cartography?.length ? (
          <>
            <CartographyTable rows={statistics.cartography} locale={i18n.language} t={t} />
            <CartographyThumbnails
              thumbnails={statistics.cartographyThumbnails ?? []}
              t={t}
            />
          </>
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.cartographyEmpty')}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.chronologySection')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.chronologyHelp')}</p>
        {chartsLoading ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsLoading')}</p>
        ) : statistics?.chronology?.length ? (
          <ChronologyTable rows={statistics.chronology} locale={i18n.language} t={t} />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.chronologyEmpty')}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>
          {t('profile.creatorstats.participationSection')}
        </h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.participationHelp')}</p>
        {chartsLoading ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsLoading')}</p>
        ) : statistics?.participation?.length ? (
          <>
            <ParticipationTable
              rows={statistics.participation}
              locale={i18n.language}
              t={t}
            />
            {statistics.participationHistory?.length ? (
              <ParticipationHistoryList
                entries={statistics.participationHistory}
                locale={i18n.language}
                t={t}
              />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.participationEmpty')}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.chartsSection')}</h3>
        {chartsLoading ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsLoading')}</p>
        ) : statistics?.visualizations ? (
          <WritingVisualizations visualizations={statistics.visualizations} />
        ) : (
          <p className="text-sm text-muted">{t('profile.creatorstats.chartsEmpty')}</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className={META_SECTION_LABEL_CLASS}>{t('profile.creatorstats.exportSection')}</h3>
        <p className="text-sm text-muted">{t('profile.creatorstats.exportHelp')}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="text-sm text-primary" onClick={() => void download('json')}>
            {t('profile.creatorstats.exportJson')}
          </button>
          <button type="button" className="text-sm text-primary" onClick={() => void download('csv')}>
            {t('profile.creatorstats.exportCsv')}
          </button>
        </div>
        {exportError ? <p className="text-sm text-muted">{exportError}</p> : null}
      </section>
    </div>
  );
}
