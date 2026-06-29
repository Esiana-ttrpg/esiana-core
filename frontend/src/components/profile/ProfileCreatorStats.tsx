import { type ReactNode } from 'react';
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
  metricId: string,
  value: CreatorAttributionResponse['metrics'][string] | undefined,
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

export function ProfileWritingTab({ attribution }: ProfileWritingTabProps) {
  const { t, i18n } = useTranslation();

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
    </div>
  );
}
