import { parseCharacterMetadata } from '../../characterMetadata.js';
import { parseBestiaryMetadata } from '../../bestiaryMetadata.js';
import { parseLocationMetadata } from '../../locationMetadata.js';
import { parseOrganizationMetadata } from '../../organizationMetadata.js';
import { parseQuestMetadata, sanitizeQuestMetadataForRole } from '../../questMetadata.js';
import { parseSceneMetadata, sanitizeSceneMetadataForRole } from '../../sceneMetadata.js';
import {
  parseThreadMetadata,
  sanitizeThreadMetadataForRole,
} from '../../threadMetadata.js';
import {
  collectMarkdownFromBlocks,
  stripMarkdownToPlain,
} from '../../wikiExcerpt.js';
import { resolveWikiCodexType } from '../../resolveWikiCodexType.js';
import { canReadCharacterPageTab } from '../../../controllers/characterPagesController.js';
import { ENTITY_CATEGORY_TO_SHELL } from '../../../../../shared/characterPages.js';
import { resolveCanonicalEntityCategory } from '../../../../../shared/resolveCanonicalEntityCategory.js';
import { CampaignMemberRoles } from '../../../types/domain.js';
import { characterFieldValueToSearchText } from '../searchFieldValue.js';
import {
  searchTypeFromCodexType,
} from '../searchTypes.js';
import type {
  SearchDocumentField,
} from '../searchRanking.js';
import { normalizeSearchText } from './normalizeSearchText.js';

export const SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE = 'wiki-page';
export const SEARCH_INDEX_PROVIDER_WIKI_PAGES = 'wiki-pages';

export interface WikiSearchIndexPageInput {
  id: string;
  title: string;
  templateType: string;
  metadata: unknown;
  blocks: unknown;
  visibility: string;
  parentId: string | null;
  workspace: string | null;
  updatedAt: Date;
  aliases: Array<{ alias: string }>;
  characterFields: Array<{
    label: string;
    fieldType: string;
    value: unknown;
    capabilities: unknown;
    pageTab: {
      hidden: boolean;
      visibility: string;
      coreKey: string | null;
    } | null;
  }>;
}

export interface WikiSearchIndexFlatPage {
  id: string;
  title: string;
  parentId: string | null;
  templateType: string;
  metadata: unknown;
  workspace: string | null;
}

export interface BuiltWikiSearchIndexDocument {
  sourceKind: typeof SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE;
  sourceId: string;
  providerId: typeof SEARCH_INDEX_PROVIDER_WIKI_PAGES;
  typeKey: string;
  visibility: string;
  title: string;
  titleNorm: string;
  aliasText: string;
  metadataText: string;
  customFieldText: string;
  bodyText: string;
  elevatedText: string;
  sourceUpdatedAt: Date;
}

function pushTextField(
  fields: SearchDocumentField[],
  kind: SearchDocumentField['kind'],
  label: string,
  text: string | null | undefined,
): void {
  if (!text || !text.trim()) return;
  fields.push({ kind, label, text: text.trim() });
}

/**
 * Project codex metadata into searchable fields.
 * Shared by write-time indexing and read-time verification so they cannot drift.
 */
export function buildMetadataFields(
  codexType: string,
  metadata: unknown,
  isElevated: boolean,
): { fields: SearchDocumentField[]; subtitle?: string } {
  const fields: SearchDocumentField[] = [];
  let subtitle: string | undefined;
  const type = codexType.toUpperCase();

  if (type === 'CHARACTER') {
    const id = parseCharacterMetadata(metadata);
    subtitle = id.profession ?? id.title ?? undefined;
    pushTextField(fields, 'metadata', 'Profession', id.profession);
    pushTextField(fields, 'metadata', 'Title', id.title);
    pushTextField(fields, 'metadata', 'Known for', id.knownFor);
    pushTextField(fields, 'metadata', 'Motivation', id.motivation);
    pushTextField(fields, 'metadata', 'Appearance', id.appearance?.summary);
  } else if (type === 'BESTIARY') {
    const b = parseBestiaryMetadata(metadata);
    subtitle = b.creatureType ?? undefined;
    pushTextField(fields, 'metadata', 'Also known as', b.alsoKnownAs);
    pushTextField(fields, 'metadata', 'Known for', b.knownFor);
    pushTextField(fields, 'metadata', 'Behavior', b.behaviorSummary);
    pushTextField(fields, 'metadata', 'Habitat', b.habitat);
    pushTextField(fields, 'metadata', 'Appearance', b.appearance?.summary);
  } else if (type === 'LOCATION') {
    const loc = parseLocationMetadata(metadata);
    subtitle = loc.region ?? loc.locationType ?? undefined;
    if (loc.knownFor.length > 0) {
      pushTextField(fields, 'metadata', 'Known for', loc.knownFor.join(', '));
    }
    pushTextField(fields, 'metadata', 'Region', loc.region);
    pushTextField(fields, 'metadata', 'Status', loc.currentStatus);
    pushTextField(fields, 'metadata', 'Climate', loc.climate);
  } else if (type === 'ORGANIZATION') {
    const org = parseOrganizationMetadata(metadata);
    subtitle = org.motto ?? org.publicPurpose ?? undefined;
    pushTextField(fields, 'metadata', 'Motto', org.motto);
    pushTextField(fields, 'metadata', 'Purpose', org.publicPurpose);
    pushTextField(fields, 'metadata', 'Reputation', org.publicReputation);
    if (isElevated) {
      pushTextField(fields, 'metadata', 'Private agenda', org.privateAgenda);
    }
  } else if (type === 'QUEST') {
    const quest = sanitizeQuestMetadataForRole(
      parseQuestMetadata(metadata),
      isElevated,
    );
    subtitle = quest.summary ?? undefined;
    pushTextField(fields, 'metadata', 'Summary', quest.summary);
    if (isElevated) {
      pushTextField(fields, 'metadata', 'GM notes', quest.gmNotes);
    }
  } else if (type === 'SCENE') {
    const scene = sanitizeSceneMetadataForRole(
      parseSceneMetadata(metadata),
      isElevated,
    );
    subtitle = scene.summary ?? undefined;
    pushTextField(fields, 'metadata', 'Summary', scene.summary);
    if (isElevated) {
      pushTextField(fields, 'metadata', 'GM notes', scene.gmNotes);
    }
  } else if (type === 'THREAD') {
    const thread = sanitizeThreadMetadataForRole(
      parseThreadMetadata(metadata),
      isElevated,
    );
    // Thread metadata is mostly structural; title/body carry prose.
    void thread;
  }

  return { fields, subtitle };
}

function joinNormalized(parts: string[]): string {
  return normalizeSearchText(parts.filter(Boolean).join(' '));
}

function fieldTexts(fields: SearchDocumentField[]): string[] {
  return fields.map((f) => f.text);
}

function collectBodyTexts(blocks: unknown, includeDmOnly: boolean): string[] {
  const markdownParts = collectMarkdownFromBlocks(blocks, includeDmOnly);
  const out: string[] = [];
  if (markdownParts.length === 0) return out;
  const rawMarkdown = markdownParts.join('\n');
  out.push(rawMarkdown);
  const plain = stripMarkdownToPlain(rawMarkdown);
  if (plain && plain !== rawMarkdown) out.push(plain);
  return out;
}

function collectCharacterFieldTexts(
  page: WikiSearchIndexPageInput,
  flatPages: WikiSearchIndexFlatPage[],
  partyReadable: boolean,
): string[] {
  const entityCategory = resolveCanonicalEntityCategory(page, flatPages);
  const shell = entityCategory
    ? ENTITY_CATEGORY_TO_SHELL[entityCategory]
    : undefined;
  if (!shell) return [];

  const texts: string[] = [];
  const tabAccess = {
    canEdit: !partyReadable,
    canViewDmOnly: !partyReadable,
    shell,
  };
  const role = partyReadable
    ? CampaignMemberRoles.PARTICIPANT
    : CampaignMemberRoles.GAMEMASTER;

  for (const field of page.characterFields) {
    const capabilities =
      field.capabilities &&
      typeof field.capabilities === 'object' &&
      !Array.isArray(field.capabilities)
        ? (field.capabilities as Record<string, unknown>)
        : {};
    if (capabilities.readable === false) continue;

    const tabReadable =
      !field.pageTab ||
      canReadCharacterPageTab(field.pageTab, tabAccess, role);

    // Party tier: only fields readable to a non-elevated viewer.
    // Elevated tier: fields that require elevated access.
    if (partyReadable && !tabReadable) continue;
    if (!partyReadable && tabReadable) continue;

    const text = characterFieldValueToSearchText(field.fieldType, field.value);
    if (!text) continue;
    texts.push(text);
  }
  return texts;
}

/**
 * Build the derived search-index row for a wiki page.
 * Party tier = party-visible metadata/body/custom fields.
 * Elevated tier = delta only (DM-only blocks, GM notes, gated fields).
 */
export function buildWikiSearchIndexDocument(
  page: WikiSearchIndexPageInput,
  flatPages: WikiSearchIndexFlatPage[],
): BuiltWikiSearchIndexDocument {
  const codexType = resolveWikiCodexType({
    templateType: page.templateType,
    metadata: page.metadata,
    id: page.id,
    title: page.title,
    parentId: page.parentId,
    flatPages,
  });
  const typeInfo = searchTypeFromCodexType(codexType);

  const partyMeta = buildMetadataFields(codexType, page.metadata, false);
  const elevatedMeta = buildMetadataFields(codexType, page.metadata, true);

  const partyMetaTexts = new Set(fieldTexts(partyMeta.fields));
  const elevatedOnlyMeta = fieldTexts(elevatedMeta.fields).filter(
    (t) => !partyMetaTexts.has(t),
  );

  const partyBody = collectBodyTexts(page.blocks, false);
  const elevatedBodyAll = collectBodyTexts(page.blocks, true);
  const partyBodySet = new Set(partyBody);
  const elevatedOnlyBody = elevatedBodyAll.filter((t) => !partyBodySet.has(t));

  const partyCustom = collectCharacterFieldTexts(page, flatPages, true);
  const elevatedCustom = collectCharacterFieldTexts(page, flatPages, false);

  const aliasText = joinNormalized(page.aliases.map((a) => a.alias));

  return {
    sourceKind: SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
    sourceId: page.id,
    providerId: SEARCH_INDEX_PROVIDER_WIKI_PAGES,
    typeKey: typeInfo.key,
    visibility: page.visibility,
    title: page.title,
    titleNorm: normalizeSearchText(page.title),
    aliasText,
    metadataText: joinNormalized(fieldTexts(partyMeta.fields)),
    customFieldText: joinNormalized(partyCustom),
    bodyText: joinNormalized(partyBody),
    elevatedText: joinNormalized([
      ...elevatedOnlyMeta,
      ...elevatedOnlyBody,
      ...elevatedCustom,
    ]),
    sourceUpdatedAt: page.updatedAt,
  };
}
