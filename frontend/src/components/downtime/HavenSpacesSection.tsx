import type { DowntimeHavenOverviewSpace } from '@shared/downtimeHub';

interface HavenSpacesSectionProps {
  spaces: DowntimeHavenOverviewSpace[];
}

export function HavenSpacesSection({ spaces }: HavenSpacesSectionProps) {
  if (spaces.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">Spaces</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sub-areas within this haven.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="rounded-lg border border-border bg-elevated/10 px-4 py-3"
          >
            <p className="font-medium text-foreground">{space.label}</p>
            {space.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{space.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
