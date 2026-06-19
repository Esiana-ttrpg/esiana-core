/** Official community plugin catalog index (blob link — normalized to raw on fetch). */
export const DEFAULT_PLUGIN_REGISTRY_URL =
  'https://github.com/Esiana-ttrpg/community-plugins/blob/main/registry.json';

/** Monorepo / dev default — same catalog. */
export const DEV_PLUGIN_REGISTRY_URL = DEFAULT_PLUGIN_REGISTRY_URL;

export const PluginScopes = {
  GLOBAL: 'global',
  CAMPAIGN: 'campaign',
} as const;

export type PluginScope = (typeof PluginScopes)[keyof typeof PluginScopes];

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

export const ALL_PLUGIN_CATEGORIES: PluginCategory[] = [
  PluginCategories.THEME,
  PluginCategories.WIDGET,
  PluginCategories.INTEGRATION,
  PluginCategories.WIKI,
  PluginCategories.LFG,
  PluginCategories.UTILITY,
  PluginCategories.DEV,
];

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

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  scope: PluginScope;
  category?: PluginCategory;
  configTemplate?: PluginConfigTemplateField[];
  backendEntry?: string;
  frontendEntry?: string;
  githubUrl?: string;
  configSchemaUrl?: string;
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
  installable?: boolean;
  configTemplate?: PluginConfigTemplateField[];
  backendEntry?: string;
  frontendEntry?: string;
  githubUrl?: string;
  configSchemaUrl?: string;
  permissions?: string[];
  compatibility?: {
    lastVerified?: string;
    lastVerifiedCore?: string;
  };
  lastUpdated?: string;
  tags?: string[];
  cspExtensions?: {
    connectSrc?: string[];
    imgSrc?: string[];
  };
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
]);

const CATEGORY_VALUES = new Set<string>(Object.values(PluginCategories));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isValidCommitSha(value: string): boolean {
  return COMMIT_SHA_PATTERN.test(value.trim());
}

function parseConfigTemplateField(
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

function parseCategory(raw: unknown, errors: string[]): PluginCategory | undefined {
  if (raw === undefined) return undefined;
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return undefined;
  if (!CATEGORY_VALUES.has(value)) {
    errors.push(`category must be one of: ${[...CATEGORY_VALUES].join(', ')}`);
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

function parseStringArray(
  raw: unknown,
  field: string,
  errors: string[],
): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${field} must be an array when provided`);
    return undefined;
  }
  const values: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] !== 'string' || !raw[i].trim()) {
      errors.push(`${field}[${i}] must be a non-empty string`);
    } else {
      values.push(raw[i].trim());
    }
  }
  return values.length ? values : undefined;
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

  let cspExtensions: PluginRegistryEntry['cspExtensions'];
  if (raw.cspExtensions !== undefined) {
    if (!isRecord(raw.cspExtensions)) {
      errors.push('cspExtensions must be an object when provided');
    } else {
      const connectSrc = parseStringArray(
        raw.cspExtensions.connectSrc,
        'cspExtensions.connectSrc',
        errors,
      );
      const imgSrc = parseStringArray(raw.cspExtensions.imgSrc, 'cspExtensions.imgSrc', errors);
      cspExtensions = {
        ...(connectSrc?.length ? { connectSrc } : {}),
        ...(imgSrc?.length ? { imgSrc } : {}),
      };
    }
  }

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
      ...(configSchemaUrl ? { configSchemaUrl } : {}),
      ...(permissions?.length ? { permissions } : {}),
      ...(cspExtensions && Object.keys(cspExtensions).length ? { cspExtensions } : {}),
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

export function isRegistryEntryInstallable(entry: PluginRegistryEntry): boolean {
  if (entry.installable === false) return false;
  if (entry.source?.type === 'bundled') return true;
  return Boolean(entry.source?.type === 'github' && isValidCommitSha(entry.source.commitSha));
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
