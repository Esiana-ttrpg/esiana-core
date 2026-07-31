import { FileDown } from 'lucide-react';
import { buildPageMarkdown } from '../buildPageMarkdown';
import { downloadTextFile } from '../downloadTextFile';
import { registerPageExportHandler } from '../registry';

export const PAGE_EXPORT_MARKDOWN_ID = 'markdown';

export function registerMarkdownPageExportHandler(): void {
  registerPageExportHandler({
    id: PAGE_EXPORT_MARKDOWN_ID,
    label: 'Export as Markdown (.md)',
    extension: 'md',
    mimeType: 'text/markdown;charset=utf-8',
    icon: FileDown,
    order: 10,
    run(context) {
      const markdown = buildPageMarkdown(context);
      const extension = 'md';
      const baseName = context.page.pathKey.trim() || 'untitled';
      downloadTextFile({
        filename: `${baseName}.${extension}`,
        content: markdown,
        mimeType: 'text/markdown;charset=utf-8',
      });
    },
  });
}
