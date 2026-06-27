import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { CategoryIndexChild } from '@/lib/wiki';
import { CreatureCodexTile } from './CreatureCodexTile';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface BestiaryRecentSightingsBandProps {
  entries: CategoryIndexChild[];
  selectedCreatureId: string | null;
  onSelectCreature: (id: string) => void;
  onOpenCreature: (id: string) => void;
  isDMUser?: boolean;
}

export function BestiaryRecentSightingsBand({
  entries,
  selectedCreatureId,
  onSelectCreature,
  onOpenCreature,
  isDMUser: isDMUserProp,
}: BestiaryRecentSightingsBandProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  if (entries.length === 0) return null;

  return (
    <section className="mb-6 space-y-3">
      <header>
        <h2 className={META_SECTION_LABEL_CLASS}>
          Recent Sightings
        </h2>
        <p className="text-xs text-muted/80">Recently updated expedition records</p>
      </header>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {entries.map((child) => (
          <div key={child.id} className="w-36 shrink-0">
            <CreatureCodexTile
              child={child}
              selected={selectedCreatureId === child.id}
              onSelect={onSelectCreature}
              onOpen={onOpenCreature}
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
}
