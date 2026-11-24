import { useMemo, useState } from 'react';
import type { PersonalArchetypeId, PersonalArchetypes, StatsCategory } from '@shared/statsTypes';
import { PERSONAL_ARCHETYPE_IDS } from '@shared/statsTypes';
import { i18n } from '@/i18n/initI18n';
import { STATS_CATEGORY_CSS_VAR } from '@/lib/statsCategoryPalette';
import { StatsChartFrame, StatsEmptyState } from './StatsChartFrame';

const AXIS_CATEGORY: Record<PersonalArchetypeId, StatsCategory> = {
  chronicler: 'writing',
  worldsmith: 'worldbuilding',
  cartographer: 'maps',
  timekeeper: 'chronology',
  storyweaver: 'campaigns',
  adventurer: 'campaigns',
  wanderer: 'campaigns',
};

/** Absolute L1-share gap at or below which two tendencies count as a pair. */
const DUAL_SCORE_GAP = 0.08;

type AxisPoint = {
  id: PersonalArchetypeId;
  label: string;
  description: string;
  angle: number;
  value: number | null;
  availability: 'measured' | 'unavailable';
  percentLabel: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'middle' | 'end';
  category: StatsCategory;
};

function toKeySuffix(id: PersonalArchetypeId): string {
  return `${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

function pairBlendKey(a: PersonalArchetypeId, b: PersonalArchetypeId): string {
  const [first, second] = [a, b].sort();
  return `profile.creatorstats.archetypeDualBlend${toKeySuffix(first)}${toKeySuffix(second)}`;
}

function textAnchorForAngle(angle: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angle);
  if (cos > 0.35) return 'start';
  if (cos < -0.35) return 'end';
  return 'middle';
}

function wedgePath(
  cx: number,
  cy: number,
  angle: number,
  halfSpan: number,
  radius: number,
): string {
  const inner = Math.max(radius, 1);
  const a0 = angle - halfSpan;
  const a1 = angle + halfSpan;
  const x0 = cx + Math.cos(a0) * inner;
  const y0 = cy + Math.sin(a0) * inner;
  const x1 = cx + Math.cos(a1) * inner;
  const y1 = cy + Math.sin(a1) * inner;
  const largeArc = halfSpan * 2 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${inner} ${inner} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

function buildAxisPoints(
  archetypes: PersonalArchetypes,
  t: (key: string, opts?: Record<string, unknown>) => string,
  size: number,
  radius: number,
): AxisPoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const labelRadius = radius + 36;
  const count = PERSONAL_ARCHETYPE_IDS.length;

  return PERSONAL_ARCHETYPE_IDS.map((id, index) => {
    const row = archetypes.scores.find((score) => score.id === id);
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const measured = row?.availability === 'measured' && row.score != null;
    const value = measured ? Math.max(0, Math.min(1, row.score ?? 0)) : null;
    return {
      id,
      label: t(`profile.creatorstats.archetypes.${id}`),
      description: t(`profile.creatorstats.archetypeDesc${toKeySuffix(id)}`),
      angle,
      value,
      availability: row?.availability ?? 'unavailable',
      percentLabel: value == null ? '—' : `${Math.round(value * 100)}%`,
      x: cx + Math.cos(angle) * radius * (value ?? 0),
      y: cy + Math.sin(angle) * radius * (value ?? 0),
      labelX: cx + Math.cos(angle) * labelRadius,
      labelY: cy + Math.sin(angle) * labelRadius,
      textAnchor: textAnchorForAngle(angle),
      category: AXIS_CATEGORY[id],
    } satisfies AxisPoint;
  });
}

function polygonPath(
  points: AxisPoint[],
  cx: number,
  cy: number,
): string {
  return points
    .map((point, index) => {
      const px = point.value == null ? cx : point.x;
      const py = point.value == null ? cy : point.y;
      return `${index === 0 ? 'M' : 'L'}${px} ${py}`;
    })
    .concat(['Z'])
    .join(' ');
}

export function CreativeTendenciesRadar({
  archetypes,
  previousArchetypes,
  currentPeriodLabel,
  previousPeriodLabel,
  t,
}: {
  archetypes: PersonalArchetypes | null | undefined;
  previousArchetypes?: PersonalArchetypes | null;
  currentPeriodLabel?: string | null;
  previousPeriodLabel?: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [activeId, setActiveId] = useState<PersonalArchetypeId | null>(null);
  const size = 320;
  const radius = 92;

  const points = useMemo(() => {
    if (!archetypes?.scores?.length) return [] as AxisPoint[];
    return buildAxisPoints(archetypes, t, size, radius);
  }, [archetypes, t]);

  const previousPoints = useMemo(() => {
    if (!previousArchetypes?.scores?.length) return [] as AxisPoint[];
    return buildAxisPoints(previousArchetypes, t, size, radius);
  }, [previousArchetypes, t]);

  const summary = useMemo(() => {
    const ranked = [...points]
      .filter((point) => point.value != null && point.value > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (ranked.length === 0) return null;

    const [primary, secondary] = ranked;
    const close =
      secondary != null &&
      primary.value != null &&
      secondary.value != null &&
      primary.value - secondary.value <= DUAL_SCORE_GAP;

    if (close && secondary) {
      const blendKey = pairBlendKey(primary.id, secondary.id);
      const blendText = i18n.exists(blendKey)
        ? t(blendKey)
        : t('profile.creatorstats.archetypesDualBlendFallback', {
            verbA: t(`profile.creatorstats.archetypeVerb${toKeySuffix(primary.id)}`),
            verbB: t(`profile.creatorstats.archetypeVerb${toKeySuffix(secondary.id)}`),
          });
      return {
        kind: 'dual' as const,
        headline: t('profile.creatorstats.archetypesDual', {
          nameA: primary.label,
          nameB: secondary.label,
        }),
        description: blendText,
        primaryId: primary.id,
        secondaryId: secondary.id,
      };
    }

    return {
      kind: 'single' as const,
      headline: t('profile.creatorstats.archetypesDominant', {
        name: primary.label,
      }),
      description: primary.description,
      primaryId: primary.id,
      secondaryId: null as PersonalArchetypeId | null,
    };
  }, [points, t]);

  if (!archetypes?.scores?.length || points.length === 0) {
    return <StatsEmptyState message={t('profile.creatorstats.archetypesEmpty')} />;
  }

  const cx = size / 2;
  const cy = size / 2;
  const levels = 4;
  const halfSpan = Math.PI / PERSONAL_ARCHETYPE_IDS.length;
  // Extra padding so long axis names (Cartographer, Adventurer) stay inside the viewBox.
  const pad = 56;
  const viewSize = size + pad * 2;
  const showPrevious =
    previousPoints.length > 0 &&
    previousPoints.some((point) => point.value != null && point.value > 0);
  const outline = polygonPath(points, cx, cy);
  const previousOutline = showPrevious ? polygonPath(previousPoints, cx, cy) : null;
  const activePoint = activeId ? points.find((point) => point.id === activeId) : null;

  return (
    <StatsChartFrame title={t('profile.creatorstats.archetypesSection')}>
      {summary ? (
        <div className="space-y-1" title={t('profile.creatorstats.archetypesTooltip')}>
          <p className="text-lg font-medium text-foreground">{summary.headline}</p>
          <p className="text-sm text-muted">{summary.description}</p>
        </div>
      ) : null}

      {showPrevious && currentPeriodLabel && previousPeriodLabel ? (
        <p className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-[var(--stats-writing)]" />
            {currentPeriodLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm border border-[var(--stats-worldbuilding)] bg-[var(--stats-worldbuilding)]/30" />
            {previousPeriodLabel}
          </span>
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-4">
        <svg
          role="img"
          aria-label={t('profile.creatorstats.archetypesSection')}
          viewBox={`${-pad} ${-pad} ${viewSize} ${viewSize}`}
          className="h-72 w-full max-w-md"
        >
          {Array.from({ length: levels }, (_, level) => {
            const r = (radius * (level + 1)) / levels;
            const ring = PERSONAL_ARCHETYPE_IDS.map((_, index) => {
              const angle =
                -Math.PI / 2 + (index / PERSONAL_ARCHETYPE_IDS.length) * Math.PI * 2;
              return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
            }).join(' ');
            return (
              <polygon
                key={level}
                points={ring}
                fill="none"
                stroke="var(--color-border, currentColor)"
                strokeOpacity={0.35}
              />
            );
          })}
          {points.map((point) => (
            <line
              key={`axis-${point.id}`}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(point.angle) * radius}
              y2={cy + Math.sin(point.angle) * radius}
              stroke="var(--color-border, currentColor)"
              strokeOpacity={0.35}
            />
          ))}

          {previousOutline ? (
            <path
              d={previousOutline}
              fill="var(--stats-worldbuilding)"
              fillOpacity={0.18}
              stroke="var(--stats-worldbuilding)"
              strokeOpacity={0.7}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              pointerEvents="none"
            >
              <title>
                {previousPeriodLabel
                  ? `${previousPeriodLabel}: ${t('profile.creatorstats.archetypesSection')}`
                  : t('profile.creatorstats.trendPrevious')}
              </title>
            </path>
          ) : null}

          {/* Multi-series fills: one colored wedge per archetype */}
          {points.map((point) =>
            point.value != null && point.value > 0 ? (
              <path
                key={`wedge-${point.id}`}
                d={wedgePath(cx, cy, point.angle, halfSpan * 0.92, radius * point.value)}
                fill={STATS_CATEGORY_CSS_VAR[point.category]}
                fillOpacity={activeId == null || activeId === point.id ? 0.45 : 0.16}
                stroke={STATS_CATEGORY_CSS_VAR[point.category]}
                strokeOpacity={activeId == null || activeId === point.id ? 0.95 : 0.3}
                strokeWidth={1.5}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform:
                    activeId === point.id ? 'scale(1.045)' : 'scale(1)',
                  transition:
                    'transform 160ms ease, fill-opacity 160ms ease, stroke-opacity 160ms ease',
                }}
                className="cursor-pointer"
                onMouseEnter={() => setActiveId(point.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(point.id)}
                onBlur={() => setActiveId(null)}
              >
                <title>{`${point.label}: ${point.percentLabel} — ${point.description}`}</title>
              </path>
            ) : null,
          )}

          <path
            d={outline}
            fill="var(--stats-writing)"
            fillOpacity={0.12}
            stroke="var(--color-focal-foreground, currentColor)"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeLinejoin="round"
            pointerEvents="none"
          />

          {points.map((point) =>
            point.value != null ? (
              <circle
                key={`dot-${point.id}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={STATS_CATEGORY_CSS_VAR[point.category]}
                stroke="var(--color-focal-elevated)"
                strokeWidth={activeId === point.id ? 2 : 0}
                style={{
                  transition: 'stroke-width 160ms ease',
                }}
                className="cursor-pointer"
                onMouseEnter={() => setActiveId(point.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                <title>{`${point.label}: ${point.percentLabel} — ${point.description}`}</title>
              </circle>
            ) : (
              <circle
                key={`gap-${point.id}`}
                cx={cx + Math.cos(point.angle) * radius * 0.12}
                cy={cy + Math.sin(point.angle) * radius * 0.12}
                r={3}
                fill="none"
                stroke="var(--color-recessed-foreground, var(--color-text-muted))"
                strokeDasharray="2 2"
              >
                <title>{`${point.label}: —`}</title>
              </circle>
            ),
          )}

          {points.map((point) => (
            <text
              key={`label-${point.id}`}
              x={point.labelX}
              y={point.labelY}
              textAnchor={point.textAnchor}
              dominantBaseline="middle"
              fill={
                point.availability === 'unavailable'
                  ? 'var(--color-recessed-foreground, var(--color-text-muted))'
                  : activeId != null && activeId !== point.id
                    ? 'var(--color-recessed-foreground, var(--color-text-muted))'
                    : 'var(--color-focal-foreground, currentColor)'
              }
              fontSize="11"
              fontWeight={500}
              opacity={activeId != null && activeId !== point.id ? 0.55 : 1}
              style={{ transition: 'opacity 160ms ease' }}
              className="cursor-pointer"
              onMouseEnter={() => setActiveId(point.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              {point.label}
              <title>{`${point.label}: ${point.percentLabel} — ${point.description}`}</title>
            </text>
          ))}
        </svg>

        {/* Reserved slot — never mounts/unmounts, so hover cannot shift the page. */}
        <p
          className="min-h-[2.75rem] max-w-md text-center text-sm text-muted"
          aria-live="polite"
        >
          {activePoint ? (
            <>
              <span className="font-medium text-foreground">{activePoint.label}</span>
              {' · '}
              {activePoint.percentLabel}
              {' — '}
              {activePoint.description}
            </>
          ) : (
            <span className="opacity-0 select-none">.</span>
          )}
        </p>
      </div>

      <ul className="space-y-2.5 border-t border-border/30 pt-3">
        {points.map((point) => {
          const emphasized =
            summary?.primaryId === point.id || summary?.secondaryId === point.id;
          return (
            <li
              key={point.id}
              className={`flex gap-3 rounded-md px-1 py-1 transition-colors ${
                activeId === point.id ? 'bg-border/20' : ''
              }`}
              onMouseEnter={() => setActiveId(point.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STATS_CATEGORY_CSS_VAR[point.category] }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-sm ${
                      emphasized ? 'font-medium text-foreground' : 'text-foreground'
                    }`}
                  >
                    {point.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {point.percentLabel}
                  </span>
                </div>
                <p className="text-xs text-muted">{point.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </StatsChartFrame>
  );
}
