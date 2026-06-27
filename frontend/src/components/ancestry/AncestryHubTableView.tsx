import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { IndexGridView } from '@/components/IndexGridView';
import type { AncestryHubSection } from '@/lib/ancestryHubGrouping';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface AncestryHubTableViewProps {
  sections: AncestryHubSection[];
  categoryPageId: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
  selectedAncestryId: string | null;
  onSelectAncestry: (id: string) => void;
  isDMUser?: boolean;
}

export function AncestryHubTableView({
  sections,
  categoryPageId,
  campaignHandle,
  pageById,
  selectedAncestryId,
  onSelectAncestry,
  isDMUser: isDMUserProp,
}: AncestryHubTableViewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.label || '__all__'} className="space-y-3">
          {section.label ? (
            <header className="border-b border-border/80 pb-2">
              <h2 className={META_SECTION_LABEL_CLASS}>
                {section.label}
              </h2>
            </header>
          ) : null}
          <IndexGridView
            children={section.entries}
            categoryPageId={categoryPageId}
            categoryTitle="Ancestries"
            campaignHandle={campaignHandle}
            pageById={pageById}
            selectedCharacterId={selectedAncestryId}
            onSelectCharacter={onSelectAncestry}
          />
        </div>
      ))}
    </div>
  );
}
