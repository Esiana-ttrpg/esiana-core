import type { StoryboardViewLane } from '@/lib/sceneMetadata';

interface StoryboardLaneOverlayProps {
  lanes: StoryboardViewLane[];
  laneHeight?: number;
  onToggleCollapse?: (laneId: string) => void;
  readOnly?: boolean;
}

export function StoryboardLaneOverlay({
  lanes,
  laneHeight = 160,
  onToggleCollapse,
  readOnly = false,
}: StoryboardLaneOverlayProps) {
  if (lanes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {lanes.map((lane, index) => (
        <div
          key={lane.id}
          className="absolute left-0 right-0 border-b border-primary/10 bg-primary/[0.03]"
          style={{
            top: index * laneHeight,
            height: laneHeight,
          }}
        >
          <div className="pointer-events-auto flex items-center gap-2 px-2 py-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary/70">
              {lane.label}
            </span>
            {!readOnly && onToggleCollapse ? (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => onToggleCollapse(lane.id)}
              >
                {lane.collapsed ? 'Expand' : 'Collapse'}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function snapNodeToLane(
  y: number,
  lanes: StoryboardViewLane[],
  laneHeight = 160,
): { y: number; laneId?: string } {
  if (lanes.length === 0) return { y };
  const index = Math.max(0, Math.min(lanes.length - 1, Math.round(y / laneHeight)));
  const lane = lanes[index];
  const snappedY = index * laneHeight + laneHeight / 2 - 40;
  return { y: snappedY, laneId: lane?.id };
}

