import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const QUEST_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'lore', label: 'Lore', navPriority: 1, collapseGroup: 'primary' },
  { id: 'continuity', label: 'Continuity', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  lore: ['text-tiptap', 'text-biography', 'image-display'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

function visibleSubviews(isDMUser: boolean): EntitySubviewDef[] {
  return QUEST_SUBVIEWS.filter((tab) => !tab.dmOnly || isDMUser);
}

export const questPageShell: EntityPageShell = {
  key: 'quest',
  subviews: QUEST_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-quest-properties',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Quest details',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Quest description',
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
  ],
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
      const isSystem = questPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'text-tiptap' || type === 'text-biography') return 'lore';
    if (type === 'wiki-backlinks') return 'continuity';
    return 'overview';
  },
};

export function isQuestSubview(id: EntitySubviewId): boolean {
  return QUEST_SUBVIEWS.some((t) => t.id === id);
}
