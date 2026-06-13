import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import { CodexIdentityStrip, type CodexIdentityChip } from './CodexIdentityStrip';
interface FamilyIdentityStripProps {
  projection: FamilyIdentityProjection;
  campaignHandle: string;
  seatLocationId?: string | null;
  compact?: boolean;
  onEditField?: (fieldKey: string) => void;
}

export function FamilyIdentityStrip({
  projection,
  campaignHandle,
  seatLocationId,
  compact = false,
  onEditField,
}: FamilyIdentityStripProps) {
  const chips: CodexIdentityChip[] = projection.identityLine
    ? projection.identityLine.split(' • ').map((label) => ({ label }))
    : [];

  if (seatLocationId && chips.length > 0) {
    for (let i = 0; i < chips.length; i += 1) {
      const chip = chips[i];
      if (chip && projection.identityLine.includes(chip.label)) {
        const seatTitle = chip.label;
        if (projection.identityLine.includes(seatTitle)) {
          chips[i] = {
            ...chip,
            href: campaignCategoryChildPath(campaignHandle, seatLocationId, 'Locations'),
          };
          break;
        }
      }
    }
  }

  return (
    <CodexIdentityStrip
      title={projection.displayName}
      subtitle={projection.subtitle}
      chips={chips}
      knownFor={projection.knownFor ? `Coat of arms: ${projection.knownFor}` : null}
      projectionType="family"
      compact={compact}
      onEditField={onEditField}
      editFieldKey="familyType"
    />
  );
}
