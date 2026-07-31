import { registerAsciiPageExportHandler } from './handlers/ascii';
import { registerMarkdownPageExportHandler } from './handlers/markdown';
import { registerPrintPageExportHandler } from './handlers/print';

export { buildPageAsciiGuide } from './buildPageAsciiGuide';
export { buildPageMarkdown } from './buildPageMarkdown';
export { downloadTextFile } from './downloadTextFile';
export {
  getPageExportHandler,
  getPageExportHandlers,
  registerPageExportHandler,
} from './registry';
export type {
  PageExportCampaignContext,
  PageExportContext,
  PageExportExtras,
  PageExportHandler,
  PageExportPageContext,
} from './types';
export {
  PAGE_EXPORT_ASCII_ID,
  registerAsciiPageExportHandler,
} from './handlers/ascii';
export {
  PAGE_EXPORT_MARKDOWN_ID,
  registerMarkdownPageExportHandler,
} from './handlers/markdown';
export { PAGE_EXPORT_PRINT_ID, registerPrintPageExportHandler } from './handlers/print';

let builtInHandlersRegistered = false;

function ensureBuiltInPageExportHandlers(): void {
  if (builtInHandlersRegistered) return;
  builtInHandlersRegistered = true;
  registerMarkdownPageExportHandler();
  registerAsciiPageExportHandler();
  registerPrintPageExportHandler();
}

ensureBuiltInPageExportHandlers();
