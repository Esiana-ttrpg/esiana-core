import type { ArcHierarchyProjection } from '@/lib/arcMetadata';
import { ArcHierarchyTree } from '@/components/adventure/ArcHierarchyTree';

interface ArcsSectionProps {
  campaignHandle: string;
  arcHierarchy?: ArcHierarchyProjection | null;
  actLanes?: Array<{ id: string; label: string; actIndex?: number }>;
  embedded?: boolean;
}

export function ArcsSection({
  campaignHandle,
  arcHierarchy,
  actLanes = [],
  embedded = false,
}: ArcsSectionProps) {
  return (
    <div className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold">Arcs</h2>
          <p className="text-sm text-muted-foreground">
            Campaign arcs → questlines → quests → objectives, with scene associations
          </p>
        </div>
      ) : null}
      {actLanes.length > 0 ? (
        <div className="rounded border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Storyboard act lanes
          </p>
          <ul className="flex flex-wrap gap-2">
            {actLanes.map((lane) => (
              <li
                key={lane.id}
                className="rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {lane.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {arcHierarchy ? (
        <ArcHierarchyTree campaignHandle={campaignHandle} projection={arcHierarchy} />
      ) : (
        <p className="text-sm text-muted-foreground">Loading arc hierarchy…</p>
      )}
    </div>
  );
}
