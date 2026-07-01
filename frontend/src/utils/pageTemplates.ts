import type { WikiPageBlock } from '@/types/wiki';
import type { AppearanceMode, SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { WIKI_GRID_COLS } from './wikiGrid';
import { createBlockContentForType, getDefaultBlockTitle } from './wikiWidgets';

export type WikiPageTemplateType =
  | 'DEFAULT'
  | 'CHARACTER'
  | 'LOCATION'
  | 'ORGANIZATION'
  | 'FAMILY';

export function createWikiBlock(
  type: WikiPageBlock['type'],
  x: number,
  y: number,
  w = 1,
  h = 1,
  content?: Record<string, unknown>,
): WikiPageBlock {
  const resolvedContent = content ?? createBlockContentForType(type);

  return {
    id: crypto.randomUUID(),
    type,
    title: getDefaultBlockTitle(type),
    x,
    y,
    w,
    h,
    content: resolvedContent,
    isPrivate: false,
    visibility: 'Party',
  };
}

function createBlock(
  type: WikiPageBlock['type'],
  x: number,
  y: number,
  w: number,
  h: number,
  content: Record<string, unknown> = {},
  isPrivate = false,
): WikiPageBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title: getDefaultBlockTitle(type),
    x,
    y,
    w,
    h,
    content,
    isPrivate,
  };
}

/** Editorial CHARACTER layout — system blocks + content tabs. */
export function buildCharacterEditorialBlocks(): WikiPageBlock[] {
  return [
    createBlock('entity-hero', 0, 0, 3, 1),
    createBlock('text-biography', 0, 1, 3, 2, { markdown: '' }),
    createBlock('wiki-infobox', 0, 3, 3, 1, { fields: [] }),
    createBlock('entity-appearance', 0, 4, 3, 1),
    createBlock('entity-relationships', 0, 5, 3, 1),
    createBlock('entity-timeline', 0, 6, 3, 1),
    createBlock('entity-discovery', 0, 7, 3, 1),
  ];
}

/** Inject appearance block when profile supports full appearance tab. */
export function ensureAppearanceBlock(
  blocks: WikiPageBlock[],
  appearanceMode: AppearanceMode,
): WikiPageBlock[] {
  if (appearanceMode !== 'full') return blocks;
  if (blocks.some((b) => b.type === 'entity-appearance')) return blocks;
  const maxY = blocks.reduce((max, block) => Math.max(max, block.y + block.h), 0);
  return [...blocks, createWikiBlock('entity-appearance', 0, maxY, 3, 1)];
}

const GENERIC_ONLY_TYPES = new Set([
  'text-tiptap',
  'image-display',
  'wiki-infobox',
  'stat-block',
  'wiki-backlinks',
]);

function hasSemanticBlocks(
  templateType: WikiPageTemplateType,
  blocks: WikiPageBlock[],
): boolean {
  const t = templateType;
  if (t === 'CHARACTER') {
    return blocks.some((b) =>
      [
        'entity-hero',
        'text-biography',
        'entity-relationships',
        'entity-timeline',
        'entity-discovery',
      ].includes(b.type),
    );
  }
  if (t === 'ORGANIZATION') {
    return blocks.some((b) =>
      ['entity-org-hero', 'entity-relationships'].includes(b.type),
    );
  }
  if (t === 'FAMILY') {
    return blocks.some((b) =>
      ['entity-family-hero', 'entity-relationships'].includes(b.type),
    );
  }
  if (t === 'LOCATION') {
    return blocks.some((b) => b.type === 'entity-location-hero');
  }
  return true;
}

/** Ensure every block has a stable unique id (legacy data sometimes used type strings). */
export function ensureUniqueWikiBlockIds(blocks: WikiPageBlock[]): WikiPageBlock[] {
  const seen = new Set<string>();
  return blocks.map((block) => {
    let id = typeof block.id === 'string' ? block.id.trim() : '';
    if (!id || seen.has(id)) {
      id = crypto.randomUUID();
    }
    seen.add(id);
    return id === block.id ? block : { ...block, id };
  });
}

/** Replace legacy/generic layouts with template semantic defaults (destructive). */
export function resolveSemanticPageBlocks(
  templateType: WikiPageTemplateType,
  blocks: WikiPageBlock[],
): WikiPageBlock[] {
  if (blocks.length === 0) {
    return buildDefaultBlocks(templateType).map((b) => ({ ...b, h: 1 }));
  }

  const genericOnly = blocks.every((b) => GENERIC_ONLY_TYPES.has(b.type));
  const needsSemantic =
    (templateType === 'CHARACTER' ||
      templateType === 'ORGANIZATION' ||
      templateType === 'FAMILY' ||
      templateType === 'LOCATION') &&
    (genericOnly || !hasSemanticBlocks(templateType, blocks));

  if (needsSemantic) {
    return ensureUniqueWikiBlockIds(
      buildDefaultBlocks(templateType).map((b) => ({ ...b, h: 1 })),
    );
  }

  return ensureUniqueWikiBlockIds(
    blocks.map((b) => clampBlockToGrid({ ...b, h: 1 })),
  );
}

function buildPass2EntityBlocks(surfaceKey: SurfaceProfileKey): WikiPageBlock[] | null {
  if (surfaceKey === 'bestiary') {
    return [
      createBlock('entity-bestiary-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 3, 2, { markdown: '' }),
      createBlock('wiki-infobox', 0, 3, 3, 1, { fields: [] }),
      createBlock('entity-appearance', 0, 4, 3, 1),
      createBlock('entity-relationships', 0, 5, 3, 1),
      createBlock('entity-discovery', 0, 6, 3, 1),
      createBlock('wiki-backlinks', 0, 7, 3, 1),
    ];
  }
  if (surfaceKey === 'ancestry') {
    return [
      createBlock('entity-ancestry-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
      createBlock('entity-relationships', 0, 3, 3, 1),
      createBlock('wiki-backlinks', 0, 4, 3, 1),
    ];
  }
  if (surfaceKey === 'object') {
    return [
      createBlock('text-tiptap', 0, 0, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 0, 1, 2, { fields: [] }),
      createBlock('entity-relationships', 0, 2, 3, 1),
      createBlock('wiki-backlinks', 0, 3, 3, 1),
    ];
  }
  return null;
}

export function buildDefaultBlocks(
  templateType: WikiPageTemplateType,
  surfaceKey?: SurfaceProfileKey,
): WikiPageBlock[] {
  if (templateType === 'CHARACTER') {
    return buildCharacterEditorialBlocks();
  }

  if (templateType === 'LOCATION') {
    return [
      createBlock('entity-location-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
      createBlock('entity-relationships', 0, 3, 3, 1),
      createBlock('wiki-backlinks', 0, 4, 3, 1),
    ];
  }

  if (templateType === 'ORGANIZATION') {
    return [
      createBlock('entity-org-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
      createBlock('entity-relationships', 0, 3, 3, 1),
    ];
  }

  if (templateType === 'FAMILY') {
    return [
      createBlock('entity-family-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
      createBlock('entity-relationships', 0, 3, 3, 1),
    ];
  }

  if (surfaceKey) {
    const pass2 = buildPass2EntityBlocks(surfaceKey);
    if (pass2) return pass2;
  }

  return [
    createBlock('text-tiptap', 0, 0, 2, 2, { markdown: '' }),
    createBlock('wiki-infobox', 2, 0, 1, 2, { fields: [] }),
  ];
}

export function buildQuestDefaultBlocks(options?: { markdown?: string }): WikiPageBlock[] {
  return [
    createBlock('entity-quest-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

export function buildThreadDefaultBlocks(options?: { markdown?: string }): WikiPageBlock[] {
  return [
    createBlock('entity-thread-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

/** Default layout for event lore wiki pages (`event-{calendarEventId}`). */
export function buildEventLoreBlocks(
  descriptionMarkdown: string | null = null,
): WikiPageBlock[] {
  return [
    {
      ...createBlock('text-tiptap', 0, 0, 2, 2, {
        markdown: descriptionMarkdown ?? '',
      }),
      title: 'Description',
    },
  ];
}

/** Clamp block geometry to the 3-column grid bounds. */
export function clampBlockToGrid(block: WikiPageBlock): WikiPageBlock {
  const x = Math.min(Math.max(0, block.x), WIKI_GRID_COLS - 1);
  const w = Math.min(Math.max(1, block.w), WIKI_GRID_COLS - x);
  const y = Math.max(0, block.y);
  const h = Math.max(1, block.h);
  return { ...block, x, y, w, h };
}
