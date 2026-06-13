import type { BestiaryHabitatSection as BestiarySection } from '@/lib/bestiaryHubGrouping';
import type { CategoryIndexChild } from '@/lib/wiki';
import { CreatureCodexTile } from './CreatureCodexTile';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface BestiaryHabitatSectionProps {
  section: BestiarySection;
  selectedCreatureId: string | null;
  onSelectCreature: (id: string) => void;
  onOpenCreature: (id: string) => void;
  isDMUser?: boolean;
  gridClassName?: string;
  showGrid?: boolean;
}

export function BestiaryHabitatSection({
  section,
  selectedCreatureId,
  onSelectCreature,
  onOpenCreature,
  isDMUser: isDMUserProp,
  gridClassName = 'bestiary-codex-grid',
  showGrid = true,
}: BestiaryHabitatSectionProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { label, envTint, presence, entries } = section;
  const apexClass = presence.apexActivityDetected
    ? 'bestiary-section-header--apex-active'
    : '';

  return (
    <section className="space-y-3">
      <header
        className={[
          'bestiary-section-header',
          `bestiary-section-header--${envTint}`,
          apexClass,
        ].join(' ')}
      >
        <h2 className="text-lg font-semibold text-focal-foreground">{label}</h2>
        <p className="bestiary-section-presence mt-0.5 text-sm text-muted">
          {presence.knownSpeciesCount} Known Species
          {presence.apexThreatCount > 0
            ? ` · ${presence.apexThreatCount} Apex Threat${presence.apexThreatCount > 1 ? 's' : ''}`
            : null}
        </p>
        {presence.apexActivityDetected ? (
          <p className="bestiary-section-apex-callout mt-1 text-xs" role="note">
            Apex activity detected
          </p>
        ) : null}
      </header>

      {showGrid ? (
        <div className={gridClassName} role="listbox" aria-label={`${label} creatures`}>
          {entries.map((child: CategoryIndexChild) => (
            <CreatureCodexTile
              key={child.id}
              child={child}
              selected={selectedCreatureId === child.id}
              onSelect={onSelectCreature}
              onOpen={onOpenCreature}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
