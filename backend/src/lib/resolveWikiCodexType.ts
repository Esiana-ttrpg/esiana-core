import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import { isQuestMetadataPresent } from './questMetadata.js';
import { isSceneMetadataPresent } from './sceneMetadata.js';

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
};

/**
 * Resolves a display codex type when templateType is DEFAULT but metadata/category
 * indicates a specific entity (e.g. Quest pages under Quests folder).
 */
export function resolveWikiCodexType(input: {
  templateType: string;
  metadata?: unknown;
}): string {
  const template = input.templateType?.trim().toUpperCase() || 'DEFAULT';
  if (template !== 'DEFAULT') return template;

  if (isQuestMetadataPresent(input.metadata)) return 'QUEST';

  if (isSceneMetadataPresent(input.metadata)) return 'SCENE';

  const entityCategory = readEntityCategoryFromMetadata(input.metadata);
  if (entityCategory && ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory]) {
    return ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory];
  }

  return 'DEFAULT';
}
