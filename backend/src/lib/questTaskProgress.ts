export interface QuestTaskProgress {
  completed: number;
  total: number;
  percent: number;
}

const TASK_ITEM_TYPE = 'taskItem';
const MARKDOWN_TASK_REGEX = /^\s*[-*+]\s+\[( |x|X)\]/gm;

function getBlockVisibility(block: Record<string, unknown>): string | null {
  const visibility = block.visibility;
  return typeof visibility === 'string' ? visibility : null;
}

function shouldIncludeBlock(
  block: Record<string, unknown>,
  includeDmOnlyBlocks: boolean,
): boolean {
  if (includeDmOnlyBlocks) return true;
  const visibility = getBlockVisibility(block);
  if (visibility === 'DM_Only') return false;
  if (block.isPrivate === true && !visibility) return false;
  return true;
}

function walkProseMirrorNode(
  node: unknown,
  counts: { completed: number; total: number },
): void {
  if (!node || typeof node !== 'object') return;
  const doc = node as Record<string, unknown>;

  if (doc.type === TASK_ITEM_TYPE) {
    counts.total += 1;
    const attrs = doc.attrs;
    if (attrs && typeof attrs === 'object' && (attrs as { checked?: unknown }).checked === true) {
      counts.completed += 1;
    }
  }

  const content = doc.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      walkProseMirrorNode(child, counts);
    }
  }
}

function countFromProseMirrorDoc(doc: unknown): { completed: number; total: number } {
  const counts = { completed: 0, total: 0 };
  walkProseMirrorNode(doc, counts);
  return counts;
}

function extractDocFromBlockContent(content: Record<string, unknown>): unknown | null {
  if (content.doc && typeof content.doc === 'object') return content.doc;
  if (content.json && typeof content.json === 'object') return content.json;
  return null;
}

function countFromMarkdown(markdown: string): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = /^\s*[-*+]\s+\[( |x|X)\]/.exec(line);
    if (!match) continue;
    total += 1;
    if (match[1].toLowerCase() === 'x') completed += 1;
  }
  return { completed, total };
}

function countFromMarkdownRegexBlob(markdownParts: string[]): {
  completed: number;
  total: number;
} {
  const blob = markdownParts.join('\n');
  let completed = 0;
  let total = 0;
  for (const match of blob.matchAll(MARKDOWN_TASK_REGEX)) {
    total += 1;
    if (match[1].toLowerCase() === 'x') completed += 1;
  }
  return { completed, total };
}

export function parseQuestTaskProgress(
  blocks: unknown,
  options?: { includeDmOnlyBlocks?: boolean },
): QuestTaskProgress {
  const includeDmOnlyBlocks = options?.includeDmOnlyBlocks ?? false;
  if (!Array.isArray(blocks)) {
    return { completed: 0, total: 0, percent: 0 };
  }

  let completed = 0;
  let total = 0;
  const markdownParts: string[] = [];

  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    if (block.type !== 'text-tiptap') continue;
    if (!shouldIncludeBlock(block, includeDmOnlyBlocks)) continue;

    const content = block.content;
    if (!content || typeof content !== 'object') continue;
    const contentRecord = content as Record<string, unknown>;

    const doc = extractDocFromBlockContent(contentRecord);
    if (doc) {
      const fromDoc = countFromProseMirrorDoc(doc);
      completed += fromDoc.completed;
      total += fromDoc.total;
    }

    const markdown =
      typeof contentRecord.markdown === 'string' ? contentRecord.markdown : '';
    if (markdown.trim()) markdownParts.push(markdown);
  }

  if (total === 0 && markdownParts.length > 0) {
    const fromMd = countFromMarkdownRegexBlob(markdownParts);
    completed = fromMd.completed;
    total = fromMd.total;
  }

  if (total === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}
