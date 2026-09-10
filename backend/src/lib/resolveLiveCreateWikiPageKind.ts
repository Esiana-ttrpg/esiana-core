import { readEntityCategoryFromMetadata } from '../../../shared/wikiTemplateType.js';
import { isObjectiveMetadataPresent } from './objectiveMetadata.js';
import { isQuestMetadataPresent } from './questMetadata.js';

/**
 * Structural page kind for live wiki create. Client templateType is never consulted.
 * Module bootstraps and metadata decide QUEST / SCENE / OBJECTIVE / JOURNAL.
 */
export function resolveLiveCreateWikiPageKind(input: {
  metadata: Record<string, unknown>;
  sceneBootstrapped: boolean;
}): string {
  if (input.sceneBootstrapped) return 'SCENE';
  if (isObjectiveMetadataPresent(input.metadata)) return 'OBJECTIVE';
  if (isQuestMetadataPresent(input.metadata)) return 'QUEST';
  if (readEntityCategoryFromMetadata(input.metadata) === 'journals') return 'JOURNAL';
  return 'DEFAULT';
}
