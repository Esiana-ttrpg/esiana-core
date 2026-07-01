import type { AppearanceMode } from '../entitySurfaceProfile';
import type { WikiPageBlock, WikiPageBlockType } from '@/types/wiki';
import {
  getVisibleSubviews,
  isValidSubview,
  subviewForBlockType,
  type WikiPageSubview,
} from '../wikiPageSubviews';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

const NARRATIVE_PROPERTY_BLOCKS: WikiPageBlockType[] = [
  'entity-quest-properties',
  'entity-thread-properties',
  'entity-scene-properties',
  'entity-arc-properties',
  'entity-objective-properties',
];

const OVERVIEW_BLOCKS: WikiPageBlockType[] = [
  'entity-hero',
  'entity-org-hero',
  'entity-family-hero',
  'entity-location-hero',
  'entity-bestiary-hero',
  'entity-ancestry-hero',
  ...NARRATIVE_PROPERTY_BLOCKS,
  'text-biography',
  'text-tiptap',
  'image-display',
  'wiki-infobox',
  'stat-block',
  'entity-document',
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  lore: ['text-tiptap', 'text-biography', 'image-display', 'wiki-infobox'],
  appearance: ['entity-appearance', 'image-display'],
  relationships: [
    'entity-relationships',
    'wiki-backlinks',
    'entity-hero',
    'entity-org-hero',
    'entity-family-hero',
    'entity-bestiary-hero',
    'entity-ancestry-hero',
  ],
  timeline: ['entity-timeline', 'text-tiptap'],
  discovery: ['entity-discovery'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

export const GENERIC_WIKI_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'lore', label: 'Lore', navPriority: 1, collapseGroup: 'primary' },
  { id: 'appearance', label: 'Appearance', navPriority: 2, collapseGroup: 'primary' },
  { id: 'relationships', label: 'Relationships', navPriority: 3, collapseGroup: 'secondary' },
  { id: 'timeline', label: 'Timeline', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'discovery', label: 'Discovery', navPriority: 5, collapseGroup: 'dm', dmOnly: true },
  { id: 'continuity', label: 'Continuity', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
];

function visibleSubviews(
  appearanceMode: AppearanceMode,
  isDMUser: boolean,
): EntitySubviewDef[] {
  const allowedIds = new Set(
    getVisibleSubviews(appearanceMode, isDMUser),
  );
  return GENERIC_WIKI_SUBVIEWS.filter((tab) => allowedIds.has(tab.id as WikiPageSubview));
}

function filterForSubview(
  blocks: WikiPageBlock[],
  subview: EntitySubviewId,
  isDMUser: boolean,
  appearanceMode: AppearanceMode,
): WikiPageBlock[] {
  if (!isValidSubview(subview as WikiPageSubview, appearanceMode, isDMUser)) {
    return [];
  }
  if (subview === 'overview') {
    return blocks.filter((b) => OVERVIEW_BLOCKS.includes(b.type));
  }
  const allowed = CONTENT_TAB_BLOCKS[subview];
  if (!allowed) return [];
  if (subview === 'discovery' && !isDMUser) return [];
  return blocks.filter((b) => allowed.includes(b.type));
}

export function createGenericWikiPageShell(
  appearanceMode: AppearanceMode,
): EntityPageShell {
  return {
    key: 'default',
    subviews: visibleSubviews(appearanceMode, true),
    systemBlocks: [],
    getVisibleSubviews: (isDMUser) => visibleSubviews(appearanceMode, isDMUser),
    isValidSubview(subview, isDMUser) {
      return visibleSubviews(appearanceMode, isDMUser).some((t) => t.id === subview);
    },
    filterBlocksForSubview(blocks, subview, isDMUser) {
      return filterForSubview(blocks, subview, isDMUser, appearanceMode);
    },
    filterLayoutBlocks(blocks) {
      return blocks;
    },
    subviewForBlockType(type) {
      if (NARRATIVE_PROPERTY_BLOCKS.includes(type)) return 'overview';
      return subviewForBlockType(type);
    },
  };
}

/** Shared fallback shell with default appearance gating. */
export const genericWikiPageShell = createGenericWikiPageShell('none');
