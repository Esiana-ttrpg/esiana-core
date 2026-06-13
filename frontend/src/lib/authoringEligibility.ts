import { inferAuthoringKindFromMetadata } from '@shared/authoringContext';
import { isArcMetadataPresent } from '@shared/arcMetadata';
import { isSceneMetadataPresent } from '@shared/sceneMetadata';

export function isAuthoringWorkshopEligible(
  templateType: string,
  metadata: unknown,
): boolean {
  if (templateType === 'SESSION_NOTE') return true;
  if (isArcMetadataPresent(metadata)) return true;
  if (isSceneMetadataPresent(metadata)) return true;
  if (inferAuthoringKindFromMetadata(metadata)) return true;
  return false;
}
