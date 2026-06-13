import { Link } from 'react-router-dom';
import type { WorldDevelopmentStatusSummary } from '@shared/worldDevelopmentPresentation';
import { campaignSettingsPath } from '@/lib/campaignPaths';
import { platformGuidePath } from '@/lib/platformGuides';

interface WorldDevelopmentStatusCardProps {
  campaignHandle: string;
  status: WorldDevelopmentStatusSummary;
}

export function WorldDevelopmentStatusCard({
  campaignHandle,
  status,
}: WorldDevelopmentStatusCardProps) {
  const isOff = status.mode === 'off';

  if (isOff) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <h2 className="text-base font-semibold text-foreground">World Development</h2>
        <p className="mt-1 text-sm text-muted-foreground">{status.modeHeadline}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Enable living-world suggestions in Campaign Settings to review faction-driven
          developments here.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to={campaignSettingsPath(campaignHandle, 'world-development')}
            className="text-sm text-primary hover:underline"
          >
            Campaign Settings
          </Link>
          <Link
            to={platformGuidePath('world-development')}
            className="text-sm text-primary hover:underline"
          >
            Learn more
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
      <h2 className="text-base font-semibold text-foreground">World Development</h2>
      {status.paused ? (
        <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-muted-foreground">
          Development paused — unpause to generate new suggestions.
        </p>
      ) : null}
      <p className="mt-2 text-lg font-medium text-foreground">{status.modeHeadline}</p>
      <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <li>
          {status.pendingCount === 1
            ? '1 pending development'
            : `${status.pendingCount} pending developments`}
        </li>
        <li>
          {status.generatedThisCampaignMonth === 1
            ? '1 development generated this month'
            : `${status.generatedThisCampaignMonth} developments generated this month`}
        </li>
      </ul>
      <p className="mt-2 text-sm text-muted-foreground">
        World activity:{' '}
        <span className="font-medium text-foreground">{status.worldActivityLabel}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          to={campaignSettingsPath(campaignHandle, 'world-development')}
          className="text-sm text-primary hover:underline"
        >
          Campaign Settings
        </Link>
        <Link
          to={platformGuidePath('world-development')}
          className="text-sm text-primary hover:underline"
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}
