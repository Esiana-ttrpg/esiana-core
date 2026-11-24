import type { TFunction } from 'i18next';
import type { ShareSafeFinalCardModel } from './shareSafeFields';
import { STATS_CATEGORY_CSS_VAR } from '@/lib/statsCategoryPalette';
import {
  WRAPPED_EXPORT_HEIGHT,
  WRAPPED_EXPORT_WIDTH,
} from '@/lib/wrappedPngFeasibility';

/**
 * Share-safe final card composition. Never loads campaign artwork.
 * Sized for 1080×1920 capture when `exportMode` is true.
 */
export function WrappedFinalExportCard({
  model,
  t,
  locale,
  exportMode = false,
}: {
  model: ShareSafeFinalCardModel;
  t: TFunction;
  locale: string;
  exportMode?: boolean;
}) {
  const format = (n: number) =>
    new Intl.NumberFormat(locale, {
      notation: n >= 10_000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(n);

  return (
    <div
      data-wrapped-export-root={exportMode ? 'true' : undefined}
      className="relative overflow-hidden rounded-none border border-border bg-card text-foreground"
      style={{
        width: exportMode ? WRAPPED_EXPORT_WIDTH : '100%',
        height: exportMode ? WRAPPED_EXPORT_HEIGHT : undefined,
        minHeight: exportMode ? WRAPPED_EXPORT_HEIGHT : '28rem',
        backgroundImage:
          'linear-gradient(165deg, color-mix(in oklab, var(--stats-writing) 18%, var(--color-card)), var(--color-card) 55%, color-mix(in oklab, var(--stats-campaigns) 14%, var(--color-card)))',
      }}
    >
      <div
        className="flex h-full flex-col justify-between"
        style={{ padding: exportMode ? 72 : 24 }}
      >
        <div>
          <p
            className="uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontSize: exportMode ? 28 : 12 }}
          >
            Esiana
          </p>
          <h2
            className="mt-4 font-semibold leading-tight"
            style={{ fontSize: exportMode ? 64 : 28 }}
          >
            {t('profile.wrapped.title', { year: model.year })}
          </h2>
          <p
            className="mt-3 text-muted-foreground"
            style={{ fontSize: exportMode ? 32 : 14 }}
          >
            {t(`profile.wrapped.export.preset${capitalize(model.preset)}`)}
          </p>
        </div>

        <div className="grid gap-8">
          {model.fields.map((field, index) => (
            <div key={field.id}>
              <p
                className="font-semibold tracking-tight"
                style={{
                  fontSize: exportMode ? 96 : 36,
                  color:
                    index === 0
                      ? STATS_CATEGORY_CSS_VAR.writing
                      : index === 1
                        ? STATS_CATEGORY_CSS_VAR.campaigns
                        : STATS_CATEGORY_CSS_VAR.worldbuilding,
                }}
              >
                {format(field.value)}
              </p>
              <p
                className="text-muted-foreground"
                style={{ fontSize: exportMode ? 34 : 14 }}
              >
                {t(field.labelKey, { count: field.value })}
              </p>
            </div>
          ))}
        </div>

        <div>
          {model.coverageDisclosure.isPartialYearWriting &&
          model.coverageDisclosure.writingReliableFrom ? (
            <p
              className="text-muted-foreground"
              style={{ fontSize: exportMode ? 26 : 12 }}
            >
              {t('profile.wrapped.partialCoverage', {
                from: model.coverageDisclosure.writingReliableFrom.slice(0, 7),
              })}
            </p>
          ) : null}
          {model.dominantArchetype ? (
            <p
              className="mt-3 font-medium"
              style={{ fontSize: exportMode ? 30 : 14 }}
            >
              {t('profile.wrapped.slides.archetype', {
                archetype: t(
                  `profile.creatorstats.archetypes.${model.dominantArchetype}`,
                ),
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
