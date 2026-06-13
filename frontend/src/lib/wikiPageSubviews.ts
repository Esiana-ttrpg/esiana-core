import type { AppearanceMode } from '@/lib/entitySurfaceProfile';
import type { WikiPageBlock, WikiPageBlockType } from '@/types/wiki';

export type WikiPageSubview =
  | 'overview'
  | 'lore'
  | 'appearance'
  | 'relationships'
  | 'timeline'
  | 'discovery'
  | 'continuity';

export const WIKI_PAGE_SUBVIEWS: { id: WikiPageSubview; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'lore', label: 'Lore' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'continuity', label: 'Continuity' },
];

const READER_SUBVIEWS: WikiPageSubview[] = [
  'overview',
  'lore',
  'appearance',
  'relationships',
  'timeline',
];

const DM_ONLY_SUBVIEWS: WikiPageSubview[] = ['discovery', 'continuity'];

const SUBVIEW_BLOCK_TYPES: Record<WikiPageSubview, WikiPageBlockType[] | 'all'> = {
  overview: [
    'entity-hero',
    'entity-org-hero',
    'entity-family-hero',
    'entity-location-hero',
    'entity-bestiary-hero',
    'entity-ancestry-hero',
    'text-biography',
    'text-tiptap',
    'image-display',
    'wiki-infobox',
    'stat-block',
    'entity-document',
  ],
  lore: [
    'text-tiptap',
    'text-biography',
    'image-display',
    'wiki-infobox',
  ],
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

/** Reader + DM subview tabs for editorial wiki pages. */
export function getVisibleSubviews(
  appearanceMode: AppearanceMode,
  isDMUser: boolean,
): WikiPageSubview[] {
  const reader = READER_SUBVIEWS.filter(
    (id) => id !== 'appearance' || appearanceMode === 'full',
  );
  if (!isDMUser) return reader;
  return [...reader, ...DM_ONLY_SUBVIEWS];
}

/** Generic blocks always visible unless subview is discovery-only (discovery has strict list). */
export function filterBlocksForSubview(
  blocks: WikiPageBlock[],
  subview: WikiPageSubview,
  isDMUser: boolean,
): WikiPageBlock[] {
  const allowed = SUBVIEW_BLOCK_TYPES[subview];
  if (allowed === 'all') return blocks;
  if (subview === 'discovery' && !isDMUser) return [];
  return blocks.filter((b) => allowed.includes(b.type));
}

export function subviewForBlockType(type: WikiPageBlockType): WikiPageSubview {
  if (type === 'entity-discovery') {
    return 'discovery';
  }
  if (type === 'entity-timeline') return 'timeline';
  if (type === 'entity-appearance') return 'appearance';
  if (type === 'entity-relationships' || type === 'wiki-backlinks') {
    return 'relationships';
  }
  if (type === 'entity-hero' || type === 'text-biography') return 'overview';
  return 'overview';
}

export function isValidSubview(
  subview: WikiPageSubview,
  appearanceMode: AppearanceMode,
  isDMUser: boolean,
): boolean {
  return getVisibleSubviews(appearanceMode, isDMUser).includes(subview);
}

/** Lore overlay sections (identity, interpretations, sources) above the grid. */
export function shouldShowLoreSemanticSections(
  pageSubview: WikiPageSubview,
  showSectionSubviews: boolean,
  entityDetailTab: 'lore' | 'structure',
): boolean {
  if (pageSubview === 'lore') return true;
  if (!showSectionSubviews && entityDetailTab === 'lore') return true;
  return false;
}
