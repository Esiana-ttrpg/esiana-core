export const CHARACTER_CORE_PAGE_KEYS = [
  'overview',
  'appearance',
  'relationships',
  'timeline',
  'discovery',
  'continuity',
] as const;

export type CharacterCorePageKey = (typeof CHARACTER_CORE_PAGE_KEYS)[number];
export type CharacterPageOrigin = 'CORE' | 'CUSTOM' | 'PLUGIN' | 'API';
export type CharacterPageRenderMode = 'CORE' | 'CANVAS' | 'PLUGIN';
export type PluginProviderState = 'AVAILABLE' | 'UNAVAILABLE' | 'REMOVED';
export type CharacterPageDisplayMode = 'narrow' | 'standard' | 'wide';
export type CharacterFieldOrigin = 'CUSTOM' | 'PLUGIN' | 'API';
export type CharacterFieldType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'JSON';

export interface CharacterFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  options?: string[];
}

export interface CharacterFieldCapabilities {
  readable: boolean;
  writable: boolean;
  deletable: boolean;
}

export interface PluginCharacterFieldDefinition {
  /** Stable within (pluginId, character-page sourceKey). */
  key: string;
  label: string;
  type: CharacterFieldType;
  defaultValue?: unknown;
  validation?: CharacterFieldValidation;
  capabilities?: string[];
}

export interface CharacterFieldDescriptor {
  id: string;
  /** Immutable Esiana id for custom fields; stable provider key for plugin fields. */
  key: string;
  label: string;
  type: CharacterFieldType;
  value: unknown;
  origin: CharacterFieldOrigin;
  pageId: string | null;
  displayOrder: number;
  pluginId?: string;
  apiSourceId?: string;
  apiSourceName?: string;
  sourceKey?: string;
  providerKey?: string;
  validation: CharacterFieldValidation;
  capabilities: CharacterFieldCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterPageCapabilities {
  canEdit: boolean;
  canRename: boolean;
  canReorder: boolean;
  canHide: boolean;
  canDelete: boolean;
  allowAddWidget: boolean;
  allowArrange: boolean;
}

export interface CharacterPageDescriptor {
  id: string;
  key: string;
  title: string;
  origin: CharacterPageOrigin;
  renderMode: CharacterPageRenderMode;
  displayOrder: number;
  hidden: boolean;
  visibility: string | null;
  coreKey?: string;
  pluginId?: string;
  apiSourceId?: string;
  apiSourceName?: string;
  sourceKey?: string;
  renderer?: string;
  pluginSchemaVersion?: number;
  providerState?: PluginProviderState;
  blocks?: Array<Record<string, unknown>>;
  capabilities: CharacterPageCapabilities;
}

export interface PluginCharacterPageCanvasDefinition {
  allowedWidgets?: string[];
  requiredWidgets?: string[];
  allowAddWidget: boolean;
  allowArrange: boolean;
}

export interface PluginCharacterPageDefinition {
  key: string;
  title: string;
  renderMode: 'CANVAS' | 'PLUGIN';
  renderer?: string;
  schemaVersion: number;
  defaultVisibility?: string;
  canvas?: PluginCharacterPageCanvasDefinition;
  capabilities?: string[];
  exportToCanvas?: string;
  fields?: PluginCharacterFieldDefinition[];
}

export interface PluginCharacterPagePermissions {
  canRead: boolean;
  canEdit: boolean;
  canChangeVisibility: boolean;
  coreActions: string[];
}

export type PluginPageRemovalMode = 'RETAIN_DATA' | 'CONVERT_TO_CUSTOM' | 'DELETE_DATA';

/**
 * Entity-neutral names for the shell page/field contract.  The character
 * names above remain exported for plugin and API source compatibility.
 */
export type EntityPageDescriptor = CharacterPageDescriptor;
export type EntityFieldDescriptor = CharacterFieldDescriptor;
export type EntityFieldType = CharacterFieldType;
export type EntityFieldValidation = CharacterFieldValidation;
export type EntityPageDisplayMode = CharacterPageDisplayMode;

export const ENTITY_SHELL_CORE_PAGES: Record<string, ReadonlyArray<{ key: string; title: string; dmOnly?: boolean }>> = {
  character: CHARACTER_CORE_PAGE_KEYS.map((key) => ({
    key,
    title: key.charAt(0).toUpperCase() + key.slice(1),
    dmOnly: key === 'discovery' || key === 'continuity',
  })),
  location: [
    ['overview', 'Overview'], ['people', 'People'], ['places', 'Places'], ['organizations', 'Organizations'],
    ['events', 'Events'], ['connections', 'Connections'], ['timeline', 'Timeline'], ['lore', 'Lore'],
  ].map(([key, title]) => ({ key, title })),
  organization: [
    ['overview', 'Overview'], ['lore', 'Lore'], ['structure', 'Structure'], ['presence', 'Presence'],
    ['relations', 'Relations'], ['people', 'People'], ['continuity', 'Continuity'],
  ].map(([key, title]) => ({ key, title, dmOnly: key === 'continuity' })),
  bestiary: [
    ['overview', 'Overview'], ['lore', 'Lore'], ['encounters', 'Encounters'], ['combat', 'Combat'],
    ['appearance', 'Appearance'], ['relationships', 'Related'], ['discovery', 'Discovery'], ['continuity', 'Continuity'],
  ].map(([key, title]) => ({ key, title, dmOnly: key === 'discovery' || key === 'continuity' })),
  ancestry: [
    ['overview', 'Overview'], ['lineages', 'Lineages'], ['societies', 'Societies'], ['presence', 'Presence'],
    ['relations', 'Relations'], ['characters', 'Characters'],
  ].map(([key, title]) => ({ key, title })),
  family: [
    ['overview', 'Overview'], ['lore', 'Lore'], ['lineage', 'Lineage'], ['relationships', 'Relationships'],
    ['timeline', 'Timeline'], ['discovery', 'Discovery'], ['continuity', 'Continuity'],
  ].map(([key, title]) => ({ key, title, dmOnly: key === 'discovery' || key === 'continuity' })),
  quest: [
    ['overview', 'Overview'], ['lore', 'Lore'], ['continuity', 'Continuity'],
  ].map(([key, title]) => ({ key, title, dmOnly: key === 'continuity' })),
};

/** Canonical entityCategory metadata values supported by managed page shells. */
export const ENTITY_CATEGORY_TO_SHELL: Readonly<Record<string, string>> = {
  characters: 'character',
  locations: 'location',
  organizations: 'organization',
  bestiary: 'bestiary',
  ancestries: 'ancestry',
  families: 'family',
  quests: 'quest',
};
