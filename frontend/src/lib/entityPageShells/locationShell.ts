import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const LOCATION_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'people', label: 'People', navPriority: 1, collapseGroup: 'primary' },
  { id: 'places', label: 'Places', navPriority: 2, collapseGroup: 'primary' },
  { id: 'organizations', label: 'Organizations', navPriority: 3, collapseGroup: 'primary' },
  { id: 'events', label: 'Events', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'connections', label: 'Connections', navPriority: 5, collapseGroup: 'secondary' },
  { id: 'timeline', label: 'Timeline', navPriority: 6, collapseGroup: 'secondary' },
  { id: 'lore', label: 'Lore', navPriority: 7, collapseGroup: 'secondary' },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  lore: ['text-tiptap', 'text-biography', 'image-display', 'wiki-backlinks'],
};

function visibleSubviews(): EntitySubviewDef[] {
  return LOCATION_SUBVIEWS;
}

export const locationPageShell: EntityPageShell = {
  key: 'location',
  subviews: LOCATION_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-location-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Location identity',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: false,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Legacy infobox',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Location description',
    },
  ],
  getVisibleSubviews: visibleSubviews,
  isValidSubview(subview) {
    return visibleSubviews().some((t) => t.id === subview);
  },
  filterBlocksForSubview(blocks, subview) {
    if (
      subview === 'overview' ||
      subview === 'people' ||
      subview === 'places' ||
      subview === 'organizations' ||
      subview === 'events' ||
      subview === 'connections' ||
      subview === 'timeline'
    ) {
      return [];
    }
    const allowed = CONTENT_TAB_BLOCKS[subview];
    if (!allowed) return [];
    return blocks.filter((b) => allowed.includes(b.type));
  },
  filterLayoutBlocks(blocks, { showGridLines, subview }) {
    if (subview !== 'lore') return [];
    if (showGridLines) return blocks;
    return blocks.filter((b) => {
      const isSystem = locationPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'text-tiptap' || type === 'text-biography') return 'lore';
    if (type === 'wiki-backlinks') return 'lore';
    return 'overview';
  },
};

export function isLocationSubview(id: EntitySubviewId): boolean {
  return LOCATION_SUBVIEWS.some((t) => t.id === id);
}
