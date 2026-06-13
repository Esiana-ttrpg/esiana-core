import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';
import { isSceneMetadataPresent } from '@/lib/sceneMetadata';
import { isObjectiveMetadataPresent } from '@/lib/objectiveMetadata';

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

function readEntityCategoryFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>).entityCategory;
  if (typeof value !== 'string' || !value.trim()) return null;
  return normalizeEntityCategoryKey(value.trim());
}

function isQuestMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return (
    raw.questStatus !== undefined ||
    raw.questType !== undefined ||
    raw.boardOrder !== undefined
  );
}

export function resolveWikiCodexType(input: {
  templateType: string;
  metadata?: unknown;
}): string {
  const template = input.templateType?.trim().toUpperCase() || 'DEFAULT';
  if (template !== 'DEFAULT') return template;

  if (isQuestMetadataPresent(input.metadata)) return 'QUEST';

  if (isSceneMetadataPresent(input.metadata)) return 'SCENE';

  if (isObjectiveMetadataPresent(input.metadata)) return 'OBJECTIVE';

  const entityCategory = readEntityCategoryFromMetadata(input.metadata);
  if (entityCategory && ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory]) {
    return ENTITY_CATEGORY_TO_CODEX_TYPE[entityCategory];
  }

  return 'DEFAULT';
}
