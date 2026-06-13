import type { WikiPageBlockType } from '@/types/wiki';
import type { EntityPageShell, EntitySubviewDef, EntitySubviewId } from './types';

export const BESTIARY_SUBVIEWS: EntitySubviewDef[] = [
  { id: 'overview', label: 'Overview', navPriority: 0, collapseGroup: 'primary' },
  { id: 'encounters', label: 'Encounters', navPriority: 1, collapseGroup: 'primary' },
  { id: 'combat', label: 'Combat', navPriority: 2, collapseGroup: 'primary' },
  { id: 'appearance', label: 'Appearance', navPriority: 3, collapseGroup: 'primary' },
  { id: 'relationships', label: 'Related', navPriority: 4, collapseGroup: 'secondary' },
  { id: 'lore', label: 'Lore', navPriority: 5, collapseGroup: 'secondary' },
  { id: 'discovery', label: 'Discovery', navPriority: 6, collapseGroup: 'dm', dmOnly: true },
  { id: 'continuity', label: 'Continuity', navPriority: 7, collapseGroup: 'dm', dmOnly: true },
];

const CONTENT_TAB_BLOCKS: Record<string, WikiPageBlockType[]> = {
  encounters: ['text-tiptap', 'entity-relationships', 'image-display'],
  combat: ['text-tiptap', 'stat-block'],
  appearance: ['entity-appearance', 'image-display'],
  relationships: ['entity-relationships', 'wiki-backlinks'],
  lore: ['text-tiptap', 'text-biography', 'image-display'],
  discovery: ['entity-discovery'],
  continuity: ['wiki-backlinks', 'text-tiptap', 'text-biography'],
};

function visibleSubviews(isDMUser: boolean): EntitySubviewDef[] {
  return BESTIARY_SUBVIEWS.filter((tab) => !tab.dmOnly || isDMUser);
}

export const bestiaryPageShell: EntityPageShell = {
  key: 'bestiary',
  subviews: BESTIARY_SUBVIEWS,
  systemBlocks: [
    {
      type: 'entity-bestiary-hero',
      role: 'identity',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Creature identity',
    },
    {
      type: 'wiki-infobox',
      role: 'vitals',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Combat intel',
    },
    {
      type: 'text-tiptap',
      role: 'biography',
      required: true,
      layoutHidden: true,
      deleteProtected: true,
      layoutGridGhost: true,
      ghostLabel: 'Field notes',
    },
  ],
  railSectionOrder: ['callout', 'discovery', 'relations', 'continuity'],
  railSectionsHidden: ['provenance', 'threads', 'timeline'],
  defaultRailOpen: false,
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
      const isSystem = bestiaryPageShell.systemBlocks.some(
        (def) => def.type === b.type && def.layoutHidden,
      );
      return !isSystem;
    });
  },
  subviewForBlockType(type) {
    if (type === 'entity-discovery') return 'discovery';
    if (type === 'entity-appearance') return 'appearance';
    if (type === 'entity-relationships' || type === 'wiki-backlinks') {
      return 'relationships';
    }
    if (type === 'stat-block') return 'combat';
    if (type === 'text-biography' || type === 'text-tiptap') return 'lore';
    return 'overview';
  },
  immatureTabPlaceholder(subview) {
    const messages: Record<string, { title: string; body: string }> = {
      encounters: {
        title: 'Encounters',
        body: 'Where and how the party has met this creature will be recorded here.',
      },
      combat: {
        title: 'Combat',
        body: 'Tactics, attack patterns, and observed behavior — not raw stat dumps.',
      },
      lore: {
        title: 'Lore',
        body: 'Myths, expedition records, and hunter journals will accumulate here.',
      },
      discovery: {
        title: 'Discovery',
        body: 'Track what the party knows — revealed forms and gated truths.',
      },
      continuity: {
        title: 'Continuity',
        body: 'Unresolved sightings, contradictions, and orphaned references.',
      },
    };
    const msg = messages[subview];
    if (!msg) return null;
    return null;
  },
};

export function isBestiarySubview(id: EntitySubviewId): boolean {
  return BESTIARY_SUBVIEWS.some((t) => t.id === id);
}
