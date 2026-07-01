import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const CHARACTER_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'biography', label: 'Biography', navPriority: 1, collapseGroup: 'primary' },
  { id: 'appearance', label: 'Appearance', navPriority: 2, collapseGroup: 'primary' },
  { id: 'relationships', label: 'Relationships', navPriority: 3, collapseGroup: 'secondary' },
  { id: 'timeline', label: 'Timeline', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'discovery', label: 'Discovery', navPriority: 5, collapseGroup: 'dm', dmOnly: true },
  { id: 'continuity', label: 'Continuity', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  biography: ['text-biography', 'text-tiptap', 'image-display'],
  appearance: ['entity-appearance', 'image-display'],
  relationships: ['entity-relationships', 'wiki-backlinks'],
  timeline: ['entity-timeline', 'text-tiptap'],
  discovery: ['entity-discovery'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

function visibleSubviews(isDMUser: boolean): EntitySubviewDef[] {
  return CHARACTER_SUBVIEWS.filter((tab) => !tab.dmOnly || isDMUser);
}

export const characterPageShell: EntityPageShell = {
  key: 'character',
  subviews: CHARACTER_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Identity data',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Profile data',
    },
    {
      type: 'text-biography',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Biography data',
    },
  ],
  getVisibleSubviews: visibleSubviews,
  isValidSubview(subview, isDMUser) {
    return visibleSubviews(isDMUser).some((t) => t.id === subview);
  },
  filterBlocksForSubview(blocks, subview, isDMUser) {
    if (subview === 'overview') return [];
    const allowed = CONTENT_TAB_BLOCKS[subview];
    if (!allowed) return [];
    if (subview === 'discovery' && !isDMUser) return [];
    return blocks.filter((b) => allowed.includes(b.type));
  },
  filterLayoutBlocks(blocks, { showGridLines, subview }) {
    if (subview === 'overview') return [];
    if (showGridLines) return blocks;
    return blocks.filter((b) => {
      const isSystem = characterPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'entity-discovery') return 'discovery';
    if (type === 'entity-timeline') return 'timeline';
    if (type === 'entity-appearance') return 'appearance';
    if (type === 'entity-relationships' || type === 'wiki-backlinks') {
      return 'relationships';
    }
    if (type === 'text-biography' || type === 'text-tiptap') return 'biography';
    return 'overview';
  },
  immatureTabPlaceholder(subview) {
    const messages: Record<string, { title: string; body: string }> = {
      timeline: {
        title: 'Timeline',
        body: 'Arc milestones, appearance changes, and major events will surface here as chronology hooks mature.',
      },
      discovery: {
        title: 'Discovery',
        body: 'Track what the party knows — revealed forms, aliases, and gated truths will live here.',
      },
      continuity: {
        title: 'Continuity',
        body: 'Unresolved threads, contradictions, and orphaned references will be reviewed here.',
      },
    };
    const msg = messages[subview];
    if (!msg) return null;
    return null; // rendered by CharacterPageShellView with dedicated component
  },
};

export function isCharacterSubview(id: EntitySubviewId): boolean {
  return CHARACTER_SUBVIEWS.some((t) => t.id === id);
}
