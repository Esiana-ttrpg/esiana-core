import { CharacterIdentityEditor } from '@/components/entity/CharacterIdentityEditor';
import { CharacterLineageEditor } from '@/components/entity/CharacterLineageEditor';
import { EntityBiographyWidget } from '@/components/wiki/widgets/EntityBiographyWidget';
import { WikiPageTagsInput } from '@/components/wiki/WikiPageTagsInput';
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
  allCampaignTags,
  onPageTagsChange,
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

  const familiesReadControl = <EntityFactReadValue value={displayValues.families} />;
  const familiesEditControl = (
    <CharacterLineageEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      blockId={`entity-lineage-overview:${pageId}`}
      metadata={pageMetadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      section="identityOverview"
      bare
    />
  );

  const tagsReadControl = <EntityFactReadValue value={displayValues.tags} />;
  const tagsEditControl = (
    <WikiPageTagsInput
      assignedTags={pageTags ?? []}
      allCampaignTags={allCampaignTags ?? []}
      onChange={onPageTagsChange}
      compact
    />
  );

  const identityFacts = canEdit ? (
    <CharacterIdentityEditor
      blockId={`entity-identity-overview:${pageId}`}
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={pageMetadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      focusField={inspectorFocusField}
      section="identityOverview"
      bare
      identitySheetLayout
      familiesControl={familiesEditControl}
      tagsControl={tagsEditControl}
    />
  ) : (
    <EntityFactRowList>
      <EntityFactRow label="Ancestry" fieldId="character-field-ancestryId">
        <EntityFactReadValue value={displayValues.ancestryOrigin} />
      </EntityFactRow>
      <EntityFactRow label="Home" fieldId="character-field-currentLocationId">
        <EntityFactReadValue value={displayValues.homeLocation} />
      </EntityFactRow>
      <EntityFactRow label="Families" fieldId="character-field-familyId">
        {familiesReadControl}
      </EntityFactRow>
      <EntityFactRow label="Affiliations" fieldId="character-field-primaryAffiliationId">
        <EntityFactReadValue value={displayValues.affiliations} />
      </EntityFactRow>
      <EntityFactRow label="Gender" fieldId="character-field-appearance.gender">
        <EntityFactReadValue value={displayValues.gender} />
      </EntityFactRow>
      <EntityFactRow label="Tags" fieldId="character-field-tags">
        {tagsReadControl}
      </EntityFactRow>
    </EntityFactRowList>
  );

  return (
    <div className="space-y-6">
      <EntityPageSection id="character-identity" title="Identity" wikiFacts>
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
