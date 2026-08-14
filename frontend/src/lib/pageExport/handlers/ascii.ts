import { FileText } from 'lucide-react';
import { buildPageAsciiGuide } from '../buildPageAsciiGuide';
import { downloadTextFile } from '../downloadTextFile';
import { registerPageExportHandler } from '../registry';

export const PAGE_EXPORT_ASCII_ID = 'ascii';

export function registerAsciiPageExportHandler(): void {
  registerPageExportHandler({
    id: PAGE_EXPORT_ASCII_ID,
    label: 'ASCII (.txt)',
    extension: 'txt',
    mimeType: 'text/plain;charset=utf-8',
    icon: FileText,
    order: 15,
    run(context) {
      const content = buildPageAsciiGuide(context);
      const baseName = context.page.pathKey.trim() || 'untitled';
      downloadTextFile({
        filename: `${baseName}.txt`,
        content,
        mimeType: 'text/plain;charset=utf-8',
      });
    },
  });
}
