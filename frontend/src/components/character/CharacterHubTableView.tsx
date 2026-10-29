import type { CharacterLocationGroup } from '@/lib/characterHubGrouping';
import { IndexGridView } from '@/components/IndexGridView';
import type { WikiTreeNode } from '@/types/wiki';

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
