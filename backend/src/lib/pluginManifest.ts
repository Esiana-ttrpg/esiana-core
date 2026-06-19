/** Official community plugin catalog index. */
export const DEFAULT_PLUGIN_REGISTRY_URL =
  'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json';

/** Monorepo / dev default — same catalog, local file fallback in bundledPlugins. */
export const DEV_PLUGIN_REGISTRY_URL = DEFAULT_PLUGIN_REGISTRY_URL;

/** Previous placeholder URLs replaced by {@link DEFAULT_PLUGIN_REGISTRY_URL}. */
export const LEGACY_PLUGIN_REGISTRY_URLS = [
  'https://raw.githubusercontent.com/esiana-app/core-plugins/main/registry.json',
  'https://github.com/esiana-ttrpg/community-plugins/registry.json',
  'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/manifest.json',
  'https://github.com/Esiana-ttrpg/community-plugins/blob/main/manifest.json',
  'https://github.com/Esiana-ttrpg/community-plugins/blob/main/registry.json',
  'https://raw.githubusercontent.com/esiana-ttrpg/esiana/main/plugins/registry.json',
] as const;

export const MANIFEST_META_KEY = '__manifest';

export { PluginScopes, type PluginScope } from './systemPlugins.js';
import { PluginScopes, type PluginScope } from './systemPlugins.js';
import { validatePluginPermissions } from './pluginPermissions.js';

export const GLOBAL_SCOPE_REJECT_MESSAGE =
  'This plugin is designed for campaign implementation and cannot be deployed as global system infrastructure.';

export const CAMPAIGN_SCOPE_REJECT_MESSAGE =
  'This is a global system utility plugin and cannot be installed inside an isolated campaign context.';

export const PluginCategories = {
  THEME: 'theme',
  WIDGET: 'widget',
  INTEGRATION: 'integration',
  WIKI: 'wiki',
  LFG: 'lfg',
  UTILITY: 'utility',
  DEV: 'dev',
} as const;

export type PluginCategory = (typeof PluginCategories)[keyof typeof PluginCategories];

export const PLUGIN_CATEGORY_LABELS: Record<PluginCategory, string> = {
  theme: 'Theme',
  widget: 'Widget',
  integration: 'Integration',
  wiki: 'Wiki',
  lfg: 'LFG',
  utility: 'Utility',
  dev: 'Dev',
};

/** Declarative UI slot ids plugins may register widgets into (Phase 10D). */
export const PluginUiSlots = {
  HEADER: 'header',
  SIDEBAR: 'sidebar',
  EDITOR: 'editor',
  DASHBOARD: 'dashboard',
  MAP_OVERLAY: 'map:overlay',
  MAP_TOOLBAR: 'map:toolbar',
  MAP_TOKEN_CONTEXT: 'map:token-context',
  CAMPAIGN_PLUGIN_SETTINGS: 'campaign-plugin-settings',
} as const;

export type PluginUiSlotId = (typeof PluginUiSlots)[keyof typeof PluginUiSlots];

const UI_SLOT_VALUES = new Set<string>(Object.values(PluginUiSlots));

/** Declared plugin capability ids (manifest-only; no DB column). */
export const PluginCapabilities = {
  CAMPAIGN_GENERATOR: 'campaignGenerator',
  CONTENT_PACK: 'contentPack',
  IMPORT_PROVIDER: 'importProvider',
  DEVELOPMENT_PROVIDER: 'developmentProvider',
  STORAGE_PROVIDER: 'storageProvider',
} as const;

export type PluginCapability =
  (typeof PluginCapabilities)[keyof typeof PluginCapabilities];

const CAPABILITY_VALUES = new Set<string>(Object.values(PluginCapabilities));

export interface GeneratorPreset {
  id: string;
  label: string;
  description: string;
  defaultSeed?: string;
  /** Campaign-scoped plugin ids to enable after generator finishes. */
  attachCampaignPlugins?: string[];
  /** Creator joins as PLAYER; requires ENABLE_DEMO_USERS for fake DM. */
  joinAsPlayer?: boolean;
  /** Seed fake party members (wiki PCs always; User rows when demo users enabled). */
  seedFakeParty?: boolean;
}

/** User-visible content pack metadata — manifest is authoritative. */
export interface ContentPackManifestEntry {
  id: string;
  name: string;
  description: string;
  campaignFormat: 'one-shot' | 'campaign';
  packPath: string;
  gameSystem?: string;
  genreThemes?: string[];
  author?: string;
  authorUrl?: string;
}

export type PluginConfigFieldType =
  | 'text'
  | 'password'
  | 'url'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'select';

export interface PluginConfigTemplateField {
  key: string;
  label: string;
  type: PluginConfigFieldType;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  options?: string[];
}

export interface PluginCompatibilityMeta {
  lastVerifiedCore?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  scope: PluginScope;
  category?: PluginCategory;
  configTemplate?: PluginConfigTemplateField[];
  /** Runtime entry paths (relative to plugin root). */
  backendEntry?: string;
  frontendEntry?: string;
  githubUrl?: string;
  /** Declared capabilities (storage:provider, plugin:data, network:fetch, …). */
  permissions?: string[];
  /** Host compatibility, e.g. { "esiana-core": "^0.8.0" }. Hard runtime constraint. */
  engines?: Record<string, string>;
  /** Informational trust signal — never enforced at runtime. */
  compatibility?: PluginCompatibilityMeta;
  /** Inline JSON Schema subset for settings UI (Phase 10D auto-render). */
  configSchema?: Record<string, unknown>;
  /** Phase 10 stub — auto-render settings from remote schema (not implemented). */
  configSchemaUrl?: string;
  /** UI slots this plugin may register widgets into. */
  uiSlots?: PluginUiSlotId[];
  /** Per-plugin CSP extensions merged at frontend bootstrap. */
  cspExtensions?: {
    connectSrc?: string[];
    imgSrc?: string[];
  };
  /** Uninstall data policy. Default preserveData. */
  uninstallPolicy?: 'preserveData' | 'removePluginData';
  /** Host-facing capability flags (e.g. campaignGenerator). */
  capabilities?: PluginCapability[];
  /** Wizard presets when capabilities includes campaignGenerator. */
  generatorPresets?: GeneratorPreset[];
  /** Content packs when capabilities includes contentPack. */
  contentPacks?: ContentPackManifestEntry[];
}

/** Global plugins that run backend-only (no frontendEntry required). */
export function isBackendOnlyGlobalPlugin(
  manifest: Pick<PluginManifest, 'scope' | 'capabilities' | 'frontendEntry'>,
): boolean {
  if (manifest.scope !== PluginScopes.GLOBAL) return false;
  if (manifest.frontendEntry?.trim()) return false;
  const caps = manifest.capabilities ?? [];
  return (
    caps.includes(PluginCapabilities.CAMPAIGN_GENERATOR) ||
    caps.includes(PluginCapabilities.CONTENT_PACK) ||
    caps.includes(PluginCapabilities.DEVELOPMENT_PROVIDER) ||
    caps.includes(PluginCapabilities.STORAGE_PROVIDER)
  );
}

/** Markdown/assets-only content pack — no backend or frontend runtime. */
export function isDataOnlyContentPackPlugin(
  manifest: Pick<PluginManifest, 'scope' | 'capabilities' | 'backendEntry' | 'frontendEntry'>,
): boolean {
  if (manifest.scope !== PluginScopes.GLOBAL) return false;
  if (manifest.backendEntry?.trim() || manifest.frontendEntry?.trim()) return false;
  const caps = manifest.capabilities ?? [];
  return caps.includes(PluginCapabilities.CONTENT_PACK);
}

export interface PluginGithubSource {
  type: 'github';
  repo: string;
  commitSha: string;
  path: string;
}

export interface PluginBundledSource {
  type: 'bundled';
}

export type PluginRegistrySource = PluginGithubSource | PluginBundledSource;

export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  scope: PluginScope;
  category?: PluginCategory;
  manifestUrl?: string;
  source?: PluginRegistrySource;
  /** When false, entry is browse-only (stub catalog item). */
  installable?: boolean;
  configTemplate?: PluginConfigTemplateField[];
  backendEntry?: string;
  frontendEntry?: string;
  githubUrl?: string;
  permissions?: string[];
  engines?: Record<string, string>;
  configSchema?: Record<string, unknown>;
  configSchemaUrl?: string;
}

export interface StoredPluginManifestMeta {
  version: string;
  description: string;
  configTemplate: PluginConfigTemplateField[];
  category?: PluginCategory;
  configSchema?: Record<string, unknown>;
  configSchemaUrl?: string;
  permissions?: string[];
  engines?: Record<string, string>;
  compatibility?: PluginCompatibilityMeta;
  uiSlots?: PluginUiSlotId[];
}

export type ManifestValidationResult =
  | { ok: true; manifest: PluginManifest }
  | { ok: false; errors: string[] };

export type RegistryEntryValidationResult =
  | { ok: true; entry: PluginRegistryEntry }
  | { ok: false; errors: string[] };

export type RegistryIndexParseResult =
  | { ok: true; plugins: PluginRegistryEntry[] }
  | { ok: false; errors: string[] };

const PLUGIN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

const FIELD_TYPES = new Set<PluginConfigFieldType>([
  'text',
  'password',
  'url',
  'number',
  'textarea',
  'checkbox',
  'select',
]);

const CATEGORY_VALUES = new Set<string>(Object.values(PluginCategories));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isValidCommitSha(value: string): boolean {
  return COMMIT_SHA_PATTERN.test(value.trim());
}

export function parseConfigTemplateField(
  raw: unknown,
  index: number,
): { field?: PluginConfigTemplateField; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push(`configTemplate[${index}] must be an object`);
    return { errors };
  }

  const key = typeof raw.key === 'string' ? raw.key.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const type = raw.type;

  if (!key) errors.push(`configTemplate[${index}].key is required`);
  if (!label) errors.push(`configTemplate[${index}].label is required`);
  if (typeof type !== 'string' || !FIELD_TYPES.has(type as PluginConfigFieldType)) {
    errors.push(
      `configTemplate[${index}].type must be one of: ${[...FIELD_TYPES].join(', ')}`,
    );
  }

  if (errors.length > 0) return { errors };

  const field: PluginConfigTemplateField = {
    key,
    label,
    type: type as PluginConfigFieldType,
  };

  if (typeof raw.placeholder === 'string') {
    field.placeholder = raw.placeholder;
  }
  if (
    typeof raw.defaultValue === 'string' ||
    typeof raw.defaultValue === 'number' ||
    typeof raw.defaultValue === 'boolean'
  ) {
    field.defaultValue = raw.defaultValue;
  }
  if (typeof raw.required === 'boolean') {
    field.required = raw.required;
  }

  return { field, errors: [] };
}

function parseCategory(raw: unknown, errors: string[], fieldName = 'category'): PluginCategory | undefined {
  if (raw === undefined) return undefined;
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return undefined;
  if (!CATEGORY_VALUES.has(value)) {
    errors.push(`${fieldName} must be one of: ${[...CATEGORY_VALUES].join(', ')}`);
    return undefined;
  }
  return value as PluginCategory;
}

function parseConfigTemplateArray(
  raw: unknown,
  errors: string[],
): PluginConfigTemplateField[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('configTemplate must be an array when provided');
    return undefined;
  }

  const configTemplate: PluginConfigTemplateField[] = [];
  const keys = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const parsed = parseConfigTemplateField(raw[i], i);
    errors.push(...parsed.errors);
    if (parsed.field) {
      if (keys.has(parsed.field.key)) {
        errors.push(`configTemplate contains duplicate key "${parsed.field.key}"`);
      } else {
        keys.add(parsed.field.key);
        configTemplate.push(parsed.field);
      }
    }
  }
  return configTemplate;
}

function parseUiSlots(raw: unknown, errors: string[]): PluginUiSlotId[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('uiSlots must be an array when provided');
    return undefined;
  }
  const slots: PluginUiSlotId[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (typeof value !== 'string' || !UI_SLOT_VALUES.has(value)) {
      errors.push(
        `uiSlots[${index}] must be one of: ${[...UI_SLOT_VALUES].join(', ')}`,
      );
      continue;
    }
    if (!slots.includes(value as PluginUiSlotId)) {
      slots.push(value as PluginUiSlotId);
    }
  }
  return slots.length > 0 ? slots : undefined;
}

function parseCapabilities(raw: unknown, errors: string[]): PluginCapability[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('capabilities must be an array when provided');
    return undefined;
  }
  const capabilities: PluginCapability[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (typeof value !== 'string' || !CAPABILITY_VALUES.has(value)) {
      errors.push(
        `capabilities[${index}] must be one of: ${[...CAPABILITY_VALUES].join(', ')}`,
      );
      continue;
    }
    const cap = value as PluginCapability;
    if (!capabilities.includes(cap)) capabilities.push(cap);
  }
  return capabilities.length > 0 ? capabilities : undefined;
}

function parseGeneratorPresets(
  raw: unknown,
  errors: string[],
): GeneratorPreset[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('generatorPresets must be an array when provided');
    return undefined;
  }
  const presets: GeneratorPreset[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index];
    if (!isRecord(entry)) {
      errors.push(`generatorPresets[${index}] must be an object`);
      continue;
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    const description =
      typeof entry.description === 'string' ? entry.description.trim() : '';
    if (!id) errors.push(`generatorPresets[${index}].id is required`);
    else if (!PLUGIN_ID_PATTERN.test(id)) {
      errors.push(`generatorPresets[${index}].id must be lowercase kebab-case`);
    } else if (ids.has(id)) {
      errors.push(`generatorPresets contains duplicate id "${id}"`);
    }
    if (!label) errors.push(`generatorPresets[${index}].label is required`);
    if (!description) errors.push(`generatorPresets[${index}].description is required`);
    const defaultSeed =
      typeof entry.defaultSeed === 'string' ? entry.defaultSeed.trim() : undefined;
    const attachCampaignPlugins = parseStringArray(
      entry.attachCampaignPlugins,
      `generatorPresets[${index}].attachCampaignPlugins`,
      errors,
    );
    const joinAsPlayer = entry.joinAsPlayer === true ? true : undefined;
    const seedFakeParty = entry.seedFakeParty === true ? true : undefined;
    if (id && label && description && !ids.has(id)) {
      ids.add(id);
      presets.push({
        id,
        label,
        description,
        ...(defaultSeed ? { defaultSeed } : {}),
        ...(attachCampaignPlugins?.length ? { attachCampaignPlugins } : {}),
        ...(joinAsPlayer ? { joinAsPlayer } : {}),
        ...(seedFakeParty ? { seedFakeParty } : {}),
      });
    }
  }
  return presets.length > 0 ? presets : undefined;
}

function parseContentPacks(
  raw: unknown,
  errors: string[],
): ContentPackManifestEntry[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('contentPacks must be an array when provided');
    return undefined;
  }
  const packs: ContentPackManifestEntry[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index];
    if (!isRecord(entry)) {
      errors.push(`contentPacks[${index}] must be an object`);
      continue;
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const description =
      typeof entry.description === 'string' ? entry.description.trim() : '';
    const packPath = typeof entry.packPath === 'string' ? entry.packPath.trim() : '';
    const campaignFormat =
      entry.campaignFormat === 'one-shot' || entry.campaignFormat === 'campaign'
        ? entry.campaignFormat
        : null;
    if (!id) errors.push(`contentPacks[${index}].id is required`);
    else if (!PLUGIN_ID_PATTERN.test(id)) {
      errors.push(`contentPacks[${index}].id must be lowercase kebab-case`);
    } else if (ids.has(id)) {
      errors.push(`contentPacks contains duplicate id "${id}"`);
    }
    if (!name) errors.push(`contentPacks[${index}].name is required`);
    if (!description) errors.push(`contentPacks[${index}].description is required`);
    if (!packPath) errors.push(`contentPacks[${index}].packPath is required`);
    if (!campaignFormat) {
      errors.push(`contentPacks[${index}].campaignFormat must be one-shot or campaign`);
    }
    const gameSystem =
      typeof entry.gameSystem === 'string' ? entry.gameSystem.trim() : undefined;
    const genreThemes = parseStringArray(
      entry.genreThemes,
      `contentPacks[${index}].genreThemes`,
      errors,
    );
    const author = typeof entry.author === 'string' ? entry.author.trim() : undefined;
    const authorUrl = typeof entry.authorUrl === 'string' ? entry.authorUrl.trim() : undefined;
    if (id && name && description && packPath && campaignFormat && !ids.has(id)) {
      ids.add(id);
      packs.push({
        id,
        name,
        description,
        campaignFormat,
        packPath,
        ...(gameSystem ? { gameSystem } : {}),
        ...(genreThemes?.length ? { genreThemes } : {}),
        ...(author ? { author } : {}),
        ...(authorUrl ? { authorUrl } : {}),
      });
    }
  }
  return packs.length > 0 ? packs : undefined;
}

export function validatePluginGithubSource(raw: unknown): {
  source?: PluginGithubSource;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push('source must be an object');
    return { errors };
  }

  if (raw.type !== 'github') {
    errors.push('source.type must be "github"');
  }

  if ('branch' in raw || 'tag' in raw || 'ref' in raw) {
    errors.push('source must use commitSha only — branch, tag, and ref are not allowed');
  }

  const repo = typeof raw.repo === 'string' ? raw.repo.trim() : '';
  const commitSha = typeof raw.commitSha === 'string' ? raw.commitSha.trim() : '';
  const path = typeof raw.path === 'string' ? raw.path.trim().replace(/^\/+|\/+$/g, '') : '';

  if (!repo) errors.push('source.repo is required (org/repo)');
  else if (!GITHUB_REPO_PATTERN.test(repo)) {
    errors.push('source.repo must be org/repo (e.g. esiana-ttrpg/esiana)');
  }

  if (!commitSha) errors.push('source.commitSha is required');
  else if (!isValidCommitSha(commitSha)) {
    errors.push('source.commitSha must be a 40-character git commit SHA');
  }

  if (!path) errors.push('source.path is required (directory within the repository)');

  if (errors.length > 0) return { errors };

  return {
    source: { type: 'github', repo, commitSha, path },
    errors: [],
  };
}

export function validatePluginRegistrySource(raw: unknown): {
  source?: PluginRegistrySource;
  errors: string[];
} {
  if (!isRecord(raw)) {
    return { errors: ['source must be an object'] };
  }

  if (raw.type === 'bundled') {
    return { source: { type: 'bundled' }, errors: [] };
  }

  const github = validatePluginGithubSource(raw);
  return { source: github.source, errors: github.errors };
}

function parseStringArray(raw: unknown, fieldName: string, errors: string[]): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${fieldName} must be an array of strings`);
    return undefined;
  }
  const values: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (typeof raw[i] !== 'string' || !raw[i].trim()) {
      errors.push(`${fieldName}[${i}] must be a non-empty string`);
      continue;
    }
    values.push(raw[i].trim());
  }
  return values;
}

function parseEngines(raw: unknown, errors: string[]): Record<string, string> | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('engines must be an object');
    return undefined;
  }
  const engines: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`engines.${key} must be a non-empty semver constraint string`);
      continue;
    }
    engines[key] = value.trim();
  }
  return engines;
}

const CORE_VERSION_PATTERN = /^\d+\.\d+\.\d+/;

function parseCompatibility(
  raw: unknown,
  errors: string[],
): PluginCompatibilityMeta | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('compatibility must be an object');
    return undefined;
  }
  const lastVerifiedCore =
    typeof raw.lastVerifiedCore === 'string' ? raw.lastVerifiedCore.trim() : undefined;
  if (lastVerifiedCore !== undefined && !CORE_VERSION_PATTERN.test(lastVerifiedCore)) {
    errors.push('compatibility.lastVerifiedCore must be a semver string (e.g. 1.0.0)');
  }
  if (!lastVerifiedCore) return undefined;
  return { lastVerifiedCore };
}

export function validatePluginManifest(raw: unknown): ManifestValidationResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: ['Manifest must be a JSON object'] };
  }

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const version = typeof raw.version === 'string' ? raw.version.trim() : '';
  const description =
    typeof raw.description === 'string' ? raw.description.trim() : '';

  if (!id) errors.push('id is required');
  else if (!PLUGIN_ID_PATTERN.test(id)) {
    errors.push('id must be lowercase kebab-case (e.g. my-plugin-id)');
  }

  if (!name) errors.push('name is required');
  if (!version) errors.push('version is required');
  if (!description) errors.push('description is required');

  const scopeRaw = typeof raw.scope === 'string' ? raw.scope.trim() : '';
  if (!scopeRaw) {
    errors.push('scope is required (global or campaign)');
  } else if (
    scopeRaw !== PluginScopes.GLOBAL &&
    scopeRaw !== PluginScopes.CAMPAIGN
  ) {
    errors.push('scope must be "global" or "campaign"');
  }

  const category = parseCategory(raw.category, errors);
  const configTemplate = parseConfigTemplateArray(raw.configTemplate, errors);

  const backendEntry =
    typeof raw.backendEntry === 'string' ? raw.backendEntry.trim() : undefined;
  const frontendEntry =
    typeof raw.frontendEntry === 'string' ? raw.frontendEntry.trim() : undefined;
  const githubUrl = typeof raw.githubUrl === 'string' ? raw.githubUrl.trim() : undefined;
  const configSchemaUrl =
    typeof raw.configSchemaUrl === 'string' ? raw.configSchemaUrl.trim() : undefined;
  const permissions = parseStringArray(raw.permissions, 'permissions', errors);
  const engines = parseEngines(raw.engines, errors);
  const compatibility = parseCompatibility(raw.compatibility, errors);
  const configSchema =
    raw.configSchema !== undefined && isRecord(raw.configSchema)
      ? (raw.configSchema as Record<string, unknown>)
      : raw.configSchema !== undefined
        ? (errors.push('configSchema must be an object when provided'), undefined)
        : undefined;
  const uiSlots = parseUiSlots(raw.uiSlots, errors);

  let cspExtensions: PluginManifest['cspExtensions'];
  if (raw.cspExtensions !== undefined) {
    if (!isRecord(raw.cspExtensions)) {
      errors.push('cspExtensions must be an object when provided');
    } else {
      const connectSrc = parseStringArray(raw.cspExtensions.connectSrc, 'cspExtensions.connectSrc', errors);
      const imgSrc = parseStringArray(raw.cspExtensions.imgSrc, 'cspExtensions.imgSrc', errors);
      cspExtensions = {
        ...(connectSrc?.length ? { connectSrc } : {}),
        ...(imgSrc?.length ? { imgSrc } : {}),
      };
    }
  }

  const uninstallPolicyRaw =
    typeof raw.uninstallPolicy === 'string' ? raw.uninstallPolicy.trim() : undefined;
  let uninstallPolicy: PluginManifest['uninstallPolicy'];
  if (uninstallPolicyRaw !== undefined) {
    if (uninstallPolicyRaw !== 'preserveData' && uninstallPolicyRaw !== 'removePluginData') {
      errors.push('uninstallPolicy must be "preserveData" or "removePluginData"');
    } else {
      uninstallPolicy = uninstallPolicyRaw;
    }
  }

  if (permissions?.length) {
    const validated = validatePluginPermissions(permissions);
    for (const warning of validated.warnings) {
      console.warn(`[plugins] ${id}: ${warning}`);
    }
  }

  const capabilities = parseCapabilities(raw.capabilities, errors);
  const generatorPresets = parseGeneratorPresets(raw.generatorPresets, errors);
  const contentPacks = parseContentPacks(raw.contentPacks, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    manifest: {
      id,
      name,
      version,
      description,
      scope: scopeRaw as PluginScope,
      ...(category ? { category } : {}),
      ...(configTemplate?.length ? { configTemplate } : {}),
      ...(backendEntry ? { backendEntry } : {}),
      ...(frontendEntry ? { frontendEntry } : {}),
      ...(githubUrl ? { githubUrl } : {}),
      ...(permissions?.length ? { permissions } : {}),
      ...(engines && Object.keys(engines).length ? { engines } : {}),
      ...(compatibility ? { compatibility } : {}),
      ...(configSchema ? { configSchema } : {}),
      ...(configSchemaUrl ? { configSchemaUrl } : {}),
      ...(uiSlots?.length ? { uiSlots } : {}),
      ...(cspExtensions && Object.keys(cspExtensions).length ? { cspExtensions } : {}),
      ...(uninstallPolicy ? { uninstallPolicy } : {}),
      ...(capabilities?.length ? { capabilities } : {}),
      ...(generatorPresets?.length ? { generatorPresets } : {}),
      ...(contentPacks?.length ? { contentPacks } : {}),
    },
  };
}

export function validatePluginRegistryEntry(raw: unknown): RegistryEntryValidationResult {
  const manifestResult = validatePluginManifest(raw);
  if (manifestResult.ok) {
    const rawRecord = raw as Record<string, unknown>;
    let source: PluginRegistrySource | undefined;
    if (rawRecord.source !== undefined) {
      const parsedSource = validatePluginRegistrySource(rawRecord.source);
      if (parsedSource.errors.length > 0) {
        return { ok: false, errors: parsedSource.errors };
      }
      source = parsedSource.source;
    }

    const manifestUrl =
      typeof rawRecord.manifestUrl === 'string' ? rawRecord.manifestUrl.trim() : undefined;
    const installable =
      typeof rawRecord.installable === 'boolean' ? rawRecord.installable : undefined;

    return {
      ok: true,
      entry: {
        ...manifestResult.manifest,
        ...(manifestUrl ? { manifestUrl } : {}),
        ...(source ? { source } : {}),
        ...(installable !== undefined ? { installable } : {}),
      },
    };
  }

  return manifestResult;
}

export function registryEntryToManifest(entry: PluginRegistryEntry): PluginManifest {
  return {
    id: entry.id,
    name: entry.name,
    version: entry.version,
    description: entry.description,
    scope: entry.scope,
    ...(entry.category ? { category: entry.category } : {}),
    ...(entry.configTemplate ? { configTemplate: entry.configTemplate } : {}),
    ...(entry.backendEntry ? { backendEntry: entry.backendEntry } : {}),
    ...(entry.frontendEntry ? { frontendEntry: entry.frontendEntry } : {}),
    ...(entry.githubUrl ? { githubUrl: entry.githubUrl } : {}),
    ...(entry.permissions ? { permissions: entry.permissions } : {}),
    ...(entry.engines ? { engines: entry.engines } : {}),
    ...(entry.configSchema ? { configSchema: entry.configSchema } : {}),
    ...(entry.configSchemaUrl ? { configSchemaUrl: entry.configSchemaUrl } : {}),
  };
}

export function isRegistryEntryInstallable(entry: PluginRegistryEntry): boolean {
  if (entry.installable === false) return false;
  if (entry.source?.type === 'bundled') return true;
  return Boolean(entry.source?.type === 'github' && isValidCommitSha(entry.source.commitSha));
}

export function assertGlobalScope(manifest: PluginManifest): string | null {
  if (manifest.scope !== PluginScopes.GLOBAL) {
    return GLOBAL_SCOPE_REJECT_MESSAGE;
  }
  return null;
}

export function assertCampaignScope(manifest: PluginManifest): string | null {
  if (manifest.scope !== PluginScopes.CAMPAIGN) {
    return CAMPAIGN_SCOPE_REJECT_MESSAGE;
  }
  return null;
}

export function parsePluginRegistryIndex(raw: unknown): RegistryIndexParseResult {
  let entries: unknown[] = [];

  if (Array.isArray(raw)) {
    entries = raw;
  } else if (isRecord(raw) && Array.isArray(raw.plugins)) {
    entries = raw.plugins;
  } else if (isRecord(raw)) {
    const single = validatePluginRegistryEntry(raw);
    if (single.ok) {
      entries = [single.entry];
    } else {
      return {
        ok: false,
        errors: [
          'Registry must be a JSON array, an object with a "plugins" array, or a single plugin manifest object',
          `Single-entry parse failed: ${single.errors.join('; ')}`,
          'Use registry.json for a catalog index, or point at one manifest.json for a single discoverable plugin.',
        ],
      };
    }
  } else {
    return {
      ok: false,
      errors: [
        'Registry must be a JSON array, an object with a "plugins" array, or a single plugin manifest object',
      ],
    };
  }

  const plugins: PluginRegistryEntry[] = [];
  const errors: string[] = [];

  entries.forEach((entry, index) => {
    const result = validatePluginRegistryEntry(entry);
    if (result.ok) {
      plugins.push(result.entry);
    } else {
      errors.push(`Entry ${index}: ${result.errors.join('; ')}`);
    }
  });

  if (plugins.length === 0 && errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, plugins };
}

export function buildDefaultConfigFromTemplate(
  template: PluginConfigTemplateField[] | undefined,
): Record<string, unknown> {
  if (!template?.length) return {};
  const config: Record<string, unknown> = {};
  for (const field of template) {
    if (field.defaultValue !== undefined) {
      config[field.key] = field.defaultValue;
    } else if (field.type === 'checkbox') {
      config[field.key] = false;
    } else {
      config[field.key] = '';
    }
  }
  return config;
}

export function extractManifestMeta(
  config: Record<string, unknown>,
): StoredPluginManifestMeta | null {
  const raw = config[MANIFEST_META_KEY];
  if (!isRecord(raw)) return null;
  const version = typeof raw.version === 'string' ? raw.version : '';
  const description = typeof raw.description === 'string' ? raw.description : '';
  const configTemplate = Array.isArray(raw.configTemplate)
    ? raw.configTemplate
        .map((item, i) => parseConfigTemplateField(item, i).field)
        .filter((f): f is PluginConfigTemplateField => f !== undefined)
    : [];
  const category = parseCategory(raw.category, []);
  const configSchemaUrl =
    typeof raw.configSchemaUrl === 'string' ? raw.configSchemaUrl : undefined;
  const permissions = Array.isArray(raw.permissions)
    ? raw.permissions.filter((p): p is string => typeof p === 'string')
    : undefined;
  const engines =
    raw.engines && typeof raw.engines === 'object' && !Array.isArray(raw.engines)
      ? (raw.engines as Record<string, string>)
      : undefined;
  const compatibilityRaw = raw.compatibility;
  const compatibility =
    compatibilityRaw &&
    typeof compatibilityRaw === 'object' &&
    !Array.isArray(compatibilityRaw) &&
    typeof (compatibilityRaw as Record<string, unknown>).lastVerifiedCore === 'string'
      ? {
          lastVerifiedCore: (
            (compatibilityRaw as Record<string, unknown>).lastVerifiedCore as string
          ).trim(),
        }
      : undefined;
  const configSchema =
    raw.configSchema && typeof raw.configSchema === 'object' && !Array.isArray(raw.configSchema)
      ? (raw.configSchema as Record<string, unknown>)
      : undefined;
  const uiSlots = Array.isArray(raw.uiSlots)
    ? raw.uiSlots.filter(
        (slot): slot is PluginUiSlotId =>
          typeof slot === 'string' && UI_SLOT_VALUES.has(slot),
      )
    : undefined;
  return {
    version,
    description,
    configTemplate,
    ...(category ? { category } : {}),
    ...(configSchema ? { configSchema } : {}),
    ...(configSchemaUrl ? { configSchemaUrl } : {}),
    ...(permissions?.length ? { permissions } : {}),
    ...(engines ? { engines } : {}),
    ...(compatibility ? { compatibility } : {}),
    ...(uiSlots?.length ? { uiSlots } : {}),
  };
}

export function stripManifestFromConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { [MANIFEST_META_KEY]: _meta, ...rest } = config;
  return rest;
}
