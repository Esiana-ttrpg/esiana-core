import { prisma } from '../prisma.js';
import { hasElevatedNarrativeView } from '../acl.js';
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
  SEARCH_CANDIDATE_BATCH,
  SEARCH_CANDIDATE_CEILING,
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
import { matchesStructuredText } from './searchStructuredMatch.js';
import { matchesDateFilter } from './searchDateSemantics.js';
import { matchesAuthorFilter } from './searchAttribution.js';
import { buildMetadataFields } from './index/buildWikiSearchIndexDocument.js';
import { ensureCampaignIndexed } from './index/searchIndexService.js';
import { findSearchIndexCandidates } from './index/getSearchIndexEngine.js';
import { normalizeSearchTokens } from './index/normalizeSearchText.js';

function pushTextField(
  fields: SearchDocumentField[],
  kind: SearchDocumentField['kind'],
  label: string,
  text: string | null | undefined,
): void {
  if (!text || !text.trim()) return;
  fields.push({ kind, label, text: text.trim() });
}

export const wikiPageSearchProvider: SearchProvider = {
  id: 'wiki-pages',
  typeKeys: WIKI_SEARCH_TYPE_KEYS,

  async search(ctx: SearchContext): Promise<GlobalSearchResult[]> {
    if (!providerOwnsRequestedTypes(WIKI_SEARCH_TYPE_KEYS, ctx.types)) {
      return [];
    }
    if (ctx.filters.authorsUnresolved) {
      return [];
    }

    await ensureCampaignIndexed(ctx.campaignId);

    const tokens = normalizeSearchTokens(ctx.query.tokens);
    if (tokens.length === 0) return [];

    const isElevated = isElevatedWikiRole(ctx.role);
    const visibilityIn = isElevated
      ? null
      : [WikiVisibility.PUBLIC, WikiVisibility.PARTY];

    const results: GlobalSearchResult[] = [];
    let cursor: string | null = null;
    let scanned = 0;
    let batchesExamined = 0;

    while (scanned < SEARCH_CANDIDATE_CEILING) {
      const batchSize = Math.min(
        SEARCH_CANDIDATE_BATCH,
        SEARCH_CANDIDATE_CEILING - scanned,
      );
      const { candidates, nextCursor } = await findSearchIndexCandidates({
        campaignId: ctx.campaignId,
        tokens,
        isElevated,
        visibilityIn,
        typeKeys: null, // authorize all kinds for type counts
        cursor,
        batchSize,
      });

      if (candidates.length === 0) break;
      batchesExamined += 1;
      scanned += candidates.length;

      const candidateIds = candidates.map((c) => c.sourceId);
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
          createdAt: true,
          createdByUserId: true,
          ownerType: true,
          ownerUserId: true,
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
          sessionTimelinePoint: {
            select: {
              authorId: true,
              createdAt: true,
              schedule: {
                select: {
                  plannedStartAt: true,
                  publishedAt: true,
                },
              },
            },
          },
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

      if (visiblePages.length === 0) {
        cursor = nextCursor;
        if (!nextCursor) break;
        continue;
      }

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

      // Preserve engine candidate order for this batch, then re-rank.
      const pageById = new Map(visiblePages.map((p) => [p.id, p]));
      for (const candidate of candidates) {
        const page = pageById.get(candidate.sourceId);
        if (!page) continue;

        const codexType = resolveWikiCodexType({
          templateType: page.templateType,
          metadata: page.metadata,
          id: page.id,
          title: page.title,
          parentId: page.parentId,
          flatPages,
        });
        const typeInfo = searchTypeFromCodexType(codexType);
        const requestedForReturn =
          ctx.types == null ||
          ctx.types.length === 0 ||
          ctx.types.includes(typeInfo.key);

        const attributionSource = {
          createdByUserId: page.createdByUserId,
          ownerType: page.ownerType,
          ownerUserId: page.ownerUserId,
          metadata: page.metadata,
          timelineAuthorId: page.sessionTimelinePoint?.authorId ?? null,
        };
        if (
          !matchesAuthorFilter(
            typeInfo.key,
            attributionSource,
            ctx.filters.authorUserIds,
          )
        ) {
          continue;
        }

        const dateSource = {
          pageCreatedAt: page.createdAt,
          timelineCreatedAt: page.sessionTimelinePoint?.createdAt ?? null,
          plannedStartAt:
            page.sessionTimelinePoint?.schedule?.plannedStartAt ?? null,
          publishedAt: page.sessionTimelinePoint?.schedule?.publishedAt ?? null,
        };
        if (
          !matchesDateFilter(typeInfo.key, dateSource, {
            after: ctx.filters.after,
            before: ctx.filters.before,
            hasDateFilter: ctx.filters.hasDateFilter,
          })
        ) {
          continue;
        }

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

        if (
          !matchesStructuredText(doc, {
            phrases: ctx.query.phrases,
            excludedTerms: ctx.query.excludedTerms,
          })
        ) {
          continue;
        }

        const ranked = rankSearchDocument(doc, ctx.query.tokens, ctx.query.text);
        if (!ranked) continue;

        const excerpt =
          requestedForReturn && ranked.matchField != null
            ? buildSearchExcerpt(ranked.matchField, ctx.query.tokens) ??
              undefined
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

      // Stop when we have enough authorized hits for the return limit and
      // have examined at least one full batch (for type counts).
      if (
        results.length >= ctx.limit &&
        batchesExamined >= 1 &&
        !nextCursor
      ) {
        break;
      }
      if (results.length >= ctx.limit && batchesExamined >= 1) {
        // Keep paging a bit for type counts, but stop at ceiling.
        // Type counts are derived from `results` at the service layer after
        // providers return; we still return all authorized hits we found so
        // the service can count them before slicing.
        if (results.length >= ctx.limit * 5 || !nextCursor) break;
      }

      cursor = nextCursor;
      if (!nextCursor) break;
    }

    results.sort(compareRankedResults);
    return results;
  },
};
