import type { CodexIdentityProjection } from '@/lib/codexIdentityProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { CodexIdentityStrip, type CodexIdentityChip } from './CodexIdentityStrip';
const EDIT_FIELD_BY_PROFILE: Partial<Record<SurfaceProfileKey, string>> = {
  ancestry: 'ancestryType',
  object: 'objectType',
  location: 'locationType',
  'rule-resource': 'resourceType',
};

interface CodexEntityIdentityStripProps {
  projection: CodexIdentityProjection;
  surfaceProfileKey: SurfaceProfileKey;
  compact?: boolean;
  onEditField?: (fieldKey: string) => void;
  showKnownFor?: boolean;
}

export function CodexEntityIdentityStrip({
  projection,
  surfaceProfileKey,
  compact = false,
  onEditField,
  showKnownFor = true,
}: CodexEntityIdentityStripProps) {
  const chips: CodexIdentityChip[] = projection.identityLine
    ? projection.identityLine.split(' • ').map((label) => ({ label }))
    : [];

  return (
    <CodexIdentityStrip
      portraitUrl={projection.portraitUrl}
      title={projection.displayName}
      chips={chips}
      knownFor={projection.knownFor}
      showKnownFor={showKnownFor}
      projectionType={surfaceProfileKey}
      compact={compact}
      onEditField={onEditField}
      editFieldKey={EDIT_FIELD_BY_PROFILE[surfaceProfileKey] ?? 'title'}
    />
  );
}
