import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { CodexIdentityProjection } from '@/lib/codexIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { useWiki } from '@/contexts/WikiContext';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import {
  adaptBestiaryIdentityStrip,
  adaptCharacterIdentityStrip,
  adaptCodexEntityIdentityStrip,
  adaptFamilyIdentityStrip,
  adaptOrganizationIdentityStrip,
  type EntityIdentityStripViewModel,
} from '@/lib/entityIdentityStripAdapter';
import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';
import {
  NarrativeStatusBadge,
  NarrativeStatusGmBadge,
} from '@/components/wiki/NarrativeStatusBadge';
import {
  CharacterLifeStatusBadge,
  getCharacterLifeStatusSurfaceClass,
} from './CharacterLifeStatusBadge';
import { CodexIdentityStrip } from './CodexIdentityStrip';

export interface EntityIdentityStripProps {
  surfaceKey: SurfaceProfileKey;
  campaignHandle: string;
  displayTitleFallback: string;
  hasHeroBlock?: boolean;
  compact?: boolean;
  isDMUser?: boolean;
  onEditField?: (fieldKey: string) => void;
  headquartersId?: string | null;
  seatLocationId?: string | null;
  characterProjection?: CharacterIdentityProjection | null;
  organizationProjection?: OrganizationIdentityProjection | null;
  familyProjection?: FamilyIdentityProjection | null;
  bestiaryProjection?: BestiaryIdentityProjection | null;
  codexProjection?: CodexIdentityProjection | null;
  narrativeStatus?: PageNarrativeStatusProjection | null;
}

function resolveViewModel(
  props: EntityIdentityStripProps,
  flatPages: ReturnType<typeof useWiki>['flatPages'],
): EntityIdentityStripViewModel | null {
  const { surfaceKey, campaignHandle, headquartersId, seatLocationId } = props;

  if (surfaceKey === 'character' && props.characterProjection) {
    return adaptCharacterIdentityStrip(
      props.characterProjection,
      campaignHandle,
      flatPages,
    );
  }
  if (surfaceKey === 'organization' && props.organizationProjection) {
    return adaptOrganizationIdentityStrip(
      props.organizationProjection,
      campaignHandle,
      headquartersId,
      flatPages,
    );
  }
  if (surfaceKey === 'family' && props.familyProjection) {
    return adaptFamilyIdentityStrip(
      props.familyProjection,
      campaignHandle,
      seatLocationId,
      flatPages,
    );
  }
  if (surfaceKey === 'bestiary' && props.bestiaryProjection) {
    return adaptBestiaryIdentityStrip(props.bestiaryProjection);
  }
  if (props.codexProjection && props.surfaceKey) {
    return adaptCodexEntityIdentityStrip(props.codexProjection, surfaceKey, {
      showKnownFor: surfaceKey !== 'rule-resource',
    });
  }
  return null;
}

export function EntityIdentityStrip(props: EntityIdentityStripProps) {
  const { flatPages } = useWiki();
  const {
    displayTitleFallback,
    hasHeroBlock = false,
    compact = false,
    isDMUser: isDMUserProp = false,
    onEditField,
    narrativeStatus = null,
  } = props;
  const isDMUser = useElevatedNarrativeView(isDMUserProp);

  if (hasHeroBlock) return null;

  const viewModel = resolveViewModel(props, flatPages);
  if (!viewModel) {
    return (
      <h1
        className={`${TYPE_DISPLAY_CLASS} ${
          compact
            ? 'text-xl text-focal-foreground sm:text-2xl'
            : 'text-2xl text-focal-foreground sm:text-3xl'
        }`}
      >
        {displayTitleFallback}
      </h1>
    );
  }

  return (
    <CodexIdentityStrip
      portraitUrl={viewModel.portraitUrl}
      title={viewModel.title}
      titleSuffix={
        viewModel.pronounSuffix ? (
          <span className="ml-1.5 font-normal text-muted">({viewModel.pronounSuffix})</span>
        ) : null
      }
      subtitle={viewModel.subtitle}
      chips={viewModel.chips}
      overflowChipLabels={viewModel.overflowChipLabels}
      knownFor={viewModel.knownFor}
      showKnownFor={viewModel.showKnownFor}
      projectionType={viewModel.projectionType}
      compact={compact}
      onEditField={onEditField}
      editFieldKey={viewModel.editFieldKey}
      adornment={
        narrativeStatus ? (
          isDMUser ? (
            <NarrativeStatusGmBadge narrativeStatus={narrativeStatus} compact={compact} />
          ) : (
            <NarrativeStatusBadge narrativeStatus={narrativeStatus} compact={compact} />
          )
        ) : viewModel.lifeStatusVariant ? (
          <CharacterLifeStatusBadge status={viewModel.lifeStatusVariant} compact={compact} />
        ) : null
      }
      surfaceClassName={
        !narrativeStatus && viewModel.lifeStatusVariant
          ? getCharacterLifeStatusSurfaceClass(viewModel.lifeStatusVariant)
          : ''
      }
      ariaLabel={viewModel.ariaLabel}
    />
  );
}
