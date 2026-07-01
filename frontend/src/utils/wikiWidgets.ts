import type { WikiPageBlock, WikiPageBlockType } from '@/types/wiki';
import type { AppearanceMode } from '@/lib/entitySurfaceProfile';

export function getDefaultBlockTitle(type: WikiPageBlockType): string {
  switch (type) {
    case 'text-tiptap':
      return 'Text';
    case 'text-biography':
      return 'Biography';
    case 'image-display':
      return 'Image';
    case 'stat-block':
      return 'Stat Block';
    case 'wiki-infobox':
      return 'Details';
    case 'wiki-backlinks':
      return 'Connected knowledge';
    case 'entity-hero':
      return 'Character overview';
    case 'entity-appearance':
      return 'Appearance';
    case 'entity-relationships':
      return 'Relationships';
    case 'entity-timeline':
      return 'Timeline';
    case 'entity-discovery':
      return 'Discovery';
    case 'entity-org-hero':
      return 'Organization overview';
    case 'entity-family-hero':
      return 'Family overview';
    case 'entity-location-hero':
      return 'Location overview';
    case 'entity-bestiary-hero':
      return 'Creature profile';
    case 'entity-ancestry-hero':
      return 'Ancestry profile';
    case 'entity-document':
      return 'Document settings';
    case 'entity-quest-properties':
      return 'Quest details';
    case 'entity-thread-properties':
      return 'Thread orchestration';
    case 'entity-scene-properties':
      return 'Scene orchestration';
    case 'entity-arc-properties':
      return 'Arc details';
    case 'entity-objective-properties':
      return 'Objective details';
    default:
      return 'Widget';
  }
}

export function getBlockDisplayTitle(block: WikiPageBlock): string {
  const custom = block.title?.trim();
  if (custom) return custom;
  return getDefaultBlockTitle(block.type);
}

const GENERIC_WIDGET_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'text-tiptap', label: 'Text' },
  { value: 'text-biography', label: 'Biography' },
  { value: 'image-display', label: 'Image' },
  { value: 'stat-block', label: 'Stat Block' },
  { value: 'wiki-infobox', label: 'Details' },
  { value: 'wiki-backlinks', label: 'Connected knowledge' },
];

const CHARACTER_SEMANTIC_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'entity-hero', label: 'Character overview' },
  { value: 'entity-appearance', label: 'Appearance' },
  { value: 'text-biography', label: 'Biography' },
  { value: 'entity-relationships', label: 'Relationships' },
  { value: 'entity-timeline', label: 'Timeline' },
  { value: 'entity-discovery', label: 'Discovery' },
];

const ORGANIZATION_SEMANTIC_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'entity-org-hero', label: 'Organization overview' },
  { value: 'entity-relationships', label: 'Relationships' },
];

const FAMILY_SEMANTIC_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'entity-family-hero', label: 'Family overview' },
  { value: 'entity-relationships', label: 'Relationships' },
];

const LOCATION_SEMANTIC_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'entity-location-hero', label: 'Location overview' },
];

const BESTIARY_SEMANTIC_OPTIONS: Array<{ value: WikiPageBlockType; label: string }> = [
  { value: 'entity-bestiary-hero', label: 'Creature profile' },
  { value: 'entity-appearance', label: 'Appearance' },
  { value: 'entity-relationships', label: 'Relationships' },
  { value: 'entity-discovery', label: 'Discovery' },
];

/** Shared widget catalog for wiki page editing. */
export function getWikiWidgetOptions(
  templateType?: string,
  options?: {
    includeGeneric?: boolean;
    appearanceMode?: AppearanceMode;
    surfaceKey?: string;
  },
): Array<{ value: WikiPageBlockType; label: string; group?: string }> {
  const t = templateType?.trim().toUpperCase() ?? '';
  const appearanceMode = options?.appearanceMode ?? 'none';
  const includeGeneric = options?.includeGeneric !== false;
  const semantic: Array<{ value: WikiPageBlockType; label: string; group?: string }> = [];

  if (t === 'CHARACTER') {
    semantic.push(
      ...CHARACTER_SEMANTIC_OPTIONS.map((o) => ({ ...o, group: 'Character' })),
    );
  } else if (t === 'ORGANIZATION') {
    semantic.push(
      ...ORGANIZATION_SEMANTIC_OPTIONS.map((o) => ({ ...o, group: 'Organization' })),
    );
  } else if (t === 'FAMILY') {
    semantic.push(
      ...FAMILY_SEMANTIC_OPTIONS.map((o) => ({ ...o, group: 'Family' })),
    );
  } else if (t === 'LOCATION') {
    semantic.push(
      ...LOCATION_SEMANTIC_OPTIONS.map((o) => ({ ...o, group: 'Location' })),
    );
  } else if (t === 'QUEST') {
    semantic.push(
      { value: 'entity-quest-properties', label: 'Quest details', group: 'Quest' },
    );
  } else if (t === 'THREAD') {
    semantic.push(
      { value: 'entity-thread-properties', label: 'Thread orchestration', group: 'Thread' },
    );
  } else if (t === 'SCENE') {
    semantic.push(
      { value: 'entity-scene-properties', label: 'Scene orchestration', group: 'Scene' },
    );
  }

  const surfaceKey = options?.surfaceKey?.trim().toLowerCase();
  if (!semantic.some((o) => o.value === 'entity-quest-properties') && surfaceKey === 'quest') {
    semantic.push(
      { value: 'entity-quest-properties', label: 'Quest details', group: 'Quest' },
    );
  }
  if (!semantic.some((o) => o.value === 'entity-thread-properties') && surfaceKey === 'thread') {
    semantic.push(
      { value: 'entity-thread-properties', label: 'Thread orchestration', group: 'Thread' },
    );
  }
  if (!semantic.some((o) => o.value === 'entity-scene-properties') && surfaceKey === 'scene') {
    semantic.push(
      { value: 'entity-scene-properties', label: 'Scene orchestration', group: 'Scene' },
    );
  }

  if (appearanceMode === 'full' && t !== 'CHARACTER') {
    semantic.push(
      ...BESTIARY_SEMANTIC_OPTIONS.map((o) => ({ ...o, group: 'Appearance' })),
    );
  }

  const generic = includeGeneric
    ? GENERIC_WIDGET_OPTIONS.map((o) => ({ ...o, group: 'Generic' }))
    : [];

  const merged = [...semantic, ...generic];

  const seen = new Set<WikiPageBlockType>();
  return merged.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

/** @deprecated Use getWikiWidgetOptions */
export const WIKI_WIDGET_OPTIONS = GENERIC_WIDGET_OPTIONS;

export function createBlockContentForType(
  type: WikiPageBlockType,
): Record<string, unknown> {
  if (type === 'text-tiptap' || type === 'text-biography') {
    return { markdown: '' };
  }
  if (type === 'image-display') {
    return { imageUrl: '', caption: '' };
  }
  if (type === 'stat-block') {
    return { fields: [{ key: 'HP', value: '' }, { key: 'AC', value: '' }] };
  }
  if (type === 'wiki-infobox') {
    return { fields: [] };
  }
  return {};
}
