import type { WorkshopFormalizeTarget } from './workshopDocument.js';

export const WORKSHOP_FORMALIZE_TARGET_LABELS: Record<
  WorkshopFormalizeTarget,
  { label: string; description: string }
> = {
  character: {
    label: 'Character',
    description: 'Cast member with biography from draft',
  },
  quest: {
    label: 'Quest',
    description: 'Adventure hook',
  },
  thread: {
    label: 'Thread',
    description: 'Open narrative thread',
  },
  scene: {
    label: 'Scene',
    description: 'Planned scene beat',
  },
  lore_note: {
    label: 'Lore note',
    description: 'Freeform wiki entry in a lore folder',
  },
};

/** Lore folders under World eligible for lore_note formalize (excludes Party, Journals, etc.). */
export const LORE_NOTE_FOLDER_TITLES = [
  'Characters',
  'Locations',
  'Organizations',
  'Objects',
  'Families',
  'Bestiary',
  'Ancestries',
  'Maps',
] as const;

export function extractSummaryFromMarkdown(body: string, maxLen = 300): string {
  const trimmed = body.trim();
  if (!trimmed) return '';

  const paragraph = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find((part) => part.length > 0);

  if (!paragraph) return '';

  if (paragraph.length <= maxLen) return paragraph;
  return `${paragraph.slice(0, maxLen - 1).trimEnd()}…`;
}
