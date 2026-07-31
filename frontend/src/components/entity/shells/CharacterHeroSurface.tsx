import { useMemo } from 'react';
import { CharacterIdentityEditor } from '@/components/entity/CharacterIdentityEditor';
import { buildCharacterOverviewDisplayValues } from '@/lib/characterOverviewDisplay';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
  EntityWikiInfobox,
} from './EntityFactRow';
import type { EntityHeroProps } from '@/lib/entityPageShells/types';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';

interface CharacterHeroSurfaceProps extends EntityHeroProps {
  templateType: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
}

export function CharacterHeroSurface({
  campaignHandle,
  pageId,
  templateType,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  characterProjection,
  metadata,
  flatPages,
  blockId,
  onMetadataSaved,
  focusField,
}: CharacterHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const canEditHero = isEditingPage && isDMUser;
  const portraitUrl = characterProjection?.portraitUrl?.trim() || null;

  const displayValues = useMemo(
    () =>
      buildCharacterOverviewDisplayValues({
        displayTitle: characterProjection?.displayName ?? '',
        pageMetadata: metadata,
        characterProjection,
        flatPages,
        pageTags: [],
        campaignNow,
        isDMUser,
        pageId,
        templateType,
      }),
    [
      metadata,
      characterProjection,
      flatPages,
      campaignNow,
      isDMUser,
      pageId,
      templateType,
    ],
  );

  const factBlock = canEditHero ? (
    <CharacterIdentityEditor
      blockId={blockId}
      campaignHandle={campaignHandle}
      pageId={pageId}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      focusField={focusField}
      section="hero"
      bare
      heroSheetLayout
    />
  ) : (
    <EntityFactRowList>
      <EntityFactRow label="Title" fieldId="character-field-title">
        <EntityFactReadValue value={displayValues.title} />
      </EntityFactRow>
      <EntityFactRow label="Role / type" fieldId="character-field-profession">
        <EntityFactReadValue value={displayValues.role} />
      </EntityFactRow>
      <EntityFactRow label="Pronouns" fieldId="character-field-pronouns">
        <EntityFactReadValue value={displayValues.pronouns} />
      </EntityFactRow>
      <EntityFactRow label="Status" fieldId="character-field-status">
        <EntityFactReadValue value={displayValues.status} />
      </EntityFactRow>
    </EntityFactRowList>
  );

  return (
    <div
      className="-mt-0.5 border-b border-border/25 pb-4 mb-5"
      aria-label="Character summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt=""
            className="size-[4.5rem] shrink-0 rounded-md border border-border/35 object-cover shadow-sm sm:size-24"
          />
        ) : null}

        <div className="min-w-0 flex-1 sm:max-w-xl">
          <EntityWikiInfobox>{factBlock}</EntityWikiInfobox>
        </div>

        <div className="shrink-0 self-start sm:ml-auto sm:pt-1">
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
      </div>
    </div>
  );
}
