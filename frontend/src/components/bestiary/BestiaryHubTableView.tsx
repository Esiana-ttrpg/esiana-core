import { IndexGridView } from '@/components/IndexGridView';
import type { BestiaryHabitatSection } from '@/lib/bestiaryHubGrouping';
import { BestiaryHabitatSection as BestiarySectionHeader } from './BestiaryHabitatSection';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface BestiaryHubTableViewProps {
  sections: BestiaryHabitatSection[];
  categoryPageId: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
  selectedCreatureId: string | null;
  onSelectCreature: (id: string) => void;
  onOpenCreature: (id: string) => void;
  isDMUser?: boolean;
}

export function BestiaryHubTableView({
  sections,
  categoryPageId,
  campaignHandle,
  pageById,
  selectedCreatureId,
  onSelectCreature,
  onOpenCreature,
  isDMUser: isDMUserProp,
}: BestiaryHubTableViewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.label} className="space-y-3">
          <BestiarySectionHeader
            section={section}
            selectedCreatureId={selectedCreatureId}
            onSelectCreature={onSelectCreature}
            onOpenCreature={onOpenCreature}
            showGrid={false}
          />
          <IndexGridView
            children={section.entries}
            categoryPageId={categoryPageId}
            categoryTitle="Bestiary"
            campaignHandle={campaignHandle}
            pageById={pageById}
            selectedCharacterId={selectedCreatureId}
            onSelectCharacter={onSelectCreature}
          />
        </div>
      ))}
    </div>
  );
}
