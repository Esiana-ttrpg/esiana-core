import { randomUUID } from 'node:crypto';

const PROSE_BLOCK_TYPE = 'text-tiptap';

export function buildWorkshopDraftBlocks(markdown = ''): Array<Record<string, unknown>> {
  return [
    {
      id: randomUUID(),
      type: PROSE_BLOCK_TYPE,
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
    if (raw.type !== PROSE_BLOCK_TYPE) continue;
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
    if (raw.type !== PROSE_BLOCK_TYPE) return block;
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
