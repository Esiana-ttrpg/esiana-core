/**
 * Extract prose from a page that has already passed the campaign audience
 * projection. The projection remains responsible for page, block, reference,
 * and revelation authorization; this function is not an authorization check.
 */
export function projectedPageProse(blocks: unknown): {
  description?: string;
  lore: string[];
} {
  if (!Array.isArray(blocks)) return { lore: [] };
  const prose = blocks.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const block = value as Record<string, unknown>;
    if (block.type !== 'text-biography' && block.type !== 'text-tiptap') return [];
    if (!block.content || typeof block.content !== 'object' || Array.isArray(block.content)) return [];
    const markdown = (block.content as Record<string, unknown>).markdown;
    if (typeof markdown !== 'string' || !markdown.trim()) return [];
    return [{ type: block.type, markdown: markdown.trim(), index,
      x: typeof block.x === 'number' && Number.isFinite(block.x) ? block.x : 0,
      y: typeof block.y === 'number' && Number.isFinite(block.y) ? block.y : 0 }];
  }).sort((a, b) => a.y - b.y || a.x - b.x || a.index - b.index);
  const description = prose.find((block) => block.type === 'text-biography');
  return {
    ...(description ? { description: description.markdown } : {}),
    lore: prose.filter((block) => block !== description).map((block) => block.markdown),
  };
}
