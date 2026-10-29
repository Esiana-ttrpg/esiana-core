import type { CharacterLocationGroup } from '@/lib/characterHubGrouping';
import { CharacterCastEntry } from '@/components/character/CharacterCastEntry';
import { projectCastEntryProps } from '@/lib/characterCastProjection';
import { parseCharacterMetadata } from '@/lib/characterMetadata';

interface CharacterLocationGroupSectionProps {
  group: CharacterLocationGroup;
  campaignHandle: string;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterLocationGroupSection({
  group,
  campaignHandle,
  selectedCharacterId,
  onSelectCharacter,
}: CharacterLocationGroupSectionProps) {
  return (
    <div className="grid min-w-0 gap-2">
      {group.characters.map((entry) => {
        const identity = parseCharacterMetadata(entry.child.metadata);
        return (
          <CharacterCastEntry
            key={entry.child.id}
            campaignHandle={campaignHandle}
            entry={projectCastEntryProps(entry)}
            selected={selectedCharacterId === entry.child.id}
            onSelect={onSelectCharacter}
            pronouns={identity.appearance.pronouns}
          />
        );
      })}
    </div>
  );
}
