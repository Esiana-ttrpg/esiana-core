import {
  IMPORT_MODULE_TO_SKELETON,
  IMPORT_SK,
} from '../../../shared/importSkeletonKeys.js';
import {
  matchCanonicalFolderSegment,
  sanitizeFolderForSearch,
} from '../../../shared/importModuleSynonyms.js';
import type { MappableImportModule } from '../../../shared/importModuleSynonyms.js';
import {
  isDotPathSegment,
  isLooseRootMarkdown,
  normalizePathSegments,
  resolveWizardFolderMapping,
  type ImportFolderMapping,
} from '../../../shared/importZipStructure.js';
import {
  inferEntityTypeFromTags,
  type NormalizedFrontmatter,
} from './importFrontmatterNormalize.js';
import {
  resolveImportEntityCategory,
  resolveImportTemplateType,
} from './importModuleTemplateType.js';

export type PathScanRecord = {
  relativePath: string;
  filename: string;
  segments: string[];
};

export type PlacementResult =
  | {
      outcome: 'import';
      module: string;
      skeletonParentKey: string;
      templateType: string;
      entityCategory?: string;
      warnings?: string[];
    }
  | { outcome: 'skip'; skipReason: string };

const HARD_SKIP_BASENAMES = new Set([
  'todo',
  'untitled',
  'template',
  'scratch',
  'draft',
]);

const PLACE_TYPE_TOKENS = [
  'citadel',
  'fortress',
  'cave',
  'city',
  'temple',
  'dungeon',
  'tower',
  'ruins',
  'keep',
  'harbor',
  'harbour',
  'shire',
  'village',
  'town',
];

const ENTITY_TYPE_TO_MODULE: Record<string, MappableImportModule> = {
  characters: 'Characters',
  locations: 'Locations',
  organizations: 'Organizations',
  families: 'Families (tree)',
  bestiary: 'Bestiary',
  ancestries: 'Ancestries',
  maps: 'Maps',
  objects: 'Objects',
  'rules-resources': 'Game/Rules & Resources',
  quests: 'Game/Quests',
  journals: 'Game/Journals',
  'session-notes': 'Game/Session Notes',
  calendars: 'Game/Calendars',
  timelines: 'Game/Timelines',
  events: 'Game/Events',
};

function basenameStem(filename: string): string {
  return filename.replace(/\.md$/i, '').trim();
}

function moduleForEntityType(
  entityType: string,
  segments: readonly string[],
): { module: MappableImportModule; skeletonParentKey: string } {
  const module = ENTITY_TYPE_TO_MODULE[entityType] ?? 'Characters';
  const hasParty = segments.some((segment) => sanitizeFolderForSearch(segment) === 'party');
  if (entityType === 'characters' && hasParty) {
    return { module: 'Characters', skeletonParentKey: IMPORT_SK.party };
  }
  return {
    module,
    skeletonParentKey: IMPORT_MODULE_TO_SKELETON[module] ?? IMPORT_SK.characters,
  };
}

function placementFromModule(
  module: MappableImportModule,
  segments: readonly string[],
  customFields?: Record<string, string>,
): PlacementResult {
  const hasParty = segments.some((segment) => sanitizeFolderForSearch(segment) === 'party');
  const skeletonParentKey =
    module === 'Characters' && hasParty
      ? IMPORT_SK.party
      : (IMPORT_MODULE_TO_SKELETON[module] ?? IMPORT_SK.characters);
  const templateType = resolveImportTemplateType(module, customFields);
  const entityCategory = resolveImportEntityCategory(module, customFields);
  return {
    outcome: 'import',
    module,
    skeletonParentKey,
    templateType,
    ...(entityCategory ? { entityCategory } : {}),
  };
}

function inferEntityTypeFromFilename(filename: string): string | undefined {
  const stem = sanitizeFolderForSearch(basenameStem(filename));
  if (/\bsession\s*\d+/.test(stem) || stem.startsWith('session ')) return 'session-notes';
  if (/(^|\s)(rules|homebrew|homerules)(\s|$)/.test(stem)) return 'rules-resources';
  for (const token of PLACE_TYPE_TOKENS) {
    if (stem.includes(token)) return 'locations';
  }
  if (/(^|\s)(dragon|beast|monster)(\s|$)/.test(stem)) return 'bestiary';
  return undefined;
}

function hasSessionReference(
  titleStem: string,
  sessionNoteBodies: ReadonlyArray<{ title: string; body: string }>,
): boolean {
  const needle = titleStem.trim().toLowerCase();
  if (!needle) return false;
  for (const note of sessionNoteBodies) {
    const haystack = `${note.title}\n${note.body}`.toLowerCase();
    if (haystack.includes(needle) || haystack.includes(`[[${needle}]]`)) return true;
  }
  return false;
}

function hasEntityBodySignals(bodyMarkdown: string | undefined): boolean {
  if (!bodyMarkdown?.trim()) return false;
  const body = bodyMarkdown.toLowerCase();
  return (
    body.includes('statblock') ||
    body.includes('```ad-statblock') ||
    body.includes('ac:') ||
    body.includes('hit points:') ||
    body.includes('tags: [npc]')
  );
}

function customFieldsFromNormalized(normalized: NormalizedFrontmatter): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(normalized.raw)) {
    if (value == null) continue;
    fields[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (normalized.entityType) {
    fields.entityCategory = normalized.entityType;
  }
  return fields;
}

export function buildPathScanRecord(
  relativePath: string,
  wrapperPrefix?: string,
): PathScanRecord {
  const { filename, segments } = normalizePathSegments(relativePath, wrapperPrefix);
  return { relativePath, filename, segments };
}

export function resolvePathHardSkip(
  scan: PathScanRecord,
  folderMappings?: readonly ImportFolderMapping[],
): { skip: true; reason: string } | { skip: false } {
  const parts = scan.relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.some((segment) => isDotPathSegment(segment))) {
    return { skip: true, reason: 'dot-folder path' };
  }
  const stem = sanitizeFolderForSearch(basenameStem(scan.filename));
  if (HARD_SKIP_BASENAMES.has(stem)) {
    return { skip: true, reason: 'junk basename' };
  }
  const wizard = resolveWizardFolderMapping(scan.segments, folderMappings);
  if (wizard === 'Ignore Folder') {
    return { skip: true, reason: 'wizard ignore folder' };
  }
  return { skip: false };
}

export function resolvePlacement(input: {
  scan: PathScanRecord;
  normalized: NormalizedFrontmatter;
  folderMappings?: readonly ImportFolderMapping[];
  wrapperPrefix?: string;
  bodyMarkdown?: string;
  sessionNoteBodies?: ReadonlyArray<{ title: string; body: string }>;
}): PlacementResult {
  const customFields = customFieldsFromNormalized(input.normalized);
  const warnings: string[] = [];

  if (input.normalized.entityType) {
    const mapped = moduleForEntityType(input.normalized.entityType, input.scan.segments);
    const result = placementFromModule(mapped.module, input.scan.segments, {
      ...customFields,
      entityCategory: input.normalized.entityType,
    });
    return result;
  }

  const wizard = resolveWizardFolderMapping(input.scan.segments, input.folderMappings);
  if (wizard && wizard !== 'Ignore Folder') {
    return placementFromModule(wizard, input.scan.segments, customFields);
  }

  const canonical = matchCanonicalFolderSegment(input.scan.segments);
  let folderEntityType: string | undefined;
  if (canonical) {
    folderEntityType = resolveImportEntityCategory(canonical.module, customFields) ?? undefined;
  }

  const tagEntityType = inferEntityTypeFromTags(input.normalized.tags);
  if (tagEntityType) {
    const mapped = moduleForEntityType(tagEntityType, input.scan.segments);
    if (folderEntityType && folderEntityType !== tagEntityType) {
      warnings.push(
        `Frontmatter tag '${tagEntityType}' overrode folder classification '${folderEntityType}'`,
      );
    }
    const result = placementFromModule(mapped.module, input.scan.segments, {
      ...customFields,
      entityCategory: tagEntityType,
    });
    return warnings.length ? { ...result, warnings } : result;
  }

  if (canonical) {
    return placementFromModule(canonical.module, input.scan.segments, customFields);
  }

  const looseRoot = isLooseRootMarkdown(input.scan.relativePath, input.wrapperPrefix);
  if (looseRoot) {
    const inferred = inferEntityTypeFromFilename(input.scan.filename);
    if (inferred) {
      const mapped = moduleForEntityType(inferred, input.scan.segments);
      return placementFromModule(mapped.module, input.scan.segments, {
        ...customFields,
        entityCategory: inferred,
      });
    }

    const titleStem = basenameStem(input.scan.filename);
    if (
      hasSessionReference(titleStem, input.sessionNoteBodies ?? []) ||
      hasEntityBodySignals(input.bodyMarkdown)
    ) {
      return placementFromModule('Characters', input.scan.segments, {
        ...customFields,
        entityCategory: 'characters',
      });
    }

    return { outcome: 'skip', skipReason: 'unclassified loose root note' };
  }

  if (wizard === null && input.scan.segments.length > 0) {
    return {
      outcome: 'skip',
      skipReason: 'folder not mapped in wizard import manifest',
    };
  }

  return { outcome: 'skip', skipReason: 'no placement match' };
}
