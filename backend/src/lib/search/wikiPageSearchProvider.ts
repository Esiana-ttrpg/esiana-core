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
  type InternalSearchResult,
  type SearchDocument,
  type SearchDocumentField,
} from './searchRanking.js';
import { buildSearchExcerpt } from './searchExcerpt.js';
import { matchesStructuredText } from './searchStructuredMatch.js';
import { matchesDateFilter } from './searchDateSemantics.js';
import { matchesAuthorFilter } from './searchAttribution.js';
import {
  buildMetadataFields,
  SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
} from './index/buildWikiSearchIndexDocument.js';
import { ensureCampaignIndexed } from './index/searchIndexService.js';
import { findSearchIndexCandidates } from './index/getSearchIndexEngine.js';
import { normalizeSearchTokens } from './index/normalizeSearchText.js';
import {
  collectFuzzyCandidates,
  getFuzzyNameRowCap,
  type FuzzyNameCandidate,
  type FuzzyPassStatus,
} from './fuzzyNameMatch.js';

function pushTextField(
  fields: SearchDocumentField[],
  kind: SearchDocumentField['kind'],
  label: string,
  text: string | null | undefined,
): void {
  if (!text || !text.trim()) return;
  fields.push({ kind, label, text: text.trim() });
}

type FuzzyMeta = { similarity: number; on: 'title' | 'alias' };

/**
 * Load, authorize, filter, and rank a set of wiki page candidates.
 * Shared by the strict index path and the portable fuzzy name pass.
 */
async function scoreWikiCandidates(
  ctx: SearchContext,
  candidateIds: string[],
  options?: {
    fuzzyBySourceId?: Map<string, FuzzyMeta>;
  },
): Promise<InternalSearchResult[]> {
  if (candidateIds.length === 0) return [];

  const isElevated = isElevatedWikiRole(ctx.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);
  const fuzzyBySourceId = options?.fuzzyBySourceId;

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
      updatedAt: true,
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

  if (visiblePages.length === 0) return [];

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

  const pageById = new Map(visiblePages.map((p) => [p.id, p]));
  const results: InternalSearchResult[] = [];

  for (const candidateId of candidateIds) {
    const page = pageById.get(candidateId);
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

    const fuzzy = fuzzyBySourceId?.get(page.id);
    const recencyAt =
      page.sessionTimelinePoint?.schedule?.plannedStartAt ??
      page.sessionTimelinePoint?.schedule?.publishedAt ??
      page.sessionTimelinePoint?.createdAt ??
      page.updatedAt;

    const doc: SearchDocument = {
      title: page.title,
      subtitle: meta.subtitle,
      fields,
      inboundLinkCount: page.stats?.inboundLinkCount ?? 0,
      typeKey: typeInfo.key,
      recencyAt,
      ...(fuzzy ? { fuzzy } : {}),
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
      ...(requestedForReturn && meta.subtitle
        ? { subtitle: meta.subtitle }
        : {}),
      title: page.title,
      ...(image ? { image } : {}),
      fallbackIcon: typeInfo.fallbackIcon,
      ...(excerpt ? { excerpt } : {}),
      href,
      matchedOn: ranked.matchedOn,
      score: ranked.score,
      ...(ranked.exactName ? { exactName: true } : {}),
      ...(ctx.explain && ranked.explain ? { rank: ranked.explain } : {}),
    });
  }

  return results;
}

const fuzzyCapWarned = new Set<string>();

/** Process-local cache of campaign name rows for the fuzzy pass. */
interface NameRowCacheEntry {
  rows: FuzzyNameCandidate[];
  overCap: boolean;
  visibilityKey: string;
  cap: number;
  fetchedAt: number;
}

const NAME_ROW_CACHE_TTL_MS = 60_000;
const nameRowCache = new Map<string, NameRowCacheEntry>();

function visibilityCacheKey(visibilityIn: string[] | null): string {
  return visibilityIn == null ? '*' : visibilityIn.slice().sort().join(',');
}

async function loadCachedNameRows(input: {
  campaignId: string;
  visibilityIn: string[] | null;
  cap: number;
}): Promise<{ rows: FuzzyNameCandidate[]; overCap: boolean; nameRows: number }> {
  const visibilityKey = visibilityCacheKey(input.visibilityIn);
  const cached = nameRowCache.get(input.campaignId);
  const now = Date.now();
  if (
    cached &&
    cached.visibilityKey === visibilityKey &&
    cached.cap === input.cap &&
    now - cached.fetchedAt < NAME_ROW_CACHE_TTL_MS
  ) {
    return {
      rows: cached.overCap ? [] : cached.rows,
      overCap: cached.overCap,
      nameRows: cached.overCap ? input.cap + 1 : cached.rows.length,
    };
  }

  const nameDocs = await prisma.searchIndexDocument.findMany({
    where: {
      campaignId: input.campaignId,
      sourceKind: SEARCH_INDEX_SOURCE_KIND_WIKI_PAGE,
      ...(input.visibilityIn
        ? { visibility: { in: input.visibilityIn } }
        : {}),
    },
    select: {
      sourceId: true,
      titleNorm: true,
      aliasText: true,
    },
    // Fetch one past the cap so we can detect overflow without a separate count.
    take: input.cap + 1,
  });

  const overCap = nameDocs.length > input.cap;
  const rows = overCap
    ? []
    : nameDocs.map((d) => ({
        sourceId: d.sourceId,
        titleNorm: d.titleNorm,
        aliasText: d.aliasText,
      }));

  nameRowCache.set(input.campaignId, {
    rows,
    overCap,
    visibilityKey,
    cap: input.cap,
    fetchedAt: now,
  });

  return {
    rows,
    overCap,
    nameRows: nameDocs.length,
  };
}

export const wikiPageSearchProvider: SearchProvider = {
  id: 'wiki-pages',
  typeKeys: WIKI_SEARCH_TYPE_KEYS,

  async search(ctx: SearchContext) {
    if (!providerOwnsRequestedTypes(WIKI_SEARCH_TYPE_KEYS, ctx.types)) {
      return { results: [] };
    }
    if (ctx.filters.authorsUnresolved) {
      return { results: [] };
    }

    await ensureCampaignIndexed(ctx.campaignId);

    const tokens = normalizeSearchTokens(ctx.query.tokens);
    if (tokens.length === 0) return { results: [] };

    const isElevated = isElevatedWikiRole(ctx.role);
    const visibilityIn = isElevated
      ? null
      : [WikiVisibility.PUBLIC, WikiVisibility.PARTY];

    const results: InternalSearchResult[] = [];
    const scoredIds = new Set<string>();
    let cursor: string | null = null;
    let scanned = 0;
    let batchesExamined = 0;
    let hitCandidateCeiling = false;

    // All view needs fuller authorized sets for accurate section totalCounts.
    const earlyStopMultiple = ctx.types == null || ctx.types.length === 0 ? 50 : 5;

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
      const batchResults = await scoreWikiCandidates(ctx, candidateIds);
      for (const r of batchResults) {
        results.push(r);
        scoredIds.add(r.entityId);
      }

      if (
        results.length >= ctx.limit &&
        batchesExamined >= 1 &&
        !nextCursor
      ) {
        break;
      }
      if (results.length >= ctx.limit && batchesExamined >= 1) {
        if (results.length >= ctx.limit * earlyStopMultiple || !nextCursor) {
          if (nextCursor && scanned >= SEARCH_CANDIDATE_CEILING) {
            hitCandidateCeiling = true;
          }
          break;
        }
      }

      cursor = nextCursor;
      if (!nextCursor) break;
      if (scanned >= SEARCH_CANDIDATE_CEILING) {
        hitCandidateCeiling = true;
        break;
      }
    }

    // --- Portable fuzzy name pass (competes with strict; not a fallback) ---
    let fuzzyStatus: FuzzyPassStatus = 'skipped-ineligible';
    let nameRows = 0;
    let fuzzyMs = 0;
    const fuzzyEligible = tokens.some((t) => t.length >= 4);

    if (fuzzyEligible) {
      const cap = getFuzzyNameRowCap();
      const fuzzyStart = performance.now();
      const loaded = await loadCachedNameRows({
        campaignId: ctx.campaignId,
        visibilityIn,
        cap,
      });
      nameRows = loaded.nameRows;
      if (loaded.overCap) {
        fuzzyStatus = 'skipped-cap';
        fuzzyMs = Math.round(performance.now() - fuzzyStart);
        if (!fuzzyCapWarned.has(ctx.campaignId)) {
          fuzzyCapWarned.add(ctx.campaignId);
          console.warn(
            '[search] fuzzy name pass skipped: campaign name set exceeds safety cap',
            {
              campaignId: ctx.campaignId,
              nameRows,
              cap,
              hint: 'Raise SEARCH_FUZZY_NAME_ROW_CAP or add indexed fuzzy acceleration',
            },
          );
        }
      } else {
        const fuzzyHits = collectFuzzyCandidates(tokens, loaded.rows, {
          excludeIds: scoredIds,
        });
        if (fuzzyHits.length > 0) {
          const fuzzyBySourceId = new Map<string, FuzzyMeta>();
          for (const hit of fuzzyHits) {
            fuzzyBySourceId.set(hit.sourceId, {
              similarity: hit.similarity,
              on: hit.on,
            });
          }
          const fuzzyResults = await scoreWikiCandidates(
            ctx,
            fuzzyHits.map((h) => h.sourceId),
            { fuzzyBySourceId },
          );
          for (const r of fuzzyResults) {
            // Prefer higher score if a strict hit somehow shares the id.
            const existingIdx = results.findIndex(
              (x) => x.entityId === r.entityId,
            );
            if (existingIdx >= 0) {
              if (r.score > results[existingIdx]!.score) {
                results[existingIdx] = r;
              }
            } else {
              results.push(r);
              scoredIds.add(r.entityId);
            }
          }
        }
        fuzzyStatus = 'ran';
        fuzzyMs = Math.round(performance.now() - fuzzyStart);
      }
    }

    results.sort(compareRankedResults);

    const diagnostics: Record<string, unknown> = {
      fuzzy: fuzzyStatus,
      nameRows,
      fuzzyMs,
      strictScanned: scanned,
      hitCandidateCeiling,
    };

    return {
      results,
      diagnostics,
      hitCandidateCeiling,
    };
  },
};

/** Test helper — clear the once-per-campaign fuzzy-cap warn memo and name-row cache. */
export function clearFuzzyCapWarnMemoForTests(): void {
  fuzzyCapWarned.clear();
  nameRowCache.clear();
}

/** Invalidate cached name rows for a campaign after index rebuilds/upserts. */
export function invalidateFuzzyNameRowCache(campaignId?: string): void {
  if (campaignId) {
    nameRowCache.delete(campaignId);
    return;
  }
  nameRowCache.clear();
}
