import { Link } from 'react-router-dom';
import type { WorldDevelopmentReadiness } from '@shared/worldDevelopmentPresentation';
import {
  campaignProgressionPath,
  campaignSettingsPath,
  campaignTimeTrackingPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface DevelopmentReadinessPanelProps {
  campaignHandle: string;
  readiness: WorldDevelopmentReadiness;
}

function issueReviewHref(
  campaignHandle: string,
  kind: WorldDevelopmentReadiness['issues'][number]['kind'],
): string {
  switch (kind) {
    case 'missing_trajectories':
    case 'no_pressure_signals':
      return campaignProgressionPath(campaignHandle, 'insights');
    case 'no_campaign_time':
      return campaignTimeTrackingPath(campaignHandle);
    case 'budget_exhausted':
      return campaignSettingsPath(campaignHandle, 'world-development');
    case 'mode_off':
      return campaignSettingsPath(campaignHandle, 'world-development');
    case 'world_pressure_paused':
      return campaignProgressionPath(campaignHandle, 'developments');
    default:
      return campaignProgressionPath(campaignHandle, 'insights');
  }
}

export function DevelopmentReadinessPanel({
  campaignHandle,
  readiness,
}: DevelopmentReadinessPanelProps) {
  const { flatPages } = useWiki();

  const primaryReviewHref = readiness.issues[0]
    ? issueReviewHref(campaignHandle, readiness.issues[0].kind)
    : campaignProgressionPath(campaignHandle, 'insights');

  return (
    <details
      open={!readiness.healthy}
      className="rounded-lg border border-border/60 bg-background/30"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        {readiness.healthy ? (
          <span className="text-muted-foreground">✓ Development readiness healthy</span>
        ) : (
          <span>⚠ Development readiness needs attention</span>
        )}
      </summary>
      {!readiness.healthy ? (
        <div className="border-t border-border/50 px-4 pb-4 pt-2">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {readiness.issues
              .filter(
                (issue) =>
                  issue.kind !== 'missing_trajectories' ||
                  readiness.missingTrajectoryOrgs.length === 0,
              )
              .map((issue) => (
                <li key={issue.kind}>
                  <Link
                    to={issueReviewHref(campaignHandle, issue.kind)}
                    className="hover:text-primary hover:underline"
                  >
                    {issue.message}
                  </Link>
                </li>
              ))}
            {readiness.missingTrajectoryOrgs.map((org) => (
              <li key={org.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, org.id, flatPages)}
                  className="hover:text-primary hover:underline"
                >
                  {org.title} — missing trajectory
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={primaryReviewHref}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Review →
          </Link>
        </div>
      ) : null}
    </details>
  );
}
