import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { readMetricAmount } from '@shared/metricValue';
import type { WrappedYearResponse } from '@shared/wrappedTypes';
import { STATS_CATEGORY_CSS_VAR } from '@/lib/statsCategoryPalette';
import { buildCampaignGradientStyle } from '@/lib/campaignCardPresentation';
import {
  HUB_ARTWORK_FOREGROUND,
  HUB_ARTWORK_FOREGROUND_MUTED,
} from '@/lib/buildCampaignWorldPresentation';
import { formatCompactCount, monthLabel } from './formatWrappedMetric';

export type WrappedSlideProps = {
  data: WrappedYearResponse;
  t: TFunction;
  locale: string;
  reducedMotion: boolean;
};

function MetricBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="space-y-1">
      <p
        className="text-4xl font-semibold tracking-tight sm:text-5xl"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SlideShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function YearIntroSlide({ data, t }: WrappedSlideProps) {
  const disclosure = data.calculation.coverageDisclosure;
  return (
    <SlideShell
      eyebrow={
        data.edition === 'preview'
          ? t('profile.wrapped.yearInProgress')
          : t('profile.wrapped.completed')
      }
      title={t('profile.wrapped.title', { year: data.year })}
    >
      <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
        {t('profile.wrapped.slides.summaryLead')}
      </p>
      {disclosure.isPartialYearWriting && disclosure.writingReliableFrom ? (
        <p className="text-sm text-muted-foreground">
          {t('profile.wrapped.partialCoverage', {
            from: disclosure.writingReliableFrom.slice(0, 7),
          })}
        </p>
      ) : null}
    </SlideShell>
  );
}

function WorldsExploredSlide({ data, t, locale }: WrappedSlideProps) {
  const count =
    Object.keys(data.calculation.metrics.byCampaign).length ||
    readMetricAmount(data.calculation.metrics.participation.campaignsParticipated) ||
    0;
  return (
    <SlideShell title={t('profile.wrapped.slides.worldsExplored')}>
      <MetricBlock
        label={t('profile.wrapped.slides.campaignsCount', { count })}
        value={formatCompactCount(
          { status: 'value', amount: count },
          locale,
        ) ?? String(count)}
        accent={STATS_CATEGORY_CSS_VAR.campaigns}
      />
    </SlideShell>
  );
}

function AdventureLogSlide({ data, t, locale }: WrappedSlideProps) {
  const attended = formatCompactCount(
    data.calculation.metrics.participation.sessionsAttended,
    locale,
  );
  const hosted = formatCompactCount(
    data.calculation.metrics.participation.sessionsHosted,
    locale,
  );
  return (
    <SlideShell title={t('profile.wrapped.slides.adventureLog')}>
      <div className="grid gap-6">
        {attended ? (
          <MetricBlock
            label={t('profile.wrapped.slides.sessionsAttended', {
              count: readMetricAmount(
                data.calculation.metrics.participation.sessionsAttended,
              ),
            })}
            value={attended}
            accent={STATS_CATEGORY_CSS_VAR.campaigns}
          />
        ) : null}
        {hosted ? (
          <MetricBlock
            label={t('profile.wrapped.slides.sessionsHosted', {
              count: readMetricAmount(
                data.calculation.metrics.participation.sessionsHosted,
              ),
            })}
            value={hosted}
            accent={STATS_CATEGORY_CSS_VAR.chronology}
          />
        ) : null}
      </div>
    </SlideShell>
  );
}

function CreativeLegacySlide({ data, t, locale }: WrappedSlideProps) {
  const words = formatCompactCount(
    data.calculation.metrics.personal['period.wordsAdded'],
    locale,
  );
  const pages = formatCompactCount(
    data.calculation.metrics.personal['period.pagesCreated'],
    locale,
  );
  const edits = formatCompactCount(
    data.calculation.metrics.personal['period.pagesEdited'],
    locale,
  );
  return (
    <SlideShell title={t('profile.wrapped.slides.creativeLegacy')}>
      <div className="grid gap-6">
        {words ? (
          <MetricBlock
            label={t('profile.wrapped.slides.wordsWritten', {
              count: readMetricAmount(
                data.calculation.metrics.personal['period.wordsAdded'],
              ),
            })}
            value={words}
            accent={STATS_CATEGORY_CSS_VAR.writing}
          />
        ) : null}
        {pages ? (
          <MetricBlock
            label={t('profile.wrapped.slides.pagesCreated', {
              count: readMetricAmount(
                data.calculation.metrics.personal['period.pagesCreated'],
              ),
            })}
            value={pages}
            accent={STATS_CATEGORY_CSS_VAR.worldbuilding}
          />
        ) : null}
        {edits ? (
          <MetricBlock
            label={t('profile.wrapped.slides.pagesEdited', {
              count: readMetricAmount(
                data.calculation.metrics.personal['period.pagesEdited'],
              ),
            })}
            value={edits}
          />
        ) : null}
      </div>
    </SlideShell>
  );
}

function TopCampaignSlide({ data, t }: WrappedSlideProps) {
  const top = data.calculation.topCampaign;
  const presentation = top
    ? data.presentation.campaigns[top.campaignId]
    : null;
  if (!top || !presentation?.authorized) {
    return (
      <SlideShell title={t('profile.wrapped.slides.topCampaign')}>
        <p className="text-muted-foreground">{t('profile.wrapped.unavailable')}</p>
      </SlideShell>
    );
  }
  const fallback = buildCampaignGradientStyle(presentation.handle || presentation.id);
  return (
    <SlideShell title={t('profile.wrapped.slides.topCampaign')}>
      <div
        className="relative overflow-hidden rounded-xl border border-border"
        style={{ minHeight: '14rem', ...(!presentation.coverImageUrl ? fallback : {}) }}
      >
        {presentation.coverImageUrl ? (
          <img
            src={presentation.coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative flex h-full min-h-[14rem] flex-col justify-end p-5">
          <p className="text-2xl font-semibold" style={{ color: HUB_ARTWORK_FOREGROUND }}>
            {presentation.name}
          </p>
          <p className="text-sm" style={{ color: HUB_ARTWORK_FOREGROUND_MUTED }}>
            {t('profile.wrapped.slides.topCampaignWhy', {
              days: top.activeDays,
              contributions: top.contributions,
            })}
          </p>
        </div>
      </div>
    </SlideShell>
  );
}

function WritingRhythmSlide({ data, t, locale, reducedMotion }: WrappedSlideProps) {
  const months = data.calculation.monthlyActivity;
  const max = Math.max(1, ...months.map((m) => m.activeDays));
  return (
    <SlideShell title={t('profile.wrapped.slides.writingRhythm')}>
      <div className="grid grid-cols-12 items-end gap-1" aria-hidden="true">
        {months.map((m) => (
          <div
            key={m.month}
            className="rounded-sm"
            style={{
              height: `${Math.max(8, (m.activeDays / max) * 120)}px`,
              background: STATS_CATEGORY_CSS_VAR.writing,
              opacity: m.activeDays > 0 ? 0.9 : 0.2,
              transition: reducedMotion ? undefined : 'height 400ms ease',
            }}
            title={monthLabel(m.month, locale)}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('profile.wrapped.slides.activeDays', {
          count: months.reduce((sum, m) => sum + m.activeDays, 0),
        })}
      </p>
    </SlideShell>
  );
}

function WorldBuildSlide({ data, t, locale }: WrappedSlideProps) {
  const characters = formatCompactCount(
    data.calculation.metrics.personal['period.charactersCreated'],
    locale,
  );
  const locations = formatCompactCount(
    data.calculation.metrics.personal['period.locationsCreated'],
    locale,
  );
  const pages = formatCompactCount(
    data.calculation.metrics.personal['period.pagesCreated'],
    locale,
  );
  return (
    <SlideShell title={t('profile.wrapped.slides.worldYouHelpedBuild')}>
      <div className="grid gap-5">
        {characters ? (
          <MetricBlock
            label={t('profile.creatorstats.charactersCreated')}
            value={characters}
            accent={STATS_CATEGORY_CSS_VAR.worldbuilding}
          />
        ) : null}
        {locations ? (
          <MetricBlock
            label={t('profile.creatorstats.locationsCreated')}
            value={locations}
            accent={STATS_CATEGORY_CSS_VAR.maps}
          />
        ) : null}
        {pages ? (
          <MetricBlock
            label={t('profile.wrapped.slides.pagesCreated', {
              count: readMetricAmount(
                data.calculation.metrics.personal['period.pagesCreated'],
              ),
            })}
            value={pages}
          />
        ) : null}
      </div>
    </SlideShell>
  );
}

function BiggestMonthSlide({ data, t, locale }: WrappedSlideProps) {
  const peak = data.calculation.biggestMonth;
  if (!peak) {
    return (
      <SlideShell title={t('profile.wrapped.slides.biggestMonth')}>
        <p className="text-muted-foreground">{t('profile.wrapped.unavailable')}</p>
      </SlideShell>
    );
  }
  return (
    <SlideShell title={t('profile.wrapped.slides.biggestMonth')}>
      <MetricBlock
        label={t('profile.wrapped.slides.monthPeak', {
          month: monthLabel(peak.month, locale),
        })}
        value={monthLabel(peak.month, locale)}
        accent={STATS_CATEGORY_CSS_VAR.writing}
      />
      <p className="text-sm text-muted-foreground">
        {t('profile.wrapped.slides.activeDays', { count: peak.activeDays })} ·{' '}
        {t('profile.wrapped.slides.contributions', { count: peak.contributions })}
      </p>
    </SlideShell>
  );
}

function FellowAdventurersSlide({ data, t, locale }: WrappedSlideProps) {
  const fellows = formatCompactCount(
    data.calculation.metrics.shared.fellowAdventurerCount,
    locale,
  );
  return (
    <SlideShell title={t('profile.wrapped.slides.fellowAdventurers')}>
      {fellows ? (
        <MetricBlock
          label={t('profile.wrapped.slides.fellowsCount', {
            count: readMetricAmount(
              data.calculation.metrics.shared.fellowAdventurerCount,
            ),
          })}
          value={fellows}
          accent={STATS_CATEGORY_CSS_VAR.campaigns}
        />
      ) : (
        <p className="text-muted-foreground">{t('profile.wrapped.unavailable')}</p>
      )}
    </SlideShell>
  );
}

function YearComparedSlide({ data, t, locale }: WrappedSlideProps) {
  const words = formatCompactCount(
    data.calculation.metrics.comparative.deltas['period.wordsAdded'],
    locale,
  );
  const pages = formatCompactCount(
    data.calculation.metrics.comparative.deltas['period.pagesCreated'],
    locale,
  );
  return (
    <SlideShell title={t('profile.wrapped.slides.yearCompared')}>
      <p className="text-sm text-muted-foreground">
        vs {data.calculation.metrics.comparative.previousYear}
      </p>
      <div className="grid gap-5">
        {words ? (
          <MetricBlock
            label={t('profile.wrapped.slides.wordsWritten', {
              count: readMetricAmount(
                data.calculation.metrics.comparative.deltas['period.wordsAdded'],
              ),
            })}
            value={words}
            accent={STATS_CATEGORY_CSS_VAR.writing}
          />
        ) : null}
        {pages ? (
          <MetricBlock
            label={t('profile.wrapped.slides.pagesCreated', {
              count: readMetricAmount(
                data.calculation.metrics.comparative.deltas['period.pagesCreated'],
              ),
            })}
            value={pages}
          />
        ) : null}
      </div>
    </SlideShell>
  );
}

function SignatureSlide({ data, t }: WrappedSlideProps) {
  const dominant = data.calculation.archetypes?.dominantId;
  return (
    <SlideShell title={t('profile.wrapped.slides.signatureAchievement')}>
      {dominant ? (
        <p className="text-2xl font-semibold sm:text-3xl">
          {t('profile.wrapped.slides.archetype', {
            archetype: t(`profile.creatorstats.archetypes.${dominant}`),
          })}
        </p>
      ) : (
        <p className="text-muted-foreground">{t('profile.wrapped.slides.summaryLead')}</p>
      )}
    </SlideShell>
  );
}

function YearSummarySlide({ data, t, locale }: WrappedSlideProps) {
  const words = formatCompactCount(
    data.calculation.metrics.personal['period.wordsAdded'],
    locale,
  );
  const sessions = formatCompactCount(
    data.calculation.metrics.participation.sessionsAttended,
    locale,
  );
  const worlds = Object.keys(data.calculation.metrics.byCampaign).length;
  return (
    <SlideShell title={t('profile.wrapped.slides.yearSummary')}>
      <p className="text-lg text-muted-foreground">{t('profile.wrapped.slides.summaryLead')}</p>
      <div className="grid grid-cols-2 gap-6">
        <MetricBlock
          label={t('profile.wrapped.slides.campaignsCount', { count: worlds })}
          value={String(worlds)}
          accent={STATS_CATEGORY_CSS_VAR.campaigns}
        />
        {sessions ? (
          <MetricBlock
            label={t('profile.wrapped.slides.sessionsAttended', {
              count: readMetricAmount(
                data.calculation.metrics.participation.sessionsAttended,
              ),
            })}
            value={sessions}
          />
        ) : null}
        {words ? (
          <MetricBlock
            label={t('profile.wrapped.slides.wordsWritten', {
              count: readMetricAmount(
                data.calculation.metrics.personal['period.wordsAdded'],
              ),
            })}
            value={words}
            accent={STATS_CATEGORY_CSS_VAR.writing}
          />
        ) : null}
      </div>
    </SlideShell>
  );
}

/**
 * Visualization component registry keyed by shared slide `visualization` id.
 * Frontend must not independently decide which slides qualify — only render
 * the backend-provided manifest.
 */
export const WRAPPED_VISUALIZATION_REGISTRY: Record<
  string,
  (props: WrappedSlideProps) => ReactNode
> = {
  'year-intro': YearIntroSlide,
  'worlds-explored': WorldsExploredSlide,
  'adventure-log': AdventureLogSlide,
  'creative-legacy': CreativeLegacySlide,
  'top-campaign': TopCampaignSlide,
  'writing-rhythm': WritingRhythmSlide,
  'world-you-helped-build': WorldBuildSlide,
  'biggest-month': BiggestMonthSlide,
  'fellow-adventurers': FellowAdventurersSlide,
  'year-compared': YearComparedSlide,
  'signature-achievement': SignatureSlide,
  'year-summary': YearSummarySlide,
};
