import { useTranslation } from 'react-i18next';
import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

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
      <p className="text-sm text-muted">{t('profile.creatorStats.emptyEarly')}</p>
    );
  }

  const topMix = attribution.worldbuildingMix.slice(0, 2);
  const mixLabels = topMix.map((entry) => CODEX_LABEL_KEYS[entry.codexType] ?? entry.codexType);

  return (
    <section className="space-y-2">
      <p className="text-sm text-foreground">
        {isSelf
          ? t('profile.creatorStats.headlineSelf', {
              words: formatCompactCount(words, i18n.language),
              pages: formatCompactCount(pages, i18n.language),
            })
          : t('profile.creatorStats.headlineOther', {
              name: displayName,
              words: formatCompactCount(words, i18n.language),
              pages: formatCompactCount(pages, i18n.language),
            })}
      </p>
      {mixLabels.length > 0 ? (
        <p className="text-sm text-muted">
          {t('profile.creatorStats.mixLead', { types: mixLabels.join(' & ') })}
        </p>
      ) : null}
      {campaigns > 0 ? (
        <p className="text-xs text-muted">
          {t('profile.creatorStats.campaignsContributed', { count: campaigns })}
        </p>
      ) : null}
    </section>
  );
}

interface ProfileWritingTabProps {
  attribution: CreatorAttributionResponse | null;
}

export function ProfileWritingTab({ attribution }: ProfileWritingTabProps) {
  const { t, i18n } = useTranslation();

  if (!attribution) {
    return <p className="text-sm text-muted">{t('profile.creatorStats.emptyEarly')}</p>;
  }

  const rows = [
    'attribution.totalWordsCreated',
    'attribution.pagesCreated',
    'attribution.totalEdits',
    'attribution.charactersCreated',
    'attribution.locationsCreated',
    'attribution.organizationsCreated',
    'attribution.connectionsCreated',
    'attribution.campaignsContributedCount',
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('profile.creatorStats.writingIntro')}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((metricId) => {
          const value = attribution.metrics[metricId];
          const amount = readMetricAmount(value);
          if (amount == null && value?.status === 'unavailable') {
            return (
              <div key={metricId} className="rounded border border-border p-3">
                <dt className="text-xs text-muted">{t(`profile.creatorStats.metric.${metricId.replace('attribution.', '')}`)}</dt>
                <dd className="text-sm text-muted">{t('profile.creatorStats.notYetTracked')}</dd>
              </div>
            );
          }
          return (
            <div key={metricId} className="rounded border border-border p-3">
              <dt className="text-xs text-muted">
                {t(`profile.creatorStats.metric.${metricId.replace('attribution.', '')}`)}
              </dt>
              <dd className="text-lg font-semibold text-foreground">
                {formatCompactCount(amount ?? 0, i18n.language)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
