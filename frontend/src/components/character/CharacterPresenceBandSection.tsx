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
  return (
    <div className="min-w-0 space-y-2">
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
  );
}
