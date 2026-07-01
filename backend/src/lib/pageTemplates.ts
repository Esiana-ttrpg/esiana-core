import { randomUUID } from 'node:crypto';

export const WIKI_GRID_COLS = 3;

export type WikiBlockSeed = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: Record<string, unknown>;
  isPrivate: boolean;
};

function createBlock(
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: Record<string, unknown> = {},
): WikiBlockSeed {
  return {
    id: randomUUID(),
    type,
    x,
    y,
    w,
    h,
    content,
    isPrivate: false,
  };
}

/**
 * Default block layout for new wiki pages (3-column grid coordinates).
 * Mirrors frontend `buildDefaultBlocks` in `frontend/src/utils/pageTemplates.ts`.
 */
export function buildDefaultBlocks(templateType = 'DEFAULT'): WikiBlockSeed[] {
  if (templateType === 'CHARACTER') {
    return [
      createBlock('entity-hero', 0, 0, 3, 1),
      createBlock('text-biography', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
      createBlock('entity-appearance', 0, 3, 3, 1),
      createBlock('wiki-backlinks', 0, 4, 3, 1),
    ];
  }

  if (templateType === 'LOCATION') {
    return [
      createBlock('entity-location-hero', 0, 0, 3, 1),
      createBlock('text-tiptap', 0, 1, 2, 2, { markdown: '' }),
      createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
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

  return [
    createBlock('text-tiptap', 0, 0, 2, 2, { markdown: '' }),
    createBlock('wiki-infobox', 2, 0, 1, 2, { fields: [] }),
  ];
}

/** Default layout for narrative thread wiki pages under Game → Narrative Threads. */
export function buildThreadDefaultBlocks(options?: { markdown?: string }): WikiBlockSeed[] {
  return [
    createBlock('entity-thread-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

export function buildObjectiveDefaultBlocks(options?: { markdown?: string }): WikiBlockSeed[] {
  return [
    createBlock('entity-objective-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

export function buildArcDefaultBlocks(options?: { markdown?: string }): WikiBlockSeed[] {
  return [
    createBlock('entity-arc-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

export function buildSceneDefaultBlocks(options?: { markdown?: string }): WikiBlockSeed[] {
  return [
    createBlock('entity-scene-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

export function buildQuestDefaultBlocks(options?: { markdown?: string }): WikiBlockSeed[] {
  return [
    createBlock('entity-quest-properties', 0, 0, 3, 1),
    createBlock('text-tiptap', 0, 1, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 1, 1, 2, { fields: [] }),
  ];
}

/** Default layout for downtime project wiki pages (`DOWNTIME_PROJECT`). */
export function buildDowntimeProjectDefaultBlocks(options?: {
  markdown?: string;
}): WikiBlockSeed[] {
  return [
    createBlock('text-tiptap', 0, 0, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 0, 1, 2, { fields: [] }),
  ];
}

/** Default layout for downtime haven wiki pages (`DOWNTIME_HAVEN`). */
export function buildDowntimeHavenDefaultBlocks(options?: {
  markdown?: string;
}): WikiBlockSeed[] {
  return [
    createBlock('text-tiptap', 0, 0, 2, 2, { markdown: options?.markdown ?? '' }),
    createBlock('wiki-infobox', 2, 0, 1, 2, { fields: [] }),
  ];
}

/** Default layout for event lore wiki pages (`event-{calendarEventId}`). */
export function buildEventLoreBlocks(descriptionMarkdown: string | null = null): WikiBlockSeed[] {
  return [
    createBlock('text-tiptap', 0, 0, 2, 2, {
      markdown: descriptionMarkdown ?? '',
      title: 'Description',
    }),
  ];
}
