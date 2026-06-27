import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { CharacterPresenceBand } from '@/lib/characterHubGrouping';
import { CharacterLocationGroupSection } from '@/components/character/CharacterLocationGroupSection';

interface CharacterPresenceBandSectionProps {
  band: CharacterPresenceBand;
  campaignHandle: string;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterPresenceBandSection({
  band,
  campaignHandle,
  selectedCharacterId,
  onSelectCharacter,
}: CharacterPresenceBandSectionProps) {
  const characterCount = band.locationGroups.reduce(
    (sum, group) => sum + group.characters.length,
    0,
  );

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          {band.label}
        </h2>
        <span className="text-xs text-muted">{characterCount}</span>
      </div>

      <div className="space-y-8">
        {band.locationGroups.map((group) => (
          <CharacterLocationGroupSection
            key={`${band.tier}-${group.locationPageId ?? '__unknown__'}`}
            group={group}
            campaignHandle={campaignHandle}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={onSelectCharacter}
          />
        ))}
      </div>
    </section>
  );
}
