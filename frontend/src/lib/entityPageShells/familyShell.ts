import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const FAMILY_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'lore', label: 'Lore', navPriority: 1, collapseGroup: 'primary' },
  { id: 'lineage', label: 'Lineage', navPriority: 2, collapseGroup: 'primary' },
  { id: 'relationships', label: 'Relationships', navPriority: 3, collapseGroup: 'secondary' },
  { id: 'timeline', label: 'Timeline', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'discovery', label: 'Discovery', navPriority: 5, collapseGroup: 'dm', dmOnly: true },
  { id: 'continuity', label: 'Continuity', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
];

const LORE_BLOCKS: WikiPageBlockType[] = [
  'text-tiptap',
  'text-biography',
  'image-display',
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  lore: LORE_BLOCKS,
  relationships: [
    'entity-relationships',
    'wiki-backlinks',
    'entity-family-hero',
  ],
  timeline: ['entity-timeline', 'text-tiptap'],
  discovery: ['entity-discovery'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

function visibleSubviews(isDMUser: boolean): EntitySubviewDef[] {
  return FAMILY_SUBVIEWS.filter((tab) => !tab.dmOnly || isDMUser);
}

export const familyPageShell: EntityPageShell = {
  key: 'family',
  subviews: FAMILY_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-family-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Family identity',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Family profile',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'House history',
    },
  ],
  getVisibleSubviews: visibleSubviews,
  isValidSubview(subview, isDMUser) {
    return visibleSubviews(isDMUser).some((t) => t.id === subview);
  },
  filterBlocksForSubview(blocks, subview, isDMUser) {
    if (subview === 'overview') return [];
    if (subview === 'lineage') return [];
    const allowed = CONTENT_TAB_BLOCKS[subview];
    if (!allowed) return [];
    if (subview === 'discovery' && !isDMUser) return [];
    return blocks.filter((b) => allowed.includes(b.type));
  },
  filterLayoutBlocks(blocks, { showGridLines, subview }) {
    if (subview === 'overview' || subview === 'lineage') return [];
    if (showGridLines) return blocks;
    return blocks.filter((b) => {
      const isSystem = familyPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'entity-discovery') return 'discovery';
    if (type === 'entity-timeline') return 'timeline';
    if (type === 'entity-relationships' || type === 'wiki-backlinks') {
      return 'relationships';
    }
    if (type === 'text-tiptap' || type === 'text-biography') {
      return 'lore';
    }
    if (type === 'wiki-infobox') {
      return 'overview';
    }
    return 'overview';
  },
};

export function isFamilySubview(id: EntitySubviewId): boolean {
  return FAMILY_SUBVIEWS.some((t) => t.id === id);
}
