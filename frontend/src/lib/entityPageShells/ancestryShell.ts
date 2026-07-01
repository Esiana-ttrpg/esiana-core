import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const ANCESTRY_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'lineages', label: 'Lineages', navPriority: 1, collapseGroup: 'primary' },
  { id: 'societies', label: 'Societies', navPriority: 2, collapseGroup: 'primary' },
  { id: 'presence', label: 'Presence', navPriority: 3, collapseGroup: 'primary' },
  { id: 'relations', label: 'Relations', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'characters', label: 'Characters', navPriority: 5, collapseGroup: 'secondary' },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  relations: ['entity-relationships', 'wiki-backlinks'],
};

function visibleSubviews(): EntitySubviewDef[] {
  return ANCESTRY_SUBVIEWS;
}

export const ancestryPageShell: EntityPageShell = {
  key: 'ancestry',
  subviews: ANCESTRY_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-ancestry-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Ancestry identity',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Cultural profile',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Cultural notes',
    },
  ],
  getVisibleSubviews: visibleSubviews,
  isValidSubview(subview) {
    return visibleSubviews().some((t) => t.id === subview);
  },
  filterBlocksForSubview(blocks, subview) {
    if (subview === 'overview') return [];
    const allowed = CONTENT_TAB_BLOCKS[subview];
    if (!allowed) return [];
    return blocks.filter((b) => allowed.includes(b.type));
  },
  filterLayoutBlocks(blocks, { showGridLines, subview }) {
    if (subview === 'overview') return [];
    if (showGridLines) return blocks;
    return blocks.filter((b) => {
      const isSystem = ancestryPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'entity-relationships' || type === 'wiki-backlinks') {
      return 'relations';
    }
    if (type === 'text-tiptap' || type === 'text-biography') return 'overview';
    return 'overview';
  },
};

export function isAncestrySubview(id: EntitySubviewId): boolean {
  return ANCESTRY_SUBVIEWS.some((t) => t.id === id);
}
