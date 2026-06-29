import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2 } from 'lucide-react';
import type { MetricId } from '@shared/metricRegistry';
import { METRIC_REGISTRY } from '@shared/metricRegistry';
import { readMetricAmount } from '@shared/metricValue';
import { fetchCampaignWorldStats } from '@/lib/statsApi';
import {
  formatCompactCount,
  shouldDisplayMetric,
  type CampaignActivitySignals,
} from '@/lib/metricDisplayPolicy';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface WorldSnapshotWidgetProps {
  campaignHandle: string;
  customizeMode?: boolean;
  onHide?: () => void;
}

const COMPOSITION_METRICS: MetricId[] = [
  'snapshot.totalWords',
  'snapshot.pageCount',
  'snapshot.characterCount',
  'snapshot.locationCount',
  'snapshot.organizationCount',
  'snapshot.connectionCount',
];

const GROWTH_METRICS: MetricId[] = [
  'period.pagesCreated',
  'period.pagesEdited',
  'period.locationsCreated',
  'period.connectionsCreated',
];

function growthDescriptor(pagesEdited: number, t: (key: string) => string): string | null {
  if (pagesEdited <= 0) return null;
  if (pagesEdited <= 10) return t('campaign.worldStats.growthSteady');
  return t('campaign.worldStats.growthActive');
}

function buildGrowthSummaryParts(
  stats: NonNullable<Awaited<ReturnType<typeof fetchCampaignWorldStats>>>,
  activitySignals: CampaignActivitySignals,
  t: (key: string) => string,
  locale: string,
): string[] {
  const parts: string[] = [];
  for (const id of GROWTH_METRICS) {
    const mode = shouldDisplayMetric(id, stats.period[id], activitySignals);
    if (mode !== 'show') continue;
    const amount = readMetricAmount(stats.period[id]) ?? 0;
    if (amount <= 0) continue;
    const label = t(METRIC_REGISTRY[id].i18nLabelKey);
    parts.push(`+${formatCompactCount(amount, locale)} ${label.toLowerCase()}`);
  }
  return parts;
}

export function WorldSnapshotWidget({
  campaignHandle,
  customizeMode,
  onHide,
}: WorldSnapshotWidgetProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCampaignWorldStats>> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCampaignWorldStats(campaignHandle, 30)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const periodDays = stats?.periodDays ?? 30;

  const activitySignals: CampaignActivitySignals = useMemo(() => {
    const words = readMetricAmount(stats?.snapshot['snapshot.totalWords']) ?? 0;
    const pages = readMetricAmount(stats?.snapshot['snapshot.pageCount']) ?? 0;
    return { totalWords: words, pageCount: pages };
  }, [stats]);

  const growthParts = useMemo(
    () => (stats ? buildGrowthSummaryParts(stats, activitySignals, t, i18n.language) : []),
    [stats, activitySignals, t, i18n.language],
  );

  const pagesEdited = readMetricAmount(stats?.period['period.pagesEdited']) ?? 0;
  const descriptor = growthDescriptor(pagesEdited, t);
  const hasGrowthActivity = growthParts.length > 0;

  const visibleBreakdownMetrics = useMemo(() => {
    if (!stats) return [];
    return GROWTH_METRICS.filter((metricId) => {
      const mode = shouldDisplayMetric(metricId, stats.period[metricId], activitySignals);
      if (mode !== 'show') return false;
      return (readMetricAmount(stats.period[metricId]) ?? 0) > 0;
    });
  }, [stats, activitySignals]);

  return (
    <DashboardWidgetShell
      title={t('campaign.worldStats.widgetTitle')}
      icon={<Globe2 className="size-4 text-emerald-300/90" />}
      customizeMode={customizeMode}
      onHide={onHide}
      loading={loading}
    >
      {!stats ? (
        <p className="text-sm text-muted">{t('campaign.worldStats.growthQuiet')}</p>
      ) : (
        <div className="space-y-4 text-sm">
          <section className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
              {t('campaign.worldStats.sectionComposition')}
            </h4>
            <dl className="grid grid-cols-2 gap-2">
              {COMPOSITION_METRICS.map((metricId) => {
                const mode = shouldDisplayMetric(
                  metricId,
                  stats.snapshot[metricId],
                  activitySignals,
                );
                if (mode === 'hide') return null;
                const amount = readMetricAmount(stats.snapshot[metricId]) ?? 0;
                return (
                  <div key={metricId} className="rounded border border-border/60 px-2 py-1.5">
                    <dt className="text-xs text-muted">{t(METRIC_REGISTRY[metricId].i18nLabelKey)}</dt>
                    <dd className="font-medium text-foreground">
                      {mode === 'empty_state_encouraging'
                        ? t('campaign.worldStats.notYetTracked')
                        : formatCompactCount(amount, i18n.language)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="space-y-1">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
              {t('campaign.worldStats.sectionGrowth')}
            </h4>
            {hasGrowthActivity ? (
              <>
                {descriptor ? (
                  <p className="font-medium text-foreground">{descriptor}</p>
                ) : null}
                <p className="text-muted">{growthParts.join(' · ')}</p>
              </>
            ) : (
              <p className="text-muted">
                {t('campaign.worldStats.noGrowthInPeriod', { days: periodDays })}
              </p>
            )}
          </section>

          {expanded && visibleBreakdownMetrics.length > 0 ? (
            <section className="space-y-2 border-t border-border/50 pt-3">
              <dl className="grid grid-cols-2 gap-2">
                {visibleBreakdownMetrics.map((metricId) => {
                  const amount = readMetricAmount(stats.period[metricId]) ?? 0;
                  return (
                    <div key={metricId} className="rounded border border-border/60 px-2 py-1.5">
                      <dt className="text-xs text-muted">
                        {t(METRIC_REGISTRY[metricId].i18nLabelKey)}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {formatCompactCount(amount, i18n.language)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null}

          {visibleBreakdownMetrics.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-xs text-primary hover:underline"
            >
              {expanded
                ? t('campaign.worldStats.collapseDetails')
                : t('campaign.worldStats.expandDetails')}
            </button>
          ) : null}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
