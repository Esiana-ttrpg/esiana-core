import type { CategoryLocationAncestor } from '@/lib/wiki';

export function LocationTrailChips({
  ancestors,
  trailLabel,
}: {
  ancestors: CategoryLocationAncestor[];
  trailLabel?: string | null;
}) {
  if (ancestors.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted">located in:</span>
        {ancestors.map((node, index) => (
          <span key={node.id} className="inline-flex items-center gap-1">
            {index > 0 && <span className="text-[10px] text-muted">›</span>}
            <span className="rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] text-foreground">
              {node.title}
            </span>
          </span>
        ))}
      </div>
    );
  }

  if (trailLabel) {
    return (
      <p className="text-xs text-muted">
        located in: {trailLabel}
      </p>
    );
  }

  return null;
}
