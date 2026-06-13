import { Link } from 'react-router-dom';
import {
  AGE_TRENDS_LABEL,
  NEAR_FUTURE_FORECAST_LABEL,
  PROJECTED_BY_NEXT_SESSION_LABEL,
  WORLD_PRESSURE_PAUSED_MESSAGE,
} from '@shared/worldPressurePresentation';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import type { DashboardSessionSummary } from '@/lib/dashboardSummary';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { TYPE_META_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

type WorldPressurePreview = NonNullable<DashboardSummary['worldPressurePreview']>;

interface WorldPressureForecastListProps {
  bullets: string[];
  className?: string;
}

export function WorldPressureForecastList({
  bullets,
  className = `${TYPE_PROSE_CLASS} list-disc space-y-1 pl-5 text-sm text-focal-muted`,
}: WorldPressureForecastListProps) {
  if (bullets.length === 0) return null;
  return (
    <ul className={className}>
      {bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </ul>
  );
}

interface WorldPressureForecastContentProps {
  campaignHandle: string;
  preview: WorldPressurePreview;
  nextSession?: DashboardSessionSummary | null;
  nextSessionInDays?: number | null;
  /** Stream uses focal tokens; widget uses muted dashboard tokens */
  tone?: 'focal' | 'widget';
}

function formatProjectedByNextSessionLabel(daysUntil: number): string {
  const dayLabel = daysUntil === 1 ? 'day' : 'days';
  return `${PROJECTED_BY_NEXT_SESSION_LABEL} (${daysUntil} ${dayLabel})`;
}

export function WorldPressureForecastContent({
  campaignHandle,
  preview,
  nextSession = null,
  nextSessionInDays = null,
  tone = 'focal',
}: WorldPressureForecastContentProps) {
  const metaClass =
    tone === 'focal' ? `${TYPE_META_CLASS} text-focal-muted` : 'text-xs text-muted';
  const proseClass =
    tone === 'focal'
      ? `${TYPE_PROSE_CLASS} text-sm text-focal-foreground`
      : 'text-sm text-foreground';
  const mutedProseClass =
    tone === 'focal'
      ? `${TYPE_PROSE_CLASS} list-disc space-y-1 pl-5 text-sm text-focal-muted`
      : 'list-disc space-y-1 pl-5 text-sm text-muted';

  const progressionLink = (
    <Link
      to={campaignProgressionPath(campaignHandle, 'insights')}
      className="text-xs text-primary hover:underline"
    >
      Progression › Trajectories
    </Link>
  );

  if (preview.paused) {
    return (
      <div className="space-y-1.5">
        <p className={tone === 'focal' ? `${TYPE_PROSE_CLASS} text-sm text-focal-muted` : 'text-sm text-muted'}>
          {WORLD_PRESSURE_PAUSED_MESSAGE}
        </p>
        {progressionLink}
      </div>
    );
  }

  const hasSessionProjection =
    nextSession != null && preview.projectedByNextSession != null;
  const nearFutureBullets =
    preview.nearFutureBullets.length > 0
      ? preview.nearFutureBullets
      : preview.eraTrends.slice(0, 3);

  return (
    <div className="space-y-3">
      {hasSessionProjection ? (
        <div className="space-y-1.5">
          <p className={proseClass}>
            <span className="font-medium">{nextSession.title}</span>
            {nextSession.plannedStartAt ? (
              <span className={tone === 'focal' ? 'text-focal-muted' : 'text-muted'}>
                {' '}
                —{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(nextSession.plannedStartAt))}
              </span>
            ) : null}
          </p>
          <p className={metaClass}>
            {formatProjectedByNextSessionLabel(
              preview.projectedByNextSession!.daysUntil ??
                nextSessionInDays ??
                0,
            )}
            {preview.eraName ? ` · ${preview.eraName}` : ''}
          </p>
          <WorldPressureForecastList
            bullets={preview.projectedByNextSession!.bullets}
            className={mutedProseClass}
          />
        </div>
      ) : nearFutureBullets.length > 0 ? (
        <div className="space-y-1.5">
          <p className={metaClass}>
            {NEAR_FUTURE_FORECAST_LABEL}
            {preview.eraName ? ` · ${preview.eraName}` : ''}
          </p>
          <WorldPressureForecastList bullets={nearFutureBullets} className={mutedProseClass} />
        </div>
      ) : preview.eraTrends.length > 0 ? (
        <div className="space-y-1.5">
          <p className={metaClass}>
            {AGE_TRENDS_LABEL}
            {preview.eraName ? ` · ${preview.eraName}` : ''}
          </p>
          <WorldPressureForecastList bullets={preview.eraTrends} className={mutedProseClass} />
        </div>
      ) : null}
      {progressionLink}
    </div>
  );
}
