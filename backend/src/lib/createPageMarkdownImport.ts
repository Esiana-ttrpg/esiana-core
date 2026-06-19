import { categoryTitleToEntityCategoryKey } from './entityCategoryKeys.js';
import { normalizeFrontmatter } from './importFrontmatterNormalize.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import { extractTitleFromBody } from './markdownPackImporter.js';
import { frontMatterFieldsToMetadata } from './pageMetadataRoundTrip.js';

export type CreatePageImportVisibility = 'Public' | 'Party' | 'DM_Only';

export type CreatePageImportFormPatch = {
  name?: string;
  description?: string;
  visibility?: CreatePageImportVisibility;
  characterRole?: string;
  fieldValues?: Record<string, string>;
  parentAncestryId?: string | null;
};

export type CreatePageImportPrefill = {
  title: string;
  description: string;
  visibility?: CreatePageImportVisibility;
  tags: Array<{ name: string }>;
  formPatch: CreatePageImportFormPatch;
  metadata: Record<string, unknown>;
};

const MAX_MARKDOWN_BYTES = 512 * 1024;

const SLUG_OR_ASSET_REF = /^(slug|asset):/i;

function titleFromFilename(filename?: string): string | null {
  if (!filename?.trim()) return null;
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? filename;
  const withoutExt = base.replace(/\.md$/i, '').trim();
  if (!withoutExt) return null;
  return withoutExt
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveImportTitle(
  frontMatterTitle: string | undefined,
  bodyMarkdown: string,
  filename?: string,
): string {
  const fromFrontMatter = frontMatterTitle?.trim();
  if (fromFrontMatter) return fromFrontMatter;
  const fromHeading = extractTitleFromBody(bodyMarkdown);
  if (fromHeading) return fromHeading;
  const fromFilename = titleFromFilename(filename);
  if (fromFilename) return fromFilename;
  return '';
}

function resolveImportDescription(bodyMarkdown: string, blurb?: string): string {
  const body = bodyMarkdown.trim();
  if (body) return body;
  return blurb?.trim() ?? '';
}

function isCreatePageVisibility(value: string | undefined): value is CreatePageImportVisibility {
  return value === 'Public' || value === 'Party' || value === 'DM_Only';
}

function readCodexField(
  metadata: Record<string, unknown>,
  key: string,
): string {
  const fields = metadata.fields;
  if (!Array.isArray(fields)) return '';
  for (const entry of fields) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { key?: unknown; value?: unknown };
    if (String(row.key ?? '').trim() === key) {
      return String(row.value ?? '').trim();
    }
  }
  return '';
}

function readQuickInfoField(
  metadata: Record<string, unknown>,
  key: string,
): string {
  const quickInfo = metadata.quickInfo;
  if (!Array.isArray(quickInfo)) return '';
  for (const entry of quickInfo) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { key?: unknown; value?: unknown };
    if (String(row.key ?? '').trim() === key) {
      return String(row.value ?? '').trim();
    }
  }
  return '';
}

function collectSlugRefWarnings(metadata: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string' && SLUG_OR_ASSET_REF.test(value.trim())) {
      warnings.push(`Unresolved reference at ${path}: ${value.trim()}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        visit(nested, path ? `${path}.${key}` : key);
      }
    }
  };
  visit(metadata, 'metadata');
  return warnings;
}

function buildCharacterFormPatch(metadata: Record<string, unknown>): CreatePageImportFormPatch {
  const characterRole =
    typeof metadata.characterRole === 'string' && metadata.characterRole.trim()
      ? metadata.characterRole.trim()
      : 'generic';
  const fieldValues: Record<string, string> = {};

  switch (characterRole) {
    case 'generic': {
      const role = readQuickInfoField(metadata, 'Role');
      const affiliation = readQuickInfoField(metadata, 'Affiliation');
      const location = readQuickInfoField(metadata, 'Location');
      if (role) fieldValues.Role = role;
      if (affiliation) fieldValues.Affiliation = affiliation;
      if (location) fieldValues.Location = location;
      break;
    }
    case 'party-member': {
      const role = readQuickInfoField(metadata, 'Role');
      const location = readQuickInfoField(metadata, 'Location');
      if (role) fieldValues.partyRole = role;
      if (location) fieldValues.startingLocation = location;
      break;
    }
    case 'villain': {
      const threat = readQuickInfoField(metadata, 'Threat Level');
      const affiliation = readQuickInfoField(metadata, 'Affiliation');
      const goal = typeof metadata.motivation === 'string' ? metadata.motivation.trim() : '';
      if (threat) fieldValues.threatLevel = threat;
      if (affiliation) fieldValues.affiliation = affiliation;
      if (goal) fieldValues.primaryGoal = goal;
      break;
    }
    case 'noble': {
      const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
      const house = readQuickInfoField(metadata, 'Family');
      const affiliation = readQuickInfoField(metadata, 'Affiliation');
      const seat = readQuickInfoField(metadata, 'Location');
      if (title) fieldValues.title = title;
      if (house) fieldValues.house = house;
      if (affiliation) fieldValues.affiliation = affiliation;
      if (seat) fieldValues.seat = seat;
      break;
    }
    case 'merchant': {
      const business = readQuickInfoField(metadata, 'Business');
      const location = readQuickInfoField(metadata, 'Location');
      const guild = readQuickInfoField(metadata, 'Guild');
      if (business) fieldValues.business = business;
      if (location) fieldValues.location = location;
      if (guild) fieldValues.guild = guild;
      break;
    }
    default:
      break;
  }

  return {
    characterRole,
    fieldValues,
  };
}

function buildCategoryFormPatch(
  categoryTitle: string,
  metadata: Record<string, unknown>,
): CreatePageImportFormPatch {
  const fieldValues: Record<string, string> = {};

  if (categoryTitle === 'Characters') {
    return buildCharacterFormPatch(metadata);
  }

  if (categoryTitle === 'Organizations') {
    const orgType =
      typeof metadata.orgType === 'string'
        ? metadata.orgType.trim()
        : readCodexField(metadata, 'Type');
    const headquarters = readCodexField(metadata, 'Headquarters');
    if (orgType) fieldValues.orgType = orgType;
    if (headquarters) fieldValues.Headquarters = headquarters;
    return { fieldValues };
  }

  if (categoryTitle === 'Bestiary') {
    const creatureType =
      typeof metadata.creatureType === 'string'
        ? metadata.creatureType.trim()
        : readCodexField(metadata, 'Type');
    if (creatureType) fieldValues.creatureType = creatureType;
    return { fieldValues };
  }

  if (categoryTitle === 'Locations') {
    const type =
      readCodexField(metadata, 'Type') ||
      (typeof metadata.locationType === 'string' ? metadata.locationType.trim() : '');
    const region =
      readCodexField(metadata, 'Region') ||
      (typeof metadata.region === 'string' ? metadata.region.trim() : '');
    if (type) fieldValues.Type = type;
    if (region) fieldValues.Region = region;
    return { fieldValues };
  }

  if (categoryTitle === 'Ancestries') {
    const parentAncestryId =
      typeof metadata.parentAncestryId === 'string' ? metadata.parentAncestryId.trim() : '';
    if (parentAncestryId && !SLUG_OR_ASSET_REF.test(parentAncestryId)) {
      return { parentAncestryId };
    }
    return {};
  }

  return {};
}

export function buildCreatePageImportPrefill(
  markdown: string,
  categoryTitle: string,
  options?: { filename?: string },
): { prefill: CreatePageImportPrefill; warnings: string[] } {
  if (Buffer.byteLength(markdown, 'utf8') > MAX_MARKDOWN_BYTES) {
    throw new Error('Markdown file is too large (max 512KB).');
  }

  const parsed = parseMarkdownFrontMatter(markdown);
  const { frontMatter } = parsed;
  const rawForNormalize: Record<string, unknown> = {
    ...frontMatter.customFields,
    ...(frontMatter.title ? { title: frontMatter.title } : {}),
    ...(frontMatter.blurb ? { blurb: frontMatter.blurb } : {}),
    ...(frontMatter.tags.length > 0 ? { tags: frontMatter.tags } : {}),
  };
  const normalized = normalizeFrontmatter(rawForNormalize);
  const metadata = frontMatterFieldsToMetadata(frontMatter.customFields);

  const expectedEntityCategory = categoryTitleToEntityCategoryKey(categoryTitle);
  const importedEntityCategory =
    typeof metadata.entityCategory === 'string'
      ? metadata.entityCategory.trim()
      : normalized.entityType;

  const warnings: string[] = [];
  if (
    importedEntityCategory &&
    importedEntityCategory !== expectedEntityCategory
  ) {
    warnings.push(
      `Frontmatter entity category "${importedEntityCategory}" does not match create hub "${expectedEntityCategory}".`,
    );
  }

  warnings.push(...collectSlugRefWarnings(metadata));

  const title = resolveImportTitle(frontMatter.title, parsed.bodyMarkdown, options?.filename);
  const description = resolveImportDescription(parsed.bodyMarkdown, frontMatter.blurb);
  const visibility = isCreatePageVisibility(normalized.visibility)
    ? normalized.visibility
    : undefined;

  const formPatch = buildCategoryFormPatch(categoryTitle, metadata);
  formPatch.name = title;
  formPatch.description = description;
  if (visibility) formPatch.visibility = visibility;

  const tags = normalized.tags.map((name) => ({ name }));

  return {
    prefill: {
      title,
      description,
      visibility,
      tags,
      formPatch,
      metadata,
    },
    warnings,
  };
}
