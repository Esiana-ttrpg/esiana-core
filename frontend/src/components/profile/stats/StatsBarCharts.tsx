import { STATS_CATEGORY_CSS_VAR } from '@/lib/statsCategoryPalette';
import type { StatsCategory } from '@shared/statsTypes';

export type NamedBar = {
  key: string;
  label: string;
  value: number;
  secondary?: number;
};

export function HorizontalBarChart({
  label,
  items,
  category,
  secondaryCategory,
  valueLabel,
  secondaryLabel,
}: {
  label: string;
  items: NamedBar[];
  category: StatsCategory;
  secondaryCategory?: StatsCategory;
  valueLabel?: string;
  secondaryLabel?: string;
}) {
  const max = Math.max(
    1,
    ...items.map((item) => Math.max(item.value, item.secondary ?? 0)),
  );
  const rowHeight = 28;
  const labelWidth = 108;
  const chartWidth = 360;
  const height = Math.max(rowHeight, items.length * rowHeight);

  return (
    <div className="space-y-2">
      {(valueLabel || secondaryLabel) && (
        <p className="flex flex-wrap gap-3 text-xs text-muted">
          {valueLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: STATS_CATEGORY_CSS_VAR[category] }}
              />
              {valueLabel}
            </span>
          ) : null}
          {secondaryLabel && secondaryCategory ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: STATS_CATEGORY_CSS_VAR[secondaryCategory] }}
              />
              {secondaryLabel}
            </span>
          ) : null}
        </p>
      )}
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="h-auto w-full"
      >
        {items.map((item, index) => {
          const y = index * rowHeight;
          const primaryWidth = (item.value / max) * (chartWidth - labelWidth - 8);
          const secondaryWidth =
            item.secondary != null
              ? (item.secondary / max) * (chartWidth - labelWidth - 8)
              : 0;
          return (
            <g key={item.key}>
              <text
                x={0}
                y={y + 14}
                fill="var(--color-recessed-foreground, var(--color-text-muted))"
                fontSize="11"
              >
                {item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label}
              </text>
              <rect
                x={labelWidth}
                y={y + 4}
                width={Math.max(primaryWidth, item.value > 0 ? 2 : 0)}
                height={8}
                rx={2}
                fill={STATS_CATEGORY_CSS_VAR[category]}
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </rect>
              {item.secondary != null ? (
                <rect
                  x={labelWidth}
                  y={y + 14}
                  width={Math.max(secondaryWidth, item.secondary > 0 ? 2 : 0)}
                  height={8}
                  rx={2}
                  fill={
                    STATS_CATEGORY_CSS_VAR[secondaryCategory ?? category]
                  }
                  opacity={0.7}
                >
                  <title>{`${item.label}: ${item.secondary}`}</title>
                </rect>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function VerticalColumnChart({
  label,
  items,
  category,
  previousCategory = 'worldbuilding',
  currentLabel,
  previousLabel,
}: {
  label: string;
  items: Array<{
    key: string;
    label: string;
    value: number;
    previous?: number;
    shortLabel?: string;
  }>;
  category: StatsCategory;
  previousCategory?: StatsCategory;
  currentLabel?: string;
  previousLabel?: string;
}) {
  const hasPrevious = items.some((item) => item.previous != null);
  const max = Math.max(
    1,
    ...items.map((item) => Math.max(item.value, item.previous ?? 0)),
  );
  const barWidth = hasPrevious ? 12 : 28;
  const pairGap = 3;
  const gap = hasPrevious ? 16 : 12;
  const chartHeight = 120;
  const labelBand = 28;
  const groupWidth = hasPrevious ? barWidth * 2 + pairGap : barWidth;
  const width = Math.max(200, items.length * (groupWidth + gap));

  return (
    <div className="space-y-2">
      {hasPrevious && currentLabel && previousLabel ? (
        <p className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: STATS_CATEGORY_CSS_VAR[category] }}
            />
            {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: STATS_CATEGORY_CSS_VAR[previousCategory] }}
            />
            {previousLabel}
          </span>
        </p>
      ) : null}
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${chartHeight + labelBand}`}
        className="h-40 w-full"
      >
        {items.map((item, index) => {
          const groupX = index * (groupWidth + gap) + 4;
          const barHeight = (item.value / max) * (chartHeight - 8);
          const y = chartHeight - barHeight;
          const prevValue = item.previous ?? 0;
          const prevHeight = (prevValue / max) * (chartHeight - 8);
          return (
            <g key={item.key}>
              {hasPrevious ? (
                <rect
                  x={groupX}
                  y={chartHeight - prevHeight}
                  width={barWidth}
                  height={Math.max(prevHeight, prevValue > 0 ? 2 : 0)}
                  rx={2}
                  fill={STATS_CATEGORY_CSS_VAR[previousCategory]}
                  fillOpacity={0.55}
                >
                  <title>
                    {`${item.label} · ${previousLabel ?? 'Previous'}: ${prevValue}`}
                  </title>
                </rect>
              ) : null}
              <rect
                x={hasPrevious ? groupX + barWidth + pairGap : groupX}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, item.value > 0 ? 2 : 0)}
                rx={3}
                fill={STATS_CATEGORY_CSS_VAR[category]}
              >
                <title>
                  {`${item.label}${currentLabel ? ` · ${currentLabel}` : ''}: ${item.value}`}
                </title>
              </rect>
              <text
                x={groupX + groupWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fill="var(--color-recessed-foreground, var(--color-text-muted))"
                fontSize="10"
              >
                {item.shortLabel ?? item.label.slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DistributionBars({
  label,
  items,
  category,
}: {
  label: string;
  items: Array<{ key: string; label: string; score: number }>;
  category: StatsCategory;
}) {
  const visible = items.filter((item) => item.score > 0);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-3" role="img" aria-label={label}>
      {visible.map((item) => {
        const pct = Math.round(item.score * 100);
        return (
          <div key={item.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{item.label}</span>
              <span className="text-muted">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full rounded-full transition-[width] duration-[var(--motion-duration)] ease-[var(--motion-ease)]"
                style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: STATS_CATEGORY_CSS_VAR[category],
                }}
                title={`${item.label}: ${pct}%`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AreaTrendChart({
  label,
  points,
  primaryKey,
  secondaryKey,
  primaryLabel,
  secondaryLabel,
  primaryCategory,
  secondaryCategory,
}: {
  label: string;
  points: Array<{
    date: string;
    primary: number;
    secondary: number;
    label?: string;
  }>;
  primaryKey: string;
  secondaryKey: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryCategory: StatsCategory;
  secondaryCategory: StatsCategory;
}) {
  const width = Math.max(320, points.length * 6);
  const height = 140;
  const padX = 12;
  const padY = 12;
  const max = Math.max(1, ...points.map((p) => Math.max(p.primary, p.secondary)));
  const xAt = (index: number) =>
    padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2);
  const yAt = (value: number) => height - padY - (value / max) * (height - padY * 2);

  const primaryPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index)} ${yAt(point.primary)}`)
    .join(' ');
  const secondaryPath = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${xAt(index)} ${yAt(point.secondary)}`,
    )
    .join(' ');

  return (
    <div className="space-y-2">
      <p className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: STATS_CATEGORY_CSS_VAR[primaryCategory] }}
          />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: STATS_CATEGORY_CSS_VAR[secondaryCategory] }}
          />
          {secondaryLabel}
        </span>
      </p>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full min-w-[20rem]"
        >
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="var(--color-border, currentColor)"
            strokeOpacity={0.35}
          />
          <path
            d={secondaryPath}
            fill="none"
            stroke={STATS_CATEGORY_CSS_VAR[secondaryCategory]}
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeOpacity={0.85}
          />
          <path
            d={primaryPath}
            fill="none"
            stroke={STATS_CATEGORY_CSS_VAR[primaryCategory]}
            strokeWidth="2.5"
          />
          {points.map((point, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={xAt(index)}
              cy={yAt(point.primary)}
              r={point.primary > 0 ? 2.5 : 0}
              fill={STATS_CATEGORY_CSS_VAR[primaryCategory]}
            >
              <title>
                {`${point.label ?? point.date}: ${primaryLabel} ${point.primary}, ${secondaryLabel} ${point.secondary}`}
              </title>
            </circle>
          ))}
          <title>{`${primaryKey}/${secondaryKey}: ${primaryLabel} and ${secondaryLabel}`}</title>
        </svg>
      </div>
    </div>
  );
}
