import type { WorkshopFormalizeTarget } from './workshopDocument.js';

export type WorkshopFormalizeUiGroup = 'world' | 'narrative' | 'reference';

export type WorkshopFormalizeParentRoot = 'world' | 'game' | 'system';

export interface WorkshopFormalizeTargetDef {
  id: WorkshopFormalizeTarget;
  label: string;
  description: string;
  uiGroup: WorkshopFormalizeUiGroup;
  parentRoot: WorkshopFormalizeParentRoot;
  /** Wiki folder title under World or Game (not used for system roots). */
  parentFolderTitle?: string;
  entityCategory?: string;
  surfaceKey: string;
  templateType: string;
  titleFieldLabel: string;
  /** When false, hide from Create / Save As UI (legacy targets). */
  showInUi: boolean;
}

export const WORKSHOP_FORMALIZE_TARGET_DEFS: WorkshopFormalizeTargetDef[] = [
  {
    id: 'character',
    label: 'Character',
    description: 'Cast member with biography from draft',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Characters',
    entityCategory: 'characters',
    surfaceKey: 'character',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Name',
    showInUi: true,
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Faction, guild, or institution',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Organizations',
    entityCategory: 'organizations',
    surfaceKey: 'organization',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Place, region, or landmark',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Locations',
    entityCategory: 'locations',
    surfaceKey: 'location',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'family',
    label: 'Family',
    description: 'Bloodline, dynasty, or household',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Families',
    entityCategory: 'families',
    surfaceKey: 'family',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'bestiary',
    label: 'Creature',
    description: 'Creature or monster entry',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Bestiary',
    entityCategory: 'bestiary',
    surfaceKey: 'bestiary',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'ancestry',
    label: 'Ancestry',
    description: 'People, lineage root, or species',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Ancestries',
    entityCategory: 'ancestries',
    surfaceKey: 'ancestry',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'object',
    label: 'Object',
    description: 'Artifact, item, or relic',
    uiGroup: 'world',
    parentRoot: 'world',
    parentFolderTitle: 'Objects',
    entityCategory: 'objects',
    surfaceKey: 'object',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'quest',
    label: 'Quest',
    description: 'Adventure hook',
    uiGroup: 'narrative',
    parentRoot: 'system',
    entityCategory: 'quests',
    surfaceKey: 'quest',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Quest title',
    showInUi: true,
  },
  {
    id: 'thread',
    label: 'Thread',
    description: 'Open narrative thread',
    uiGroup: 'narrative',
    parentRoot: 'system',
    entityCategory: 'threads',
    surfaceKey: 'thread',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'scene',
    label: 'Scene',
    description: 'Planned scene beat',
    uiGroup: 'narrative',
    parentRoot: 'system',
    surfaceKey: 'scene',
    templateType: 'SCENE',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'journal',
    label: 'Journal',
    description: 'Diegetic document or in-world writing',
    uiGroup: 'narrative',
    parentRoot: 'game',
    parentFolderTitle: 'Journals',
    entityCategory: 'journals',
    surfaceKey: 'default',
    templateType: 'JOURNAL',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'event',
    label: 'Event',
    description: 'Historical or story event entry',
    uiGroup: 'narrative',
    parentRoot: 'game',
    parentFolderTitle: 'Events',
    entityCategory: 'events',
    surfaceKey: 'default',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'rules_resource',
    label: 'Resource',
    description: 'Rule, reference, or house document',
    uiGroup: 'reference',
    parentRoot: 'game',
    parentFolderTitle: 'Rules/Resources',
    entityCategory: 'rules-resources',
    surfaceKey: 'rule-resource',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: true,
  },
  {
    id: 'lore_note',
    label: 'Lore note',
    description: 'Freeform wiki entry in a lore folder',
    uiGroup: 'world',
    parentRoot: 'world',
    surfaceKey: 'default',
    templateType: 'DEFAULT',
    titleFieldLabel: 'Title',
    showInUi: false,
  },
];

const DEF_BY_ID = new Map(
  WORKSHOP_FORMALIZE_TARGET_DEFS.map((def) => [def.id, def]),
);

export function getWorkshopFormalizeTargetDef(
  target: WorkshopFormalizeTarget,
): WorkshopFormalizeTargetDef {
  const def = DEF_BY_ID.get(target);
  if (!def) throw new Error(`Unknown formalize target: ${target}`);
  return def;
}

export const WORKSHOP_UI_FORMALIZE_TARGETS = WORKSHOP_FORMALIZE_TARGET_DEFS.filter(
  (def) => def.showInUi,
).map((def) => def.id);

export const WORKSHOP_FORMALIZE_UI_GROUPS: Array<{
  id: WorkshopFormalizeUiGroup;
  label: string;
}> = [
  { id: 'world', label: 'World' },
  { id: 'narrative', label: 'Narrative' },
  { id: 'reference', label: 'Reference' },
];

export function workshopFormalizeTargetsForUiGroup(
  group: WorkshopFormalizeUiGroup,
): WorkshopFormalizeTarget[] {
  return WORKSHOP_FORMALIZE_TARGET_DEFS.filter(
    (def) => def.showInUi && def.uiGroup === group,
  ).map((def) => def.id);
}

export const WORKSHOP_FORMALIZE_TARGET_LABELS: Record<
  WorkshopFormalizeTarget,
  { label: string; description: string }
> = Object.fromEntries(
  WORKSHOP_FORMALIZE_TARGET_DEFS.map((def) => [
    def.id,
    { label: def.label, description: def.description },
  ]),
) as Record<WorkshopFormalizeTarget, { label: string; description: string }>;

export function workshopFormalizeDefaultDraftTitle(
  target: WorkshopFormalizeTarget,
): string {
  return `New ${getWorkshopFormalizeTargetDef(target).label}`;
}

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
