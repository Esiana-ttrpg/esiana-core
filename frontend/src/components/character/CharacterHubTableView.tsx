import type { CharacterLocationGroup } from '@/lib/characterHubGrouping';
import { IndexGridView } from '@/components/IndexGridView';
import type { WikiTreeNode } from '@/types/wiki';
import { MapPin } from 'lucide-react';

interface CharacterHubTableViewProps {
  groups: CharacterLocationGroup[];
  categoryPageId: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
  onOpenCharacterSettings?: (pageId: string, focusField?: string) => void;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterHubTableView({
  groups,
  categoryPageId,
  campaignHandle,
  pageById,
  onOpenCharacterSettings,
  selectedCharacterId,
  onSelectCharacter,
}: CharacterHubTableViewProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.locationPageId ?? '__unknown__'} className="min-w-0">
          <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 border-b border-border/60 bg-focal-canvas/95 py-2 backdrop-blur-sm">
            <MapPin className="size-4 shrink-0 text-primary/80" />
            <h2 className="min-w-0 truncate text-sm font-semibold text-focal-foreground">
              {group.locationTitle}
            </h2>
            <span className="shrink-0 text-xs text-muted">
              {group.characters.length}
            </span>
          </div>
          <IndexGridView
            children={group.characters.map((entry) => entry.child)}
            categoryPageId={categoryPageId}
            categoryTitle="Characters"
            campaignHandle={campaignHandle}
            pageById={pageById}
            onOpenCharacterSettings={onOpenCharacterSettings}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={onSelectCharacter}
          />
        </section>
      ))}
    </div>
  );
}
