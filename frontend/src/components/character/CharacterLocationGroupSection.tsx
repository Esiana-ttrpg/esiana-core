import { MapPin } from 'lucide-react';
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
    <section className="min-w-0 space-y-3">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <MapPin className="size-4 shrink-0 text-primary/80" />
        <h2 className="min-w-0 truncate text-sm font-semibold text-focal-foreground">
          {group.locationTitle}
        </h2>
        <span className="shrink-0 text-xs text-muted">
          {group.characters.length}
        </span>
        {group.isLatestSessionLocation ? (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Latest Session
          </span>
        ) : null}
      </div>

      <div className="grid gap-2">
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
    </section>
  );
}
