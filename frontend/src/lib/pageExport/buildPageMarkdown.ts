import { composeMarkdownDocument } from '@shared/pageExport/serializeFrontMatter';
import type { WikiPageBlock } from '@/types/wiki';
import type { PageExportContext } from './types';

const SECTION_SEPARATOR = '\n\n---\n\n';

function extractTextMarkdown(blocks: WikiPageBlock[]): string[] {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'text-tiptap') continue;
    const markdown =
      typeof block.content?.markdown === 'string' ? block.content.markdown : '';
    if (markdown.trim()) parts.push(markdown.trim());
  }
  return parts;
}

/** Pure markdown artifact for a wiki page (no download side effects). */
export function buildPageMarkdown(context: PageExportContext): string {
  const { page, blocks } = context;
  const bodyMarkdown = extractTextMarkdown(blocks).join(SECTION_SEPARATOR);

  return composeMarkdownDocument(
    {
      title: page.title,
      tags: page.tagNames,
      customFields: {
        templateType: page.templateType,
        visibility: page.visibility,
      },
    },
    bodyMarkdown,
  );
}
