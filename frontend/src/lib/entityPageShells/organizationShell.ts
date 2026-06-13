import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const ORGANIZATION_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'structure', label: 'Structure', navPriority: 1, collapseGroup: 'primary' },
  { id: 'presence', label: 'Presence', navPriority: 2, collapseGroup: 'primary' },
  { id: 'relations', label: 'Relations', navPriority: 3, collapseGroup: 'secondary' },
  { id: 'people', label: 'People', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'lore', label: 'Lore', navPriority: 5, collapseGroup: 'secondary' },
  { id: 'continuity', label: 'Continuity', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  relations: ['entity-relationships', 'wiki-backlinks'],
  lore: ['text-tiptap', 'text-biography', 'wiki-infobox'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

function visibleSubviews(isDMUser: boolean): EntitySubviewDef[] {
  return ORGANIZATION_SUBVIEWS.filter((tab) => !tab.dmOnly || isDMUser);
}

export const organizationPageShell: EntityPageShell = {
  key: 'organization',
  subviews: ORGANIZATION_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-org-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Organization identity',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Organization profile',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Historical notes',
    },
  ],
  railSectionOrder: ['callout', 'relations'],
  railSectionsHidden: ['provenance', 'threads', 'timeline', 'discovery', 'continuity'],
  defaultRailOpen: false,
  getVisibleSubviews: visibleSubviews,
  isValidSubview(subview, isDMUser) {
    return visibleSubviews(isDMUser).some((t) => t.id === subview);
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
      const isSystem = organizationPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'entity-relationships' || type === 'wiki-backlinks') {
      return 'relations';
    }
    if (type === 'text-tiptap' || type === 'text-biography' || type === 'wiki-infobox') {
      return 'lore';
    }
    return 'overview';
  },
};

export function isOrganizationSubview(id: EntitySubviewId): boolean {
  return ORGANIZATION_SUBVIEWS.some((t) => t.id === id);
}
