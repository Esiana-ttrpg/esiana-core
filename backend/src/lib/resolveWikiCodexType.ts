import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import { isQuestMetadataPresent } from './questMetadata.js';
import { isSceneMetadataPresent } from './sceneMetadata.js';
import { isStructuralTemplateType } from '../../../shared/wikiTemplateType.js';
import { resolveCanonicalEntityCategory } from '../../../shared/resolveCanonicalEntityCategory.js';
import type { WikiPageWorkspaceInput } from '../../../shared/wikiWorkspaceResolve.js';

const ENTITY_CATEGORY_TO_CODEX_TYPE: Record<string, string> = {
  characters: 'CHARACTER',
  locations: 'LOCATION',
  organizations: 'ORGANIZATION',
  families: 'FAMILY',
  bestiary: 'BESTIARY',
  quests: 'QUEST',
  objects: 'OBJECT',
  ancestries: 'ANCESTRY',
  languages: 'LANGUAGE',
  'rules-resources': 'RULE_RESOURCE',
  threads: 'THREAD',
};

/**
 * Resolves display codex type from canonical entity category, structural templateType,
 * and narrative metadata signals.
 */
export function resolveWikiCodexType(input: {
  templateType: string;
  metadata?: unknown;
  id?: string;
  title?: string;
  parentId?: string | null;
  flatPages?: readonly WikiPageWorkspaceInput[];
}): string {
  const template = input.templateType?.trim().toUpperCase() || 'DEFAULT';
  if (isStructuralTemplateType(template)) return template;

  if (isQuestMetadataPresent(input.metadata)) return 'QUEST';
  if (isSceneMetadataPresent(input.metadata)) return 'SCENE';

  const entityCategory = input.id
    ? resolveCanonicalEntityCategory(
        {
          id: input.id,
          title: input.title ?? '',
          parentId: input.parentId ?? null,
          templateType: template,
          metadata: input.metadata,
        },
        input.flatPages ?? [],
      )
    : readEntityCategoryFromMetadata(input.metadata);

  if (entityCategory && ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory]) {
    return ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory];
  }

  return 'DEFAULT';
}
