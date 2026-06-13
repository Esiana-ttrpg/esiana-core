import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NarrativePressureItem } from '@/lib/sceneMetadata';

export interface CampaignPulseData {
  activeArcCount?: number;
  unresolvedCount?: number;
  recentDiscoveryCount?: number;
  pressureSignals?: NarrativePressureItem[];
}

interface CampaignPulseProps {
  data: CampaignPulseData;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function buildPulseSegments(data: CampaignPulseData): string[] {
  const segments: string[] = [];
  if (data.activeArcCount != null && data.activeArcCount > 0) {
    segments.push(
      `${data.activeArcCount} active arc${data.activeArcCount === 1 ? '' : 's'}`,
    );
  }
  if (data.unresolvedCount != null && data.unresolvedCount > 0) {
    segments.push(
      `${data.unresolvedCount} unresolved thread${data.unresolvedCount === 1 ? '' : 's'}`,
    );
  }
  if (data.recentDiscoveryCount != null && data.recentDiscoveryCount > 0) {
    segments.push(
      `${data.recentDiscoveryCount} recent discover${data.recentDiscoveryCount === 1 ? 'y' : 'ies'}`,
    );
  }
  return segments;
}

export function CampaignPulse({ data, collapsed, onToggleCollapsed }: CampaignPulseProps) {
  const segments = buildPulseSegments(data);
  const topPressure = data.pressureSignals?.[0]?.message;

  if (segments.length === 0 && !topPressure) {
    return null;
  }

  const summary = segments.join(' · ');

  return (
    <div className="rounded-lg border border-border/60 bg-elevated/30 px-3 py-2 text-sm">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={!collapsed}
      >
        <span className="min-w-0 flex-1 text-muted-foreground">
          {collapsed ? (
            summary || topPressure
          ) : (
            <>
              {summary ? <span className="text-foreground">{summary}</span> : null}
              {!collapsed && topPressure ? (
                <span className={summary ? 'mt-1 block text-xs italic' : 'block'}>
                  {topPressure}
                </span>
              ) : null}
            </>
          )}
        </span>
        {collapsed ? (
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        ) : (
          <ChevronUp className="size-4 shrink-0 text-muted" aria-hidden />
        )}
      </button>
      {!collapsed && topPressure && summary ? (
        <p className="mt-1 border-t border-border/50 pt-1 text-xs italic text-muted-foreground">
          {topPressure}
        </p>
      ) : null}
    </div>
  );
}
