import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import { CodexIdentityStrip, type CodexIdentityChip } from './CodexIdentityStrip';
interface BestiaryIdentityStripProps {
  projection: BestiaryIdentityProjection;
  compact?: boolean;
  onEditField?: (fieldKey: string) => void;
}

export function BestiaryIdentityStrip({
  projection,
  compact = false,
  onEditField,
}: BestiaryIdentityStripProps) {
  const chips: CodexIdentityChip[] = projection.identityLine
    ? projection.identityLine.split(' • ').map((label) => ({ label }))
    : [];

  return (
    <CodexIdentityStrip
      portraitUrl={projection.portraitUrl}
      title={projection.displayName}
      chips={chips}
      knownFor={projection.knownFor}
      projectionType="bestiary"
      compact={compact}
      onEditField={onEditField}
      editFieldKey="creatureType"
    />
  );
}
