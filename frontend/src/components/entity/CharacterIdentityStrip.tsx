import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import {
  CharacterLifeStatusBadge,
  getCharacterLifeStatusSurfaceClass,
} from './CharacterLifeStatusBadge';
import { CodexIdentityStrip, type CodexIdentityChip } from './CodexIdentityStrip';
interface CharacterIdentityStripProps {
  projection: CharacterIdentityProjection;
  campaignHandle: string;
  compact?: boolean;
  showKnownFor?: boolean;
  onEditField?: (fieldKey: string) => void;
}

export function CharacterIdentityStrip({
  projection,
  campaignHandle,
  compact = false,
  showKnownFor = true,
  onEditField,
}: CharacterIdentityStripProps) {
  const { primary, pronounSuffix, ariaLabel } = formatCharacterDisplayName(
    projection.displayName,
    projection.pronouns,
  );

  const surfaceClass = getCharacterLifeStatusSurfaceClass(projection.lifeStatusVariant);
  const chips: CodexIdentityChip[] = [];

  if (projection.partyParticipationChip) {
    chips.push({ label: projection.partyParticipationChip });
  }
  if (projection.affiliationTitle) {
    chips.push({
      label: projection.affiliationTitle,
      href: projection.affiliationId
        ? campaignCategoryChildPath(campaignHandle, projection.affiliationId, 'Organizations')
        : undefined,
    });
  }
  const familyOrAncestry = projection.familyTitle ?? projection.ancestry;
  if (familyOrAncestry) {
    chips.push({
      label: familyOrAncestry,
      href: projection.familyId
        ? campaignCategoryChildPath(campaignHandle, projection.familyId, 'Families')
        : undefined,
    });
  }
  if (projection.statusLabel) {
    chips.push({ label: projection.statusLabel });
  }

  return (
    <CodexIdentityStrip
      portraitUrl={projection.portraitUrl}
      title={primary}
      titleSuffix={
        pronounSuffix ? (
          <span className="ml-1.5 font-normal text-muted">({pronounSuffix})</span>
        ) : null
      }
      subtitle={projection.roleSubtitle}
      chips={chips}
      knownFor={projection.knownFor}
      showKnownFor={showKnownFor}
      projectionType="character"
      compact={compact}
      onEditField={onEditField}
      editFieldKey="title"
      adornment={
        <CharacterLifeStatusBadge status={projection.lifeStatusVariant} compact={compact} />
      }
      surfaceClassName={surfaceClass}
      ariaLabel={ariaLabel}
    />
  );
}
