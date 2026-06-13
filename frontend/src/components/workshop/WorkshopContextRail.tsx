import { Link } from 'react-router-dom';
import type { WorkshopDocument } from '@shared/workshopDocument';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { WorkshopWritingPulse } from './WorkshopWritingPulse';
import { WorkshopContinuityHints } from './WorkshopContinuityHints';

interface WorkshopContextRailProps {
  campaignHandle: string;
  draft: WorkshopDocument | null;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function WorkshopContextRail({
  campaignHandle,
  draft,
  collapsed = false,
  onToggleCollapsed,
}: WorkshopContextRailProps) {
  if (collapsed) {
    return (
      <aside className="hidden lg:flex lg:w-10 lg:shrink-0 lg:justify-center">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Show context rail"
        >
          ◀
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-full shrink-0 space-y-6 border-l border-border/40 pl-4 lg:block lg:max-w-[260px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Context</span>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Hide context rail"
          >
            ▶
          </button>
        ) : null}
      </div>

      <WorkshopWritingPulse campaignHandle={campaignHandle} />
      <WorkshopContinuityHints draft={draft} />

      <p className="text-xs text-muted-foreground">
        <Link to={campaignProgressionPath(campaignHandle, 'insights')} className="hover:text-primary">
          More in Insights →
        </Link>
      </p>
    </aside>
  );
}
