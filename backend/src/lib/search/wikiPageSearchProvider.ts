import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { hasElevatedNarrativeView } from '../acl.js';
import { parseCharacterMetadata } from '../characterMetadata.js';
import { parseBestiaryMetadata } from '../bestiaryMetadata.js';
import { parseLocationMetadata } from '../locationMetadata.js';
import { parseOrganizationMetadata } from '../organizationMetadata.js';
import { parseQuestMetadata, sanitizeQuestMetadataForRole } from '../questMetadata.js';
import { parseSceneMetadata, sanitizeSceneMetadataForRole } from '../sceneMetadata.js';
import {
  parseThreadMetadata,
  sanitizeThreadMetadataForRole,
} from '../threadMetadata.js';
import { resolveWikiCodexType } from '../resolveWikiCodexType.js';
import {
  buildPageDiscoveryMap,
  buildPageDiscoveryProjectionMap,
  isPageAvailableFromProjection,
} from '../discoveryProjectionService.js';
import {
  buildWikiPageHref,
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from '../wikiLinkService.js';
import {
  collectMarkdownFromBlocks,
  stripMarkdownToPlain,
} from '../wikiExcerpt.js';
import { canReadCharacterPageTab } from '../../controllers/characterPagesController.js';
import { ENTITY_CATEGORY_TO_SHELL } from '../../../../shared/characterPages.js';
import { resolveCanonicalEntityCategory } from '../../../../shared/resolveCanonicalEntityCategory.js';
import { WikiVisibility } from '../../types/domain.js';
import type { GlobalSearchResult } from '../../../../shared/globalSearch.js';
import type { SearchContext } from './searchContext.js';
import type { SearchProvider } from './searchProviderRegistry.js';
import {
  buildCandidateLikePattern,
  pickPrefilterToken,
  SEARCH_CANDIDATE_LIMIT,
} from './searchCandidateSql.js';
import { characterFieldValueToSearchText } from './searchFieldValue.js';
import { resolveSearchResultImage } from './searchImages.js';
import {
  providerOwnsRequestedTypes,
  searchTypeFromCodexType,
  WIKI_SEARCH_TYPE_KEYS,
} from './searchTypes.js';
import {
  compareRankedResults,
  rankSearchDocument,
  type SearchDocument,
  type SearchDocumentField,
} from './searchRanking.js';
import { buildSearchExcerpt } from './searchExcerpt.js';

function pushTextField(
  fields: SearchDocumentField[],
  kind: SearchDocumentField['kind'],
  label: string,
  text: string | null | undefined,
): void {
  if (!text || !text.trim()) return;
  fields.push({ kind, label, text: text.trim() });
}

function buildMetadataFields(
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

async function findCandidatePageIds(ctx: SearchContext): Promise<string[]> {
  const token = pickPrefilterToken(ctx.query.tokens);
  if (!token) return [];

  const pattern = buildCandidateLikePattern(token);
  const isElevated = ctx.isElevated;
  const visibilityClause = isElevated
    ? Prisma.empty
    : Prisma.sql`AND p."visibility" IN (${Prisma.join([
        WikiVisibility.PUBLIC,
        WikiVisibility.PARTY,
      ])})`;

  // Title-match-first ordering so the hard cap never drops a title hit in favor
  // of a JSON-only match. Over-select via CAST(... AS TEXT) is intentional.
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p."id" AS id
    FROM "WikiPage" p
    WHERE p."campaignId" = ${ctx.campaignId}
      AND p."deletedAt" IS NULL
      ${visibilityClause}
      AND (
        LOWER(p."title") LIKE ${pattern} ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM "WikiPageAlias" a
          WHERE a."pageId" = p."id"
            AND a."campaignId" = ${ctx.campaignId}
            AND LOWER(a."alias") LIKE ${pattern} ESCAPE '\\'
        )
        OR LOWER(CAST(p."blocks" AS TEXT)) LIKE ${pattern} ESCAPE '\\'
        OR LOWER(CAST(p."metadata" AS TEXT)) LIKE ${pattern} ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM "CharacterField" f
          WHERE f."characterPageId" = p."id"
            AND f."campaignId" = ${ctx.campaignId}
            AND LOWER(CAST(f."value" AS TEXT)) LIKE ${pattern} ESCAPE '\\'
        )
      )
    ORDER BY
      CASE WHEN LOWER(p."title") LIKE ${pattern} ESCAPE '\\' THEN 0 ELSE 1 END,
      p."updatedAt" DESC
    LIMIT ${SEARCH_CANDIDATE_LIMIT}
  `);

  return rows.map((r) => r.id);
}

export const wikiPageSearchProvider: SearchProvider = {
  id: 'wiki-pages',
  typeKeys: WIKI_SEARCH_TYPE_KEYS,

  async search(ctx: SearchContext): Promise<GlobalSearchResult[]> {
    if (!providerOwnsRequestedTypes(WIKI_SEARCH_TYPE_KEYS, ctx.types)) {
      return [];
    }

    const candidateIds = await findCandidatePageIds(ctx);
    if (candidateIds.length === 0) return [];

    const isElevated = isElevatedWikiRole(ctx.role);
    const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

    const pages = await prisma.wikiPage.findMany({
      where: {
        campaignId: ctx.campaignId,
        id: { in: candidateIds },
        deletedAt: null,
        ...(peerFilter ?? {}),
      },
      select: {
        id: true,
        title: true,
        templateType: true,
        metadata: true,
        blocks: true,
        visibility: true,
        parentId: true,
        workspace: true,
        pathKey: true,
        featuredImageId: true,
        mapAssetId: true,
        aliases: { select: { alias: true } },
        characterFields: {
          select: {
            label: true,
            fieldType: true,
            value: true,
            capabilities: true,
            pageTab: {
              select: {
                hidden: true,
                visibility: true,
                coreKey: true,
              },
            },
          },
        },
        stats: { select: { inboundLinkCount: true } },
      },
    });

    const pageIds = pages.map((p) => p.id);
    const [presenceMap, discoveryProjectionMap] = await Promise.all([
      buildPageDiscoveryMap(ctx.campaignId, pageIds),
      buildPageDiscoveryProjectionMap(ctx.campaignId, pageIds, {
        role: ctx.role,
      }),
    ]);

    const visiblePages = isElevated
      ? pages
      : pages.filter((page) =>
          isPageAvailableFromProjection(
            discoveryProjectionMap.get(page.id),
            presenceMap,
            page.id,
            ctx.role,
          ),
        );

    if (visiblePages.length === 0) return [];

    // Flat pages for entity-category resolution (minimal fields).
    const flatPages = visiblePages.map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId,
      templateType: p.templateType,
      metadata: p.metadata,
      workspace: p.workspace,
    }));

    const assetIds = new Set<string>();
    for (const page of visiblePages) {
      if (page.featuredImageId) assetIds.add(page.featuredImageId);
      if (page.mapAssetId) assetIds.add(page.mapAssetId);
      const portrait = (() => {
        if (!page.metadata || typeof page.metadata !== 'object') return null;
        const appearance = (page.metadata as Record<string, unknown>).appearance;
        if (!appearance || typeof appearance !== 'object') return null;
        const url = (appearance as Record<string, unknown>).portraitUrl;
        if (typeof url !== 'string') return null;
        const match = url.match(/\/api\/assets\/([^/?#]+)/);
        return match?.[1] ?? null;
      })();
      if (portrait) assetIds.add(portrait);
      const emblem = (() => {
        if (!page.metadata || typeof page.metadata !== 'object') return null;
        const raw = (page.metadata as Record<string, unknown>).emblemAssetId;
        return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
      })();
      if (emblem) assetIds.add(emblem);
    }
    const assets =
      assetIds.size > 0
        ? await prisma.asset.findMany({
            where: { campaignId: ctx.campaignId, id: { in: [...assetIds] } },
            select: {
              id: true,
              url: true,
              displayUrl: true,
              thumbnailUrl: true,
              visibility: true,
            },
          })
        : [];
    const assetsById = new Map(assets.map((a) => [a.id, a]));

    const canViewDmOnly = hasElevatedNarrativeView(ctx.actor);
    const results: GlobalSearchResult[] = [];

    for (const page of visiblePages) {
      const codexType = resolveWikiCodexType({
        templateType: page.templateType,
        metadata: page.metadata,
        id: page.id,
        title: page.title,
        parentId: page.parentId,
        flatPages,
      });
      const typeInfo = searchTypeFromCodexType(codexType);
      // When a type filter is active, still authorize + rank every candidate so
      // type/count tabs stay populated; skip heavy image projection for kinds
      // that will be filtered out of the returned result list.
      const requestedForReturn =
        ctx.types == null ||
        ctx.types.length === 0 ||
        ctx.types.includes(typeInfo.key);

      const fields: SearchDocumentField[] = [];

      for (const alias of page.aliases) {
        pushTextField(fields, 'alias', 'Alias', alias.alias);
      }

      const meta = buildMetadataFields(codexType, page.metadata, isElevated);
      fields.push(...meta.fields);

      const includeDmOnlyBlocks = isElevated;
      const markdownParts = collectMarkdownFromBlocks(
        page.blocks,
        includeDmOnlyBlocks,
      );
      if (markdownParts.length > 0) {
        const rawMarkdown = markdownParts.join('\n');
        const plain = stripMarkdownToPlain(rawMarkdown);
        // Match against both raw markdown and stripped text so authored
        // fragments remain discoverable (see plan: no under-select).
        pushTextField(fields, 'body', 'Body', rawMarkdown);
        if (plain && plain !== rawMarkdown) {
          pushTextField(fields, 'body', 'Body', plain);
        }
      }

      const entityCategory = resolveCanonicalEntityCategory(page, flatPages);
      const shell = entityCategory
        ? ENTITY_CATEGORY_TO_SHELL[entityCategory]
        : undefined;
      if (shell) {
        const tabAccess = {
          canEdit: isElevated,
          canViewDmOnly,
          shell,
        };
        for (const field of page.characterFields) {
          const capabilities =
            field.capabilities &&
            typeof field.capabilities === 'object' &&
            !Array.isArray(field.capabilities)
              ? (field.capabilities as Record<string, unknown>)
              : {};
          if (capabilities.readable === false) continue;
          if (
            field.pageTab &&
            !canReadCharacterPageTab(field.pageTab, tabAccess, ctx.role)
          ) {
            continue;
          }
          const text = characterFieldValueToSearchText(
            field.fieldType,
            field.value,
          );
          if (!text) continue;
          pushTextField(
            fields,
            'custom_field',
            `Custom field · ${field.label}`,
            text,
          );
        }
      }

      const doc: SearchDocument = {
        title: page.title,
        subtitle: meta.subtitle,
        fields,
        inboundLinkCount: page.stats?.inboundLinkCount ?? 0,
      };

      const ranked = rankSearchDocument(doc, ctx.query.tokens, ctx.query.text);
      if (!ranked) continue;

      const excerpt =
        requestedForReturn && ranked.matchField != null
          ? buildSearchExcerpt(ranked.matchField, ctx.query.tokens) ?? undefined
          : undefined;

      const image = requestedForReturn
        ? resolveSearchResultImage({
            metadata: page.metadata,
            blocks: page.blocks,
            featuredImageId: page.featuredImageId,
            mapAssetId: page.mapAssetId,
            assetsById,
            role: ctx.role,
          })
        : undefined;

      const href = buildWikiPageHref(ctx.campaignHandle, {
        id: page.id,
        title: page.title,
        parentId: page.parentId,
        templateType: page.templateType,
        workspace: page.workspace,
        pathKey: page.pathKey,
        metadata: page.metadata,
      });

      results.push({
        id: `${typeInfo.key}:${page.id}`,
        entityId: page.id,
        campaignId: ctx.campaignId,
        type: { key: typeInfo.key, label: typeInfo.label },
        title: page.title,
        ...(requestedForReturn && meta.subtitle
          ? { subtitle: meta.subtitle }
          : {}),
        ...(image ? { image } : {}),
        fallbackIcon: typeInfo.fallbackIcon,
        ...(excerpt ? { excerpt } : {}),
        href,
        matchedOn: ranked.matchedOn,
        score: ranked.score,
      });
    }

    results.sort(compareRankedResults);
    return results;
  },
};
