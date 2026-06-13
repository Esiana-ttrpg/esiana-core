import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import { CodexIdentityStrip, type CodexIdentityChip } from './CodexIdentityStrip';
interface OrganizationIdentityStripProps {
  projection: OrganizationIdentityProjection;
  campaignHandle: string;
  headquartersId?: string | null;
  compact?: boolean;
  onEditField?: (fieldKey: string) => void;
}

export function OrganizationIdentityStrip({
  projection,
  campaignHandle,
  headquartersId,
  compact = false,
  onEditField,
}: OrganizationIdentityStripProps) {
  const chips: CodexIdentityChip[] = projection.identityLine
    ? projection.identityLine.split(' • ').map((label) => ({ label }))
    : [];

  if (headquartersId && chips.length > 0) {
    const lastIdx = chips.length - 1;
    const last = chips[lastIdx];
    if (last && projection.identityLine.endsWith(last.label)) {
      chips[lastIdx] = {
        ...last,
        href: campaignCategoryChildPath(campaignHandle, headquartersId, 'Locations'),
      };
    }
  }

  return (
    <CodexIdentityStrip
      title={projection.displayName}
      subtitle={projection.subtitle}
      chips={chips}
      knownFor={projection.knownFor}
      projectionType="organization"
      compact={compact}
      onEditField={onEditField}
      editFieldKey="orgType"
    />
  );
}
