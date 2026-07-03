import { randomUUID } from 'node:crypto';
import type { WorkshopFieldShadow } from '../../../shared/workshopDocument.js';
import { isWorkshopProseBlockType } from '../../../shared/workshopFieldSchema.js';

const PROSE_BLOCK_TYPES = new Set(['text-tiptap', 'text-biography']);

export function buildWorkshopDraftBlocks(markdown = ''): Array<Record<string, unknown>> {
  return [
    {
      id: randomUUID(),
      type: 'text-tiptap',
      title: 'Prose',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      content: { markdown },
      isPrivate: false,
      visibility: 'Party',
    },
  ];
}

export function extractWorkshopDraftMarkdown(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const raw = block as Record<string, unknown>;
    if (!PROSE_BLOCK_TYPES.has(String(raw.type))) continue;
    const content = raw.content;
    if (content && typeof content === 'object') {
      const markdown = (content as Record<string, unknown>).markdown;
      if (typeof markdown === 'string') return markdown;
    }
  }
  return '';
}

export function setWorkshopDraftMarkdown(
  blocks: unknown,
  markdown: string,
): Array<Record<string, unknown>> {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return buildWorkshopDraftBlocks(markdown);
  }

  let updated = false;
  const next = blocks.map((block) => {
    if (!block || typeof block !== 'object') return block;
    const raw = block as Record<string, unknown>;
    if (!PROSE_BLOCK_TYPES.has(String(raw.type))) return block;
    updated = true;
    const content =
      raw.content && typeof raw.content === 'object'
        ? { ...(raw.content as Record<string, unknown>) }
        : {};
    return {
      ...raw,
      content: { ...content, markdown },
    };
  });

  if (!updated) {
    return [...buildWorkshopDraftBlocks(markdown), ...next];
  }

  return next as Array<Record<string, unknown>>;
}

export function extractPrimaryProseFromPageBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const raw = block as Record<string, unknown>;
    if (raw.type === 'text-biography') {
      const content = raw.content;
      if (content && typeof content === 'object') {
        const markdown = (content as Record<string, unknown>).markdown;
        if (typeof markdown === 'string') return markdown;
      }
    }
  }
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const raw = block as Record<string, unknown>;
    if (raw.type === 'text-tiptap') {
      const content = raw.content;
      if (content && typeof content === 'object') {
        const markdown = (content as Record<string, unknown>).markdown;
        if (typeof markdown === 'string') return markdown;
      }
    }
  }
  return '';
}

export function applyProseToPageBlocks(
  blocks: unknown,
  markdown: string,
): Array<Record<string, unknown>> | null {
  if (!Array.isArray(blocks)) return null;
  let updated = false;
  const next = blocks.map((block) => {
    if (!block || typeof block !== 'object') return block;
    const raw = block as Record<string, unknown>;
    if (raw.type === 'text-biography' || raw.type === 'text-tiptap') {
      updated = true;
      const content =
        raw.content && typeof raw.content === 'object'
          ? { ...(raw.content as Record<string, unknown>) }
          : {};
      return { ...raw, content: { ...content, markdown } };
    }
    return block;
  });
  if (!updated) return null;
  return next as Array<Record<string, unknown>>;
}

export function extractFieldShadowFromMetadata(
  metadata: unknown,
): WorkshopFieldShadow | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata as Record<string, unknown>;
  const shadow = raw.fieldShadow;
  if (!shadow || typeof shadow !== 'object') return null;
  const s = shadow as Record<string, unknown>;
  if (typeof s.intendedTarget !== 'string' || typeof s.templateType !== 'string') {
    return null;
  }
  return {
    intendedTarget: s.intendedTarget as WorkshopFieldShadow['intendedTarget'],
    templateType: s.templateType,
    blocks: Array.isArray(s.blocks) ? (s.blocks as Array<Record<string, unknown>>) : [],
    metadata:
      s.metadata && typeof s.metadata === 'object'
        ? (s.metadata as Record<string, unknown>)
        : {},
  };
}

export function stripProseBlocks(blocks: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((block) => {
    if (!block || typeof block !== 'object') return false;
    const type = String((block as Record<string, unknown>).type);
    return !isWorkshopProseBlockType(type);
  }) as Array<Record<string, unknown>>;
}
