import type { PersonalStatisticsResponse } from '@shared/statsTypes';
import { readMetricAmount } from '@shared/metricValue';
import { formatCompactCount } from '@/lib/metricDisplayPolicy';
import { FOCAL_ELEVATED_CLASS, TYPE_META_CLASS } from '@/lib/surfaceLayout';
import {
  comparePeriodAmounts,
  formatShortPeriodWindowLabel,
  type PeriodComparison,
} from '@/lib/previousStatisticsRange';
import { formatMetricValue } from './statsMetricFormat';

function comparisonLabel(
  comparison: PeriodComparison,
  previousShortLabel: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { text: string; tone: 'up' | 'down' | 'neutral' } | null {
  if (comparison.kind === 'same') return null;
  if (comparison.kind === 'first') {
    return {
      text: t('profile.creatorstats.comparisonFirst'),
      tone: 'neutral',
    };
  }
  if (comparison.kind === 'absolute') {
    if (comparison.delta === 0) return null;
    if (!previousShortLabel) return null;
    const sign = comparison.delta > 0 ? '+' : '';
    return {
      text: t('profile.creatorstats.comparisonAbsoluteVs', {
        delta: `${sign}${comparison.delta}`,
        period: previousShortLabel,
      }),
      tone: comparison.delta > 0 ? 'up' : 'down',
    };
  }
  const rounded = Math.round(comparison.deltaPct);
  if (rounded === 0) return null;
  if (!previousShortLabel) return null;
  const sign = rounded > 0 ? '+' : '';
  return {
    text: t('profile.creatorstats.comparisonPercentVs', {
      delta: `${sign}${rounded}`,
      period: previousShortLabel,
    }),
    tone: rounded > 0 ? 'up' : 'down',
  };
}

const CARD_CLASS = `${FOCAL_ELEVATED_CLASS} flex min-h-[7.5rem] flex-col justify-between gap-2 rounded-lg border border-border p-4`;

export function PeriodHeadlineCards({
  current,
  previous,
  locale,
  t,
}: {
  current: PersonalStatisticsResponse;
  previous: PersonalStatisticsResponse | null;
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (current.range.mode === 'all_time') {
    return null;
  }

  const previousShortLabel = previous
    ? formatShortPeriodWindowLabel({
        mode: current.range.mode,
        start: previous.range.start,
        end: previous.range.end,
        timeZone: current.timeZone,
        locale,
      })
    : null;

  const words = readMetricAmount(current.period['period.wordsAdded']);
  const pagesEdited = readMetricAmount(current.period['period.pagesEdited']);
  const activeDays =
    current.visualizations?.heatmap.filter(
      (day) => day.wordsAdded > 0 || day.sessionCount > 0,
    ).length ?? null;
  const sessions = current.visualizations?.sessions.length ?? null;

  const prevWords = previous
    ? readMetricAmount(previous.period['period.wordsAdded'])
    : null;
  const prevPages = previous
    ? readMetricAmount(previous.period['period.pagesEdited'])
    : null;
  const prevActiveDays = previous?.visualizations
    ? previous.visualizations.heatmap.filter(
        (day) => day.wordsAdded > 0 || day.sessionCount > 0,
      ).length
    : null;
  const prevSessions = previous?.visualizations?.sessions.length ?? null;

  const cards = [
    {
      key: 'words',
      label: t('profile.creatorstats.periodWordsWritten'),
      value: formatMetricValue(current.period['period.wordsAdded'], locale, t),
      comparison: comparePeriodAmounts(words, prevWords),
    },
    {
      key: 'pages',
      label: t('profile.creatorstats.periodPagesEdited'),
      value:
        pagesEdited == null
          ? formatMetricValue(current.period['period.pagesEdited'], locale, t)
          : {
              display: formatCompactCount(pagesEdited, locale),
              tone: 'value' as const,
              detail: null,
            },
      comparison: comparePeriodAmounts(pagesEdited, prevPages),
    },
    {
      key: 'days',
      label: t('profile.creatorstats.periodActiveDays'),
      value: {
        display: activeDays == null ? '—' : formatCompactCount(activeDays, locale),
        tone: activeDays == null ? ('unavailable' as const) : ('value' as const),
        detail: null,
      },
      comparison: comparePeriodAmounts(activeDays, prevActiveDays),
    },
    {
      key: 'sessions',
      label: t('profile.creatorstats.periodSessions'),
      value: {
        display: sessions == null ? '—' : formatCompactCount(sessions, locale),
        tone: sessions == null ? ('unavailable' as const) : ('value' as const),
        detail: null,
      },
      comparison: comparePeriodAmounts(sessions, prevSessions),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const delta = card.comparison
          ? comparisonLabel(card.comparison, previousShortLabel, t)
          : null;
        return (
          <article key={card.key} className={CARD_CLASS}>
            <p className={`${TYPE_META_CLASS} text-muted`}>{card.label}</p>
            <p
              className={`text-3xl tracking-tight ${
                card.value.tone === 'unavailable' ? 'text-muted' : 'text-foreground'
              }`}
            >
              {card.value.display}
            </p>
            {delta ? (
              <p
                className={`text-xs ${
                  delta.tone === 'up'
                    ? 'text-success'
                    : delta.tone === 'down'
                      ? 'text-danger'
                      : 'text-muted'
                }`}
              >
                {delta.text}
              </p>
            ) : (
              <p className="text-xs text-transparent select-none" aria-hidden>
                —
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
