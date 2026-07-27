/**
 * Workshop Fields panel — schema resolution contracts.
 */

import type { WorkshopFormalizeTarget } from './workshopDocument.js';

export const WORKSHOP_PROSE_BLOCK_TYPES = ['text-tiptap', 'text-biography'] as const;
export type WorkshopProseBlockType = (typeof WORKSHOP_PROSE_BLOCK_TYPES)[number];

export interface WorkshopFieldSlot {
  blockId?: string;
  blockType: string;
  label: string;
  subviewId: string;
  fieldKey: string;
  editorKind: 'page-title' | 'metadata' | 'infobox' | 'appearance' | 'widget';
  metadataPath?: string;
  infoboxKey?: string;
}

export interface WorkshopFieldGroup {
  subviewId: string;
  label: string;
  slots: WorkshopFieldSlot[];
}

export interface WorkshopFieldSchema {
  binding: 'anchored' | 'shadow';
  surfaceKey: string;
  intendedTarget?: WorkshopFormalizeTarget | null;
  anchorPageId?: string | null;
  fieldGroups: WorkshopFieldGroup[];
  proseBlockTypes: readonly string[];
}

export function isWorkshopProseBlockType(type: string): boolean {
  return (WORKSHOP_PROSE_BLOCK_TYPES as readonly string[]).includes(type);
}
