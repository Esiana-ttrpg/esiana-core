import { useTranslation } from 'react-i18next';
import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';
import { CreativeStatisticsDashboard } from '@/components/profile/CreativeStatisticsDashboard';

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

export function ProfileWritingTab({
  attribution,
  displayName,
}: {
  attribution: CreatorAttributionResponse | null;
  displayName: string;
}) {
  return (
    <CreativeStatisticsDashboard
      attribution={attribution}
      displayName={displayName}
    />
  );
}
