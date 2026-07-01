import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';
import { isSceneMetadataPresent } from '@/lib/sceneMetadata';
import { isObjectiveMetadataPresent } from '@/lib/objectiveMetadata';
import {
  isStructuralTemplateType,
  readEntityCategoryFromMetadata,
} from '@shared/wikiTemplateType';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import type { WikiTreeNode } from '@/types/wiki';

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
  id?: string;
  title?: string;
  parentId?: string | null;
  flatPages?: readonly WikiTreeNode[];
}): string {
  const template = input.templateType?.trim().toUpperCase() || 'DEFAULT';
  if (isStructuralTemplateType(template)) return template;

  if (isQuestMetadataPresent(input.metadata)) return 'QUEST';
  if (isSceneMetadataPresent(input.metadata)) return 'SCENE';
  if (isObjectiveMetadataPresent(input.metadata)) return 'OBJECTIVE';

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
