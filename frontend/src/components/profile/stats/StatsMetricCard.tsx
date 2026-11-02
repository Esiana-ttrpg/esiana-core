import type { MetricValue } from '@shared/metricValue';
import { FOCAL_ELEVATED_CLASS, TYPE_META_CLASS } from '@/lib/surfaceLayout';
import { formatMetricValue } from './statsMetricFormat';

export function StatsMetricCard({
  label,
  description,
  value,
  locale,
  t,
  displayOverride,
}: {
  label: string;
  description?: string;
  value?: MetricValue;
  /** @deprecated Kept for call-site compatibility; no longer drives accents. */
  category?: string;
  locale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  displayOverride?: string;
}) {
  const formatted = formatMetricValue(value, locale, t);
  const display = displayOverride ?? formatted.display;
  const unavailable = formatted.tone === 'unavailable';

  return (
    <article
      className={`${FOCAL_ELEVATED_CLASS} flex min-h-[7.5rem] flex-col justify-between gap-2 rounded-lg border border-border p-4`}
    >
      <div className="space-y-1">
        <p className={`${TYPE_META_CLASS} text-muted`}>{label}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <p className={`text-2xl tracking-tight ${unavailable ? 'text-muted' : 'text-foreground'}`}>
        {display}
      </p>
    </article>
  );
}
