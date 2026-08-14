import type { PageExportHandler } from './types';

const handlers = new Map<string, PageExportHandler>();

export function registerPageExportHandler(handler: PageExportHandler): void {
  if (handlers.has(handler.id)) {
    console.warn(`[pageExport] Overwriting handler "${handler.id}"`);
  }
  handlers.set(handler.id, handler);
}

export function getPageExportHandlers(): PageExportHandler[] {
  return [...handlers.values()].sort((a, b) => a.order - b.order);
}

export function getPageExportHandler(id: string): PageExportHandler | undefined {
  return handlers.get(id);
}
