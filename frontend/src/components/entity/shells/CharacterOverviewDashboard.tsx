import { CharacterIdentityEditor } from '@/components/entity/CharacterIdentityEditor';
import { EntityBiographyWidget } from '@/components/wiki/widgets/EntityBiographyWidget';
import { buildCharacterOverviewDisplayValues } from '@/lib/characterOverviewDisplay';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import type { WikiPageBlock } from '@/types/wiki';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { EntityPageSection } from './EntityPageSection';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
  EntityWikiInfobox,
} from './EntityFactRow';
import { useMemo } from 'react';

function findBiographyBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'text-biography');
}

export function CharacterOverviewDashboard({
  campaignHandle,
  pageId,
  displayTitle,
  templateType,
  blocks,
  flatPages,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageMetadata,
  characterProjection,
  pageTags,
  onMetadataSaved,
  onBlocksChange,
  prosePrimary = false,
  inspectorFocusField,
}: EntityOverviewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const canEdit = isEditingPage && isDMUser;
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const biographyBlock = findBiographyBlock(blocks);
  const bioContent = (biographyBlock?.content as Record<string, unknown>) ?? { markdown: '' };

  const displayValues = useMemo(
    () =>
      buildCharacterOverviewDisplayValues({
        displayTitle,
        pageMetadata,
        characterProjection,
        flatPages,
        pageTags,
        campaignNow,
        isDMUser,
        pageId,
        templateType,
      }),
    [
      displayTitle,
      pageMetadata,
      characterProjection,
      flatPages,
      pageTags,
      campaignNow,
      isDMUser,
      pageId,
      templateType,
    ],
  );

  const identityFacts = canEdit ? (
    <CharacterIdentityEditor
      blockId={`entity-overview-context:${pageId}`}
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={pageMetadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      focusField={inspectorFocusField}
      section="overviewContext"
      bare
      identitySheetLayout
    />
  ) : (
    <EntityFactRowList>
      {displayValues.affiliations ? <EntityFactRow label="Affiliations" fieldId="character-field-primaryAffiliationId">
        <EntityFactReadValue value={displayValues.affiliations} />
      </EntityFactRow> : null}
    </EntityFactRowList>
  );

  return (
    <div className="space-y-6">
      <EntityPageSection id="character-context" title="World context" wikiFacts>
        <EntityWikiInfobox className="max-w-md">{identityFacts}</EntityWikiInfobox>
      </EntityPageSection>

      <EntityPageSection id="character-description" title="Description" dominant>
        <EntityBiographyWidget
          content={bioContent}
          isEditingPage={canEdit}
          prosePrimary={prosePrimary}
          templateType={templateType}
          pageCanEdit={canEdit}
          onChange={(newContent) => {
            if (!biographyBlock) return;
            onBlocksChange((prev) =>
              prev.map((b) =>
                b.id === biographyBlock.id
                  ? { ...b, content: { ...b.content, ...newContent } }
                  : b,
              ),
            );
          }}
        />
      </EntityPageSection>
    </div>
  );
}
