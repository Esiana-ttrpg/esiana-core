import type { DowntimeHavenOverviewSpace } from '@shared/downtimeHub';
import { formatHavenSpaceStatusLabel, formatHavenSpaceTypeLabel } from '@shared/havenMetadata';

interface HavenSpacesSectionProps {
  spaces: DowntimeHavenOverviewSpace[];
}

export function HavenSpacesSection({ spaces }: HavenSpacesSectionProps) {
  if (spaces.length === 0) return null;

  const availableCount = spaces.filter((space) => space.status === 'active').length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Spaces</h2>
        <span className="text-xs text-muted-foreground">{availableCount} / {spaces.length} available</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Sub-areas within this haven.
      </p>
      <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="border-b border-border/50 pb-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{space.label}</p>
              {space.status !== 'active' ? <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{formatHavenSpaceStatusLabel(space.status)}</span> : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatHavenSpaceTypeLabel(space.type)}</p>
            {space.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{space.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
