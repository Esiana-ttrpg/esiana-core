import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CreatorAttributionResponse,
  PersonalStatisticsResponse,
} from '@shared/statsTypes';
import type { MetricId } from '@shared/metricRegistry';
import { readMetricAmount } from '@shared/metricValue';
import {
  downloadOwnerStatisticsExport,
  fetchOwnerPersonalStatistics,
} from '@/lib/statsApi';
import {
  formatPeriodComparisonCaption,
  formatPeriodWindowLabel,
  possessiveName,
  previousComparableQuery,
} from '@/lib/previousStatisticsRange';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import {
  defaultCustomRange,
  nextCivilDayKey,
  StatisticsRangeControls,
  type StatisticsRangeSelection,
} from '@/components/profile/StatisticsRangeControls';
import { WritingVisualizations } from '@/components/profile/WritingVisualizations';
import { StatsMetricCard } from '@/components/profile/stats/StatsMetricCard';
import {
  StatsEmptyState,
  StatsLoadingState,
  StatsSectionHeader,
} from '@/components/profile/stats/StatsChartFrame';
import {
  CartographyActivityChart,
  ParticipationBreakdownTable,
  WorldbuildingActivityChart,
} from '@/components/profile/stats/DomainActivityCharts';
import { CreativeTendenciesRadar } from '@/components/profile/stats/CreativeTendenciesRadar';
import { PeriodHeadlineCards } from '@/components/profile/stats/PeriodHeadlineCards';
import { MostWorkedOnGallery } from '@/components/profile/stats/MostWorkedOnGallery';
import { ActiveCampaignsSection } from '@/components/profile/stats/ActiveCampaignsSection';
import { ChronologyTimeline } from '@/components/profile/stats/ChronologyTimeline';
import { WrappedArchiveSection } from '@/components/wrapped/WrappedArchiveSection';

function formatFavoriteHour(hourUtc: number, locale: string): string {
  const date = new Date(Date.UTC(2020, 0, 1, hourUtc, 0));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

export function CreativeStatisticsDashboard({
  attribution,
  displayName,
  userId,
}: {
  attribution: CreatorAttributionResponse | null;
  displayName: string;
  userId: string;
}) {
  const { t, i18n } = useTranslation();
  const customDefaults = useMemo(() => defaultCustomRange(), []);
  const [selection, setSelection] = useState<StatisticsRangeSelection>({
    mode: 'month',
    from: customDefaults.from,
    to: customDefaults.to,
  });
  const [statistics, setStatistics] = useState<PersonalStatisticsResponse | null>(
    null,
  );
  const [previous, setPrevious] = useState<PersonalStatisticsResponse | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const queryOptions = useMemo(() => {
    if (selection.mode !== 'custom') {
      return { range: selection.mode };
    }
    // UI dates are inclusive; API `to` is exclusive start-of-day.
    if (!selection.from || !selection.to || selection.from > selection.to) {
      return null;
    }
    return {
      range: 'custom' as const,
      from: selection.from,
      to: nextCivilDayKey(selection.to),
    };
  }, [selection]);

  useEffect(() => {
    if (!queryOptions) {
      setStatistics(null);
      setPrevious(null);
      setChartsLoading(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setChartsLoading(true);
    setLoadError(false);
    void fetchOwnerPersonalStatistics(queryOptions)
      .then(async (payload) => {
        if (cancelled) return;
        setStatistics(payload);
        const prior = previousComparableQuery({
          ...payload.range,
          timeZone: payload.timeZone,
        });
        if (!prior) {
          setPrevious(null);
          return;
        }
        try {
          const priorPayload = await fetchOwnerPersonalStatistics(prior);
          if (!cancelled) setPrevious(priorPayload);
        } catch {
          if (!cancelled) setPrevious(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatistics(null);
          setPrevious(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setChartsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryOptions]);

  const download = async (format: 'json' | 'csv') => {
    if (!queryOptions) return;
    setExportError(null);
    try {
      await downloadOwnerStatisticsExport(format, queryOptions);
    } catch {
      setExportError(t('profile.creatorstats.exportError'));
    }
  };

  if (!attribution) {
    return <StatsEmptyState message={t('profile.creatorstats.emptyEarly')} />;
  }

  const isAllTime = selection.mode === 'all_time';
  const habitCards: Array<{ id: MetricId; category: 'writing' }> = [
    { id: 'attribution.wordsAdded', category: 'writing' },
    { id: 'attribution.writingStreak', category: 'writing' },
    { id: 'attribution.writingCadence', category: 'writing' },
    { id: 'attribution.substantialRevisions', category: 'writing' },
    { id: 'attribution.favoriteWritingHour', category: 'writing' },
  ];

  const lifetimeCards: Array<{
    id: MetricId;
    category: 'writing' | 'worldbuilding' | 'campaigns';
  }> = [
    { id: 'attribution.totalWordsCreated', category: 'writing' },
    { id: 'attribution.pagesCreated', category: 'writing' },
    { id: 'attribution.totalEdits', category: 'worldbuilding' },
    { id: 'attribution.charactersCreated', category: 'worldbuilding' },
    { id: 'attribution.locationsCreated', category: 'worldbuilding' },
    { id: 'attribution.organizationsCreated', category: 'worldbuilding' },
    { id: 'attribution.connectionsCreated', category: 'worldbuilding' },
    { id: 'attribution.campaignsContributedCount', category: 'campaigns' },
  ];

  const metricLabel = (metricId: MetricId) =>
    t(`profile.creatorstats.${metricId.replace('attribution.', '')}`);

  const habitDisplayOverride = (metricId: MetricId): string | undefined => {
    const amount = readMetricAmount(attribution.metrics[metricId]);
    if (amount == null) return undefined;
    if (metricId === 'attribution.writingStreak') {
      return t('profile.creatorstats.writingStreakDays', { count: amount });
    }
    if (metricId === 'attribution.writingCadence') {
      return t('profile.creatorstats.writingCadenceDays', { count: amount });
    }
    if (metricId === 'attribution.favoriteWritingHour') {
      return t('profile.creatorstats.favoriteWritingHourValue', {
        hour: formatFavoriteHour(amount, i18n.language),
      });
    }
    return undefined;
  };

  const title = t('profile.creatorstats.statisticsTitleNamed', {
    name: possessiveName(displayName) || displayName,
  });
  const currentPeriodLabel = statistics
    ? formatPeriodWindowLabel({
        mode: statistics.range.mode,
        start: statistics.range.start,
        end: statistics.range.end,
        timeZone: statistics.timeZone,
        locale: i18n.language,
      })
    : null;
  const previousPeriodLabel = previous
    ? formatPeriodWindowLabel({
        mode: statistics?.range.mode ?? selection.mode,
        start: previous.range.start,
        end: previous.range.end,
        timeZone: previous.timeZone,
        locale: i18n.language,
      })
    : null;
  const periodComparisonCaption =
    statistics && previous && !isAllTime
      ? formatPeriodComparisonCaption({
          mode: statistics.range.mode,
          currentStart: statistics.range.start,
          currentEnd: statistics.range.end,
          previousStart: previous.range.start,
          previousEnd: previous.range.end,
          timeZone: statistics.timeZone,
          locale: i18n.language,
        })
      : null;

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <h2 className={`${TYPE_DISPLAY_CLASS} text-3xl text-foreground`}>
              {title}
            </h2>
            <p className="max-w-2xl text-sm text-muted">
              {t('profile.creatorstats.writingIntro')}
            </p>
          </div>
          <div className="md:shrink-0 md:pt-1">
            <StatisticsRangeControls
              selection={selection}
              onChange={setSelection}
              t={t}
            />
          </div>
        </div>
        {periodComparisonCaption ? (
          <p className="text-sm text-foreground">{periodComparisonCaption}</p>
        ) : currentPeriodLabel && !isAllTime ? (
          <p className="text-sm text-muted">{currentPeriodLabel}</p>
        ) : null}
        {!queryOptions ? (
          <p className="text-sm text-muted">{t('profile.creatorstats.rangeInvalid')}</p>
        ) : null}
        {loadError ? (
          <StatsEmptyState message={t('profile.creatorstats.loadError')} />
        ) : null}
      </header>

      <WrappedArchiveSection userId={userId} />

      {!isAllTime && statistics && !chartsLoading ? (
        <PeriodHeadlineCards
          current={statistics}
          previous={previous}
          locale={i18n.language}
          t={t}
        />
      ) : null}

      {isAllTime ? (
        <section className="space-y-4">
          <StatsSectionHeader
            category="writing"
            title={t('profile.creatorstats.sectionLifetime')}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lifetimeCards.map((card) => (
              <StatsMetricCard
                key={card.id}
                label={metricLabel(card.id)}
                value={attribution.metrics[card.id]}
                category={card.category}
                locale={i18n.language}
                t={t}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!chartsLoading &&
      statistics?.activeCampaigns &&
      statistics.activeCampaigns.length > 0 ? (
        <ActiveCampaignsSection
          campaigns={statistics.activeCampaigns}
          rangeMode={statistics.range.mode}
          t={t}
        />
      ) : null}

      <section className="space-y-5">
        <StatsSectionHeader
          category="writing"
          title={t('profile.creatorstats.sectionRhythm')}
        />
        {chartsLoading ? (
          <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
        ) : statistics?.visualizations ? (
          <WritingVisualizations
            visualizations={statistics.visualizations}
            previousVisualizations={previous?.visualizations}
            rangeMode={statistics.range.mode}
            currentPeriodLabel={currentPeriodLabel}
            previousPeriodLabel={previousPeriodLabel}
          />
        ) : !loadError ? (
          <StatsEmptyState message={t('profile.creatorstats.chartsEmpty')} />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {habitCards.map((card) => (
            <StatsMetricCard
              key={card.id}
              label={metricLabel(card.id)}
              value={attribution.metrics[card.id]}
              category={card.category}
              locale={i18n.language}
              t={t}
              displayOverride={habitDisplayOverride(card.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <StatsSectionHeader
          category="writing"
          title={t('profile.creatorstats.sectionFootprint')}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {chartsLoading ? (
            <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
          ) : (
            <CreativeTendenciesRadar
              archetypes={statistics?.archetypes}
              previousArchetypes={previous?.archetypes}
              currentPeriodLabel={currentPeriodLabel}
              previousPeriodLabel={previousPeriodLabel}
              t={t}
            />
          )}
          {chartsLoading ? (
            <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
          ) : (
            <MostWorkedOnGallery
              visualizations={statistics?.visualizations}
              mapThumbnails={statistics?.cartographyThumbnails ?? []}
              t={t}
            />
          )}
        </div>
      </section>

      <section className="space-y-5">
        <StatsSectionHeader
          category="worldbuilding"
          title={t('profile.creatorstats.sectionWorlds')}
        />
        {chartsLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
            <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <WorldbuildingActivityChart
                rows={statistics?.worldbuilding ?? []}
                locale={i18n.language}
                t={t}
              />
              <CartographyActivityChart
                rows={statistics?.cartography ?? []}
                thumbnails={statistics?.cartographyThumbnails ?? []}
                locale={i18n.language}
                t={t}
              />
            </div>
            <ChronologyTimeline
              rows={statistics?.chronology ?? []}
              locale={i18n.language}
              t={t}
            />
          </>
        )}
      </section>

      <section className="space-y-5">
        <StatsSectionHeader
          category="campaigns"
          title={t('profile.creatorstats.sectionAdventures')}
        />
        {chartsLoading ? (
          <StatsLoadingState message={t('profile.creatorstats.chartsLoading')} />
        ) : statistics?.participation?.length ? (
          <ParticipationBreakdownTable
            rows={statistics.participation}
            history={statistics.participationHistory ?? []}
            locale={i18n.language}
            t={t}
          />
        ) : (
          <StatsEmptyState message={t('profile.creatorstats.participationEmpty')} />
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h3 className="text-sm text-foreground">{t('profile.creatorstats.exportSection')}</h3>
        <p className="max-w-2xl text-sm text-muted">
          {t('profile.creatorstats.exportHelp')}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded border border-border/50 px-3 py-1.5 text-sm text-primary disabled:opacity-50"
            disabled={!queryOptions}
            onClick={() => void download('json')}
          >
            {t('profile.creatorstats.exportJson')}
          </button>
          <button
            type="button"
            className="rounded border border-border/50 px-3 py-1.5 text-sm text-primary disabled:opacity-50"
            disabled={!queryOptions}
            onClick={() => void download('csv')}
          >
            {t('profile.creatorstats.exportCsv')}
          </button>
        </div>
        {exportError ? <p className="text-sm text-muted">{exportError}</p> : null}
      </section>
    </div>
  );
}
