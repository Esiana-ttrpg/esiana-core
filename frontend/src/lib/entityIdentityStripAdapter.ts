import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

type CategoryPathPages = readonly Pick<WikiTreeNode, 'id' | 'workspace' | 'pathKey' | 'templateType' | 'parentId' | 'title'>[];
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { CharacterLifeStatus } from '@/lib/characterMetadata';
import type { CodexIdentityProjection } from '@/lib/codexIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import type { CodexIdentityChip } from '@/components/entity/CodexIdentityStrip';

const EDIT_FIELD_BY_PROFILE: Partial<Record<SurfaceProfileKey, string>> = {
  ancestry: 'ancestryType',
  object: 'objectType',
  location: 'locationType',
  'rule-resource': 'resourceType',
  bestiary: 'creatureType',
  organization: 'orgType',
  family: 'familyType',
  character: 'title',
};

export interface EntityIdentityStripViewModel {
  portraitUrl?: string | null;
  title: string;
  pronounSuffix?: string | null;
  subtitle?: string | null;
  chips: CodexIdentityChip[];
  overflowChipLabels: string[];
  knownFor?: string | null;
  showKnownFor: boolean;
  projectionType: SurfaceProfileKey;
  editFieldKey: string;
  lifeStatusVariant?: CharacterLifeStatus;
  ariaLabel?: string;
}

function splitIdentityLine(line: string): CodexIdentityChip[] {
  return line
    .split(' • ')
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ label }));
}

export function adaptCharacterIdentityStrip(
  projection: CharacterIdentityProjection,
  campaignHandle: string,
  flatPages: CategoryPathPages = [],
): EntityIdentityStripViewModel {
  const { primary, pronounSuffix, ariaLabel } = formatCharacterDisplayName(
    projection.displayName,
    projection.pronouns,
  );

  const chips: CodexIdentityChip[] = [];
  if (projection.affiliationTitle) {
    chips.push({
      label: projection.affiliationTitle,
      href: projection.affiliationId
        ? campaignCategoryChildPath(
            campaignHandle,
            projection.affiliationId,
            'Organizations',
            flatPages,
          )
        : undefined,
    });
  }
  const familyOrAncestry = projection.familyTitle ?? projection.ancestry;
  if (familyOrAncestry) {
    chips.push({
      label: familyOrAncestry,
      href: projection.familyId
        ? campaignCategoryChildPath(
            campaignHandle,
            projection.familyId,
            'Families',
            flatPages,
          )
        : undefined,
    });
  }
  if (projection.statusLabel) {
    chips.push({ label: projection.statusLabel });
  }

  return {
    portraitUrl: projection.portraitUrl,
    title: primary,
    pronounSuffix,
    subtitle: projection.roleSubtitle,
    chips,
    overflowChipLabels: projection.overflowSegments,
    knownFor: projection.knownFor,
    showKnownFor: true,
    projectionType: 'character',
    editFieldKey: 'title',
    lifeStatusVariant: projection.lifeStatusVariant,
    ariaLabel,
  };
}

export function adaptOrganizationIdentityStrip(
  projection: OrganizationIdentityProjection,
  campaignHandle: string,
  headquartersId?: string | null,
  flatPages: CategoryPathPages = [],
): EntityIdentityStripViewModel {
  const chips = splitIdentityLine(projection.identityLine);
  if (headquartersId && chips.length > 0) {
    const lastIdx = chips.length - 1;
    const last = chips[lastIdx];
    if (last && projection.identityLine.endsWith(last.label)) {
      chips[lastIdx] = {
        ...last,
        href: campaignCategoryChildPath(
          campaignHandle,
          headquartersId,
          'Locations',
          flatPages,
        ),
      };
    }
  }

  return {
    title: projection.displayName,
    subtitle: projection.subtitle,
    chips,
    overflowChipLabels: [],
    knownFor: projection.knownFor,
    showKnownFor: true,
    projectionType: 'organization',
    editFieldKey: 'orgType',
  };
}

export function adaptFamilyIdentityStrip(
  projection: FamilyIdentityProjection,
  campaignHandle: string,
  seatLocationId?: string | null,
  flatPages: CategoryPathPages = [],
): EntityIdentityStripViewModel {
  const chips = splitIdentityLine(projection.identityLine);
  if (seatLocationId) {
    for (let i = 0; i < chips.length; i += 1) {
      const chip = chips[i];
      if (chip && projection.identityLine.includes(chip.label)) {
        chips[i] = {
          ...chip,
          href: campaignCategoryChildPath(
            campaignHandle,
            seatLocationId,
            'Locations',
            flatPages,
          ),
        };
        break;
      }
    }
  }

  return {
    title: projection.displayName,
    subtitle: projection.subtitle,
    chips,
    overflowChipLabels: [],
    knownFor: projection.knownFor ? `Coat of arms: ${projection.knownFor}` : null,
    showKnownFor: Boolean(projection.knownFor),
    projectionType: 'family',
    editFieldKey: 'familyType',
  };
}

export function adaptBestiaryIdentityStrip(
  projection: BestiaryIdentityProjection,
): EntityIdentityStripViewModel {
  return {
    portraitUrl: projection.portraitUrl,
    title: projection.displayName,
    chips: splitIdentityLine(projection.identityLine),
    overflowChipLabels: [],
    knownFor: projection.knownFor,
    showKnownFor: true,
    projectionType: 'bestiary',
    editFieldKey: 'creatureType',
  };
}

export function adaptCodexEntityIdentityStrip(
  projection: CodexIdentityProjection,
  surfaceProfileKey: SurfaceProfileKey,
  options?: { showKnownFor?: boolean },
): EntityIdentityStripViewModel {
  return {
    portraitUrl: projection.portraitUrl,
    title: projection.displayName,
    chips: splitIdentityLine(projection.identityLine),
    overflowChipLabels: [],
    knownFor: projection.knownFor,
    showKnownFor: options?.showKnownFor ?? surfaceProfileKey !== 'rule-resource',
    projectionType: surfaceProfileKey,
    editFieldKey: EDIT_FIELD_BY_PROFILE[surfaceProfileKey] ?? 'title',
  };
}
