const DEFAULT_MAX_LENGTH = 200;

export function stripMarkdownToPlain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBlockVisibility(block: Record<string, unknown>): string | null {
  const visibility = block.visibility;
  if (typeof visibility === 'string' && visibility.trim()) return visibility;
  if (block.isPrivate === true) return 'DM_Only';
  return null;
}

const SEARCHABLE_TEXT_BLOCK_TYPES = new Set(['text-tiptap', 'text-biography']);

/**
 * Collect markdown from visible prose blocks for search / excerpts.
 * Skips DM_Only / private blocks unless `includeDmOnlyBlocks` is true.
 */
export function collectMarkdownFromBlocks(
  blocks: unknown,
  includeDmOnlyBlocks: boolean,
): string[] {
  if (!Array.isArray(blocks)) return [];
  const parts: string[] = [];

  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    if (
      typeof block.type !== 'string' ||
      !SEARCHABLE_TEXT_BLOCK_TYPES.has(block.type)
    ) {
      continue;
    }

    const visibility = getBlockVisibility(block);
    if (!includeDmOnlyBlocks && visibility === 'DM_Only') continue;

    const markdown =
      typeof (block.content as { markdown?: unknown } | undefined)?.markdown ===
      'string'
        ? ((block.content as { markdown: string }).markdown as string)
        : '';
    if (markdown.trim()) parts.push(markdown.trim());
  }

  return parts;
}

export function extractWikiPageExcerpt(
  blocks: unknown,
  options?: { maxLength?: number; includeDmOnlyBlocks?: boolean },
): string {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const includeDmOnlyBlocks = options?.includeDmOnlyBlocks ?? false;
  const parts = collectMarkdownFromBlocks(blocks, includeDmOnlyBlocks);
  const plain = stripMarkdownToPlain(parts.join(' '));
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trim()}…`;
}
