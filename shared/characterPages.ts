export const CHARACTER_CORE_PAGE_KEYS = [
  'overview',
  'appearance',
  'relationships',
  'timeline',
  'discovery',
  'continuity',
] as const;

export type CharacterCorePageKey = (typeof CHARACTER_CORE_PAGE_KEYS)[number];
export type CharacterPageOrigin = 'CORE' | 'CUSTOM' | 'PLUGIN';
export type CharacterPageRenderMode = 'CORE' | 'CANVAS' | 'PLUGIN';
export type PluginProviderState = 'AVAILABLE' | 'UNAVAILABLE' | 'REMOVED';
export type CharacterPageDisplayMode = 'narrow' | 'standard' | 'wide';
export type CharacterFieldOrigin = 'CUSTOM' | 'PLUGIN';
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
  pluginId?: string;
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
  coreKey?: CharacterCorePageKey;
  pluginId?: string;
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
