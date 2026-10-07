import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Flame, PenLine, UserRound, type LucideIcon } from 'lucide-react';
import type { CreatorAttributionResponse } from '@shared/statsTypes';
import { fetchOwnerCreatorAttribution } from '@/lib/statsApi';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';
import {
  buildHubStoryReflection,
  streakUnitForCount,
  type HubStoryMetricId,
} from '@/lib/buildHubStoryReflection';
import { HubSectionHeader } from '@/components/hub/HubSectionHeader';

interface HubStorySoFarProps {
  userId: string;
}

const METRIC_ICONS: Record<HubStoryMetricId, LucideIcon> = {
  streak: Flame,
  pagesCreated: BookOpen,
  characters: UserRound,
  wordsWritten: PenLine,
};

const METRIC_LABEL_KEYS: Record<HubStoryMetricId, string> = {
  streak: 'home.storySoFarStreak',
  pagesCreated: 'home.storySoFarPagesCreated',
  characters: 'home.storySoFarCharacters',
  wordsWritten: 'home.storySoFarWordsWritten',
};

export function HubStorySoFar({ userId }: HubStorySoFarProps) {
  const { t, i18n } = useTranslation();
  const [attribution, setAttribution] = useState<CreatorAttributionResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetchOwnerCreatorAttribution()
      .then((data) => {
        if (!cancelled) setAttribution(data);
      })
      .catch(() => {
        if (!cancelled) setAttribution(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!ready) return null;

  const reflection = buildHubStoryReflection(attribution);
  if (!reflection) return null;

  const reflectionHref = `/users/${userId}?tab=writing`;

  return (
    <section className="hub-section-surface space-y-3" aria-label={t('home.storySoFarTitle')}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <HubSectionHeader title={t('home.storySoFarTitle')} variant="page" size="sm" />
        <Link
          to={reflectionHref}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('home.storySoFarViewReflection')}
        </Link>
      </div>

      <div className="hub-story-strip" role="list">
        {reflection.metrics.map((metric, index) => {
          const Icon = METRIC_ICONS[metric.id];
          const unit =
            metric.id === 'streak'
              ? streakUnitForCount(metric.amount) === 'day'
                ? t('home.storySoFarStreakUnitDay')
                : t('home.storySoFarStreakUnitDays')
              : null;

          return (
            <div key={metric.id} className="hub-story-strip__item" role="listitem">
              {index > 0 ? <span className="hub-story-strip__rule" aria-hidden /> : null}
              <div className="hub-story-strip__metric">
                <Icon className="hub-story-strip__icon size-3.5" strokeWidth={1.5} aria-hidden />
                <div className="hub-story-strip__value-row">
                  <span className="hub-story-strip__value">
                    {formatCompactCount(metric.amount, i18n.language)}
                  </span>
                  {unit ? <span className="hub-story-strip__unit">{unit}</span> : null}
                </div>
                <span className="hub-story-strip__label">{t(METRIC_LABEL_KEYS[metric.id])}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
