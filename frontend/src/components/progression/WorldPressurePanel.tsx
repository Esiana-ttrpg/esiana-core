import { Link } from 'react-router-dom';
import type { WorldPressureProjection } from '@shared/worldPressureProjection';
import {
  AGE_TRENDS_LABEL,
  BREWING_CONFLICTS_LABEL,
  WORLD_PRESSURE_PAUSED_MESSAGE,
} from '@shared/worldPressurePresentation';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface WorldPressurePanelProps {
  campaignHandle: string;
  projection: WorldPressureProjection;
  missingTrajectoryOrgs: Array<{ id: string; title: string }>;
  worldPressurePaused?: boolean;
}

export function WorldPressurePanel({
  campaignHandle,
  projection,
  missingTrajectoryOrgs,
  worldPressurePaused = false,
}: WorldPressurePanelProps) {
  const { flatPages } = useWiki();

  return (
    <div className="space-y-6">
      {worldPressurePaused ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-muted-foreground">
          {WORLD_PRESSURE_PAUSED_MESSAGE}
        </p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Current era:{' '}
          <span className="font-medium text-foreground">{projection.currentEra.name}</span>
        </p>
      </div>

      {projection.risingTensions.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{BREWING_CONFLICTS_LABEL}</h3>
          <ul className="space-y-2">
            {projection.risingTensions.map((line) => (
              <li
                key={line.orgPageId}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2"
              >
                <Link
                  to={campaignWikiPath(campaignHandle, line.orgPageId, flatPages)}
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  {line.orgTitle}
                </Link>
                <span className="text-sm text-muted-foreground"> — {line.momentumLabel}</span>
                {line.bullets.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {line.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          No brewing conflicts yet — assign era trajectories to organizations to shape what emerges.
        </p>
      )}

      {projection.eraTrends.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{AGE_TRENDS_LABEL}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {projection.eraTrends.map((trend) => (
              <li key={trend}>{trend}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {projection.nearFutureBullets.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Near-future forecast</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {projection.nearFutureBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {projection.projectedByNextSession ? (
        <section className="space-y-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <h3 className="text-sm font-medium text-foreground">
            Projected by next session
            <span className="ml-2 font-normal text-muted-foreground">
              ({projection.projectedByNextSession.daysUntil} days)
            </span>
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {projection.projectedByNextSession.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {missingTrajectoryOrgs.length > 0 ? (
        <section className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <h3 className="text-sm font-medium text-foreground">Missing trajectories</h3>
          <p className="text-xs text-muted-foreground">
            These factions have no trajectory for the current era:
          </p>
          <ul className="flex flex-wrap gap-2">
            {missingTrajectoryOrgs.map((org) => (
              <li key={org.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, org.id, flatPages)}
                  className="rounded border border-border px-2 py-0.5 text-xs text-foreground hover:border-primary/40"
                >
                  {org.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
