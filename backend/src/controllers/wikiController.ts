import type { Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import { prisma } from '../lib/prisma.js';
import {
  resolveCampaignAppearanceProfile,
  serializeAppearanceProfileForApi,
} from '../lib/appearanceProfile.js';
import {
  buildDefaultBlocks,
  buildEventLoreBlocks,
  buildThreadDefaultBlocks,
} from '../lib/pageTemplates.js';
import {
  hydrateEventLoreBlocks,
  isEventLorePageId,
  loadCalendarEventDescriptionForLorePage,
  syncEventLoreDescriptionFromBlocks,
} from '../lib/eventLoreWiki.js';
import { buildWikiTree, canViewWikiPage } from '../lib/wikiTree.js';
import { isHubPageVisible } from '../lib/hubVisibility.js';
import { normalizeSidebarConfig, isSidebarConfigBlank } from '../lib/sidebarConfig.js';
import { toInputJsonValue } from '../lib/inputJsonValue.js';
import type { Prisma } from '@prisma/client';
import { enrichSidebarConfigWithIconUrls } from '../lib/sidebarIconEnrich.js';
import { PLAYER_SESSION_NOTES_TITLE } from '../lib/seedWiki.js';
import { ensureQuickAccessCategoryTitle } from '../lib/ensureQuickAccessCategoryTitle.js';
import { ensureRemoveLegacyDashboardWikiPage } from '../lib/ensureRemoveLegacyDashboardWikiPage.js';
import { normalizeEntityCategoryKey } from '../lib/entityCategoryKeys.js';
import {
  normalizeWikiPageTemplateFields,
  readEntityCategoryFromMetadata,
} from '../../../shared/wikiTemplateType.js';
import {
  buildContentSnippet,
  isCategoryIndexTitle,
} from '../lib/wikiCategories.js';
import { compareWikiTitles } from '../lib/wikiSort.js';
import { mapMemberToIdentityFields } from '../lib/memberIdentity.js';
import { formatPlayerLabel } from '../lib/userDisplay.js';
import {
  AssetTypes,
  CampaignMemberRoles,
  WikiVisibility,
} from '../types/domain.js';
import { env } from '../config/env.js';
import {
  respondAssetReferenceValidationError,
  validateAppearanceAssetReferences,
  validateWikiBlocksAssetReferences,
} from '../lib/assetReferenceValidation.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { parseCampaignIntegrations } from '../../../shared/campaignIntegrations.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from '../lib/acl.js';
import { resolveDefaultPageOwnership } from '../lib/pageOwnershipDefaults.js';
import {
  transformWikiPageInCampaign,
  validateWikiParentModuleScope,
} from '../lib/wikiPageTransformService.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import {
  can as policyCan,
  canEditPage,
  resolvePageEditBlock,
  type CampaignActor,
} from '../../../shared/campaignPolicy/policy.js';
import { PageOwnerTypes } from '../../../shared/campaignPolicy/pageOwnership.js';
import { logCampaignActivity } from '../lib/campaignActivity.js';
import {
  applyWikiPageTemporalData,
  buildTemporalActor,
  extractTemporalFromBody,
  rejectTemporalError,
  resolveTemporalFromRequest,
  validateTemporalEnvelope,
} from '../lib/temporalWikiWrite.js';
import { TemporalMetadataError } from '../lib/temporalProvenance.js';
import { logWikiPageActivity } from '../lib/wikiPageActivity.js';
import {
  CoreDomainEvents,
  dispatchDomainEvent,
  toNotebookArcEventDto,
  toWikiPageDeletedDto,
  toWikiPageEventDto,
} from '../lib/domainEvents/index.js';
import {
  InterceptorPhases,
  InterceptorRejectedError,
  runDataInterceptors,
} from '../lib/pluginRuntime/index.js';
import { applyWikiContentDecorators } from '../lib/plugins/wikiContentDecorators.js';
import { parseMarkdownFrontMatter } from '../lib/markdownFrontMatter.js';
import { buildCreatePageImportPrefill } from '../lib/createPageMarkdownImport.js';
import {
  assertDocumentFile,
  UploadValidationError,
} from '../lib/uploadValidation.js';
import {
  WIKI_PARENT_CHAIN_DEPTH,
  formatWikiParentChainForApi,
  isInvalidWikiParent,
  wikiParentChainArgs,
} from '../lib/wikiHierarchy.js';
import {
  syncWikiPageTags,
  wikiPageVisibilityFilter,
  wikiTagSelect,
  type WikiTagInput,
} from '../lib/wikiTags.js';
import { formatTagsForApiEnriched } from '../lib/tagIconEnrich.js';
import {
  releaseTagIconAsset,
} from '../lib/tagIconAssets.js';
import {
  assertTagIconUploadMeta,
  sanitizeTagIconSvg,
} from '../lib/tagIconSvg.js';
import {
  parseTagIconAssetId,
  parseTagIconValue,
} from '../lib/tagIconValidation.js';
import {
  buildCategoryLocationTrails,
  graphFromWikiPageRows,
} from '../lib/wikiCategoryLocationTrail.js';
import {
  collectDescendantIds,
  executeOrphanDelete,
  executeRecursiveDelete,
  getWikiDeletePreview,
  WikiDeletionError,
  type WikiDeleteMode,
} from '../lib/wikiDeletion.js';
import {
  compilePlayerSummarySections,
  compileSessionNotesForCampaign,
  SessionCompileError,
} from '../lib/sessionNotesCompile.js';
import {
  getSessionNoteAuthorId,
  isLegacyStandaloneSessionNote,
  parseSessionNoteMetadata,
} from '../lib/sessionNoteMetadata.js';
import { extractWikiLinkTargetIdsFromBlocks } from '../lib/wikiLinkExtract.js';
import {
  getContentPresenceStateBySubEntityMap,
  getContentPresenceStateMap,
} from '../lib/contentPresenceService.js';
import {
  buildPageDiscoveryMap,
  buildPageDiscoveryProjectionMap,
  isPageAvailableFromProjection,
  isPageVisibleToParty,
  projectBrowseDiscoverySummary,
} from '../lib/discoveryProjectionService.js';
import {
  buildPageNarrativeStatusProjectionMap,
  ensurePageNarrativeStatusOnCreate,
  getPageNarrativeStatus,
  projectStoredPageNarrativeStatus,
  resolveEffectivePageNarrativeStatus,
} from '../lib/pageNarrativeStatusService.js';
import { buildNarrativeViewerContextFromCampaign } from '../lib/narrativeProjectionContext.js';
import {
  ContentPresenceEntityType,
  ContentRevelationStates,
} from '../../../shared/contentPresence.js';
import {
  buildRevelationViewerContext,
  isPresenceVisibleToContext,
} from '../../../shared/narrativeProjection.js';
import {
  anchorMetadataForTimeline,
  authorMetadataForSession,
  buildCombinedSessionNotes,
  fetchAuthorPagesForSession,
  loadSessionHeaderContext,
  resolveSessionGroupContext,
} from '../lib/sessionNotesCombined.js';
import {
  getAggregatedReferencesForPages,
  getBrokenLinksForPage,
  getWikiBacklinksForPage,
  getWikiOutlinksForPage,
  propagatePageTitleRename,
  rebuildWikiLinksForCampaign,
  syncWikiLinksForSourcePage,
} from '../lib/wikiLinkService.js';
import {
  buildCategoryIndexWhereClause,
  readEntityCategoryFromMetadata,
} from '../lib/wikiCategoryEntityIndex.js';
import { ensureNarrativeThreadsSystemCategoryKey } from '../lib/ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureNarrativeScenesSystemCategoryKey } from '../lib/ensureNarrativeScenesSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from '../lib/ensureQuestsSystemCategoryKey.js';
import { ensureDowntimeSystemCategoryKey } from '../lib/ensureDowntimeSystemCategoryKey.js';
import {
  parseQuestMetadata,
  mergeQuestMetadata,
  sanitizeQuestMetadataForRole,
  clearQuestMetadata,
  hasQuestMetadataPatch,
  readCategoryMetadataField,
  resolveQuestMetadataPatchInput,
  isQuestMetadataPresent,
  type QuestMetadataFields,
} from '../lib/questMetadata.js';
import {
  parseOrganizationMetadata,
  mergeOrganizationMetadata,
  resolveOrganizationMetadataPatchInput,
  buildOrganizationMetadataPatch,
  type OrganizationMetadataFields,
} from '../lib/organizationMetadata.js';
import {
  parseFamilyMetadata,
  mergeFamilyMetadata,
  resolveFamilyMetadataPatchInput,
  type FamilyMetadataFields,
} from '../lib/familyMetadata.js';
import {
  parseBestiaryMetadata,
  mergeBestiaryMetadata,
  resolveBestiaryMetadataPatchInput,
  type BestiaryMetadataFields,
} from '../lib/bestiaryMetadata.js';
import {
  mergeAncestryMetadata,
  parseAncestryMetadata,
  resolveAncestryMetadataPatchInput,
  buildAncestryMetadataPatch,
} from '../lib/ancestryMetadata.js';
import {
  mergeObjectMetadata,
  resolveObjectMetadataPatchInput,
  buildObjectMetadataPatch,
} from '../lib/objectMetadata.js';
import {
  mergeLocationMetadata,
  resolveLocationMetadataPatchInput,
  buildLocationMetadataPatch,
} from '../lib/locationMetadata.js';
import {
  mergeRuleResourceMetadata,
  resolveRuleResourceMetadataPatchInput,
  buildRuleResourceMetadataPatch,
} from '../lib/ruleResourceMetadata.js';
import {
  parseCharacterLineageMetadata,
  mergeCharacterLineageMetadata,
  resolveCharacterLineageMetadataPatchInput,
  type CharacterLineageFields,
} from '../lib/characterLineageMetadata.js';
import {
  parseCharacterMetadata,
  mergeCharacterMetadata,
  reconcileCharacterIndexFromMetadata,
  resolveCharacterMetadataPatchInput,
  type CharacterIdentityFields,
} from '../lib/characterMetadata.js';
import { parseQuestTaskProgress } from '../lib/questTaskProgress.js';
import { batchSessionBacklinksForQuests } from '../lib/questHubBacklinks.js';
import {
  buildQuestHubTreePayload,
  collectVisibleQuestSubtreeRows,
  isDescendantOfQuestsRoot,
  type QuestHubPageRow,
} from '../lib/questHubTree.js';
import {
  parseThreadMetadata,
  parseThreadMetadataWithWarnings,
  mergeThreadMetadata,
  sanitizeThreadMetadataForRole,
  hasThreadMetadataPatch,
  resolveThreadMetadataPatchInput,
  isThreadMetadataPresent,
  type ThreadMetadataFields,
} from '../lib/threadMetadata.js';
import { computeThreadSignalsFromMetadata } from '../lib/threadSignals.js';
import {
  bootstrapThreadPageOnCreate,
  isExplicitThreadCreate,
} from '../lib/bootstrapThreadPageOnCreate.js';
import {
  bootstrapScenePageOnCreate,
  isExplicitSceneCreate,
} from '../lib/bootstrapScenePageOnCreate.js';
import {
  buildThreadHubListPayload,
  collectVisibleThreadSubtreeRows,
  isDescendantOfThreadsRoot,
  type ThreadHubPageRow,
} from '../lib/threadHubTree.js';
import {
  isDescendantOfScenesRoot,
} from '../lib/sceneHubTree.js';
import {
  isSceneMetadataPresent,
  mergeSceneMetadata,
  parseSceneMetadata,
  sanitizeSceneMetadataForRole,
  hasSceneMetadataPatch,
  resolveSceneMetadataPatchInput,
} from '../lib/sceneMetadata.js';
import {
  mergeObjectiveMetadata,
  parseObjectiveMetadata,
  resolveObjectiveMetadataPatchInput,
} from '../lib/objectiveMetadata.js';
import { isObjectiveMetadataPresent } from '../../../shared/objectiveMetadata.js';
import {
  mergeArcMetadata,
  parseArcMetadata,
  resolveArcMetadataPatchInput,
} from '../lib/arcMetadata.js';
import { buildSceneDefaultBlocks, buildObjectiveDefaultBlocks, buildQuestDefaultBlocks } from '../lib/pageTemplates.js';
import {
  createDefaultQuestLifecycle,
  createDefaultSceneLifecycle,
  createDefaultThreadLifecycle,
  filterQuestRowsForViewer,
  filterThreadRowsForViewer,
  getLifecycleStates,
  NarrativeLifecycleTransitionError,
  transitionQuestByPublishedStatus,
  transitionThreadByPublishedStatus,
  transitionSceneByPublishedStatus,
  clearQuestLifecycle,
} from '../lib/narrativeLifecycleService.js';
import {
  DEFAULT_QUEST_LIFECYCLE_STATE,
  NarrativeLifecycleSubjectKinds,
  initialQuestLifecycleFromWikiVisibility,
} from '../../../shared/narrativeLifecycle.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import { projectHubPageBlocks } from '../lib/publishedNarrativeHub.js';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '../../../shared/narrativeLifecycle.js';
import {
  isNarrativeThreadsCategoryPage,
  isQuestsCategoryPage,
  parseSystemCategoryKey,
} from '../lib/wikiSystemCategory.js';
import { buildWikiPageHref } from '../lib/wikiLinkService.js';
import { wikiPageHrefSelect } from '../lib/wikiPageHrefSelect.js';
import {
  assignPathKeyForNewPage,
  loadCampaignWikiPathKeyRows,
  resolveWikiPageByPathKey,
  syncPathKeyForTitleChange,
} from '../lib/wikiPathKeyService.js';
import { segmentToWorkspace } from '../../../shared/campaignWorkspaceRoutes.js';
import type { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import {
  mergeQuestTimeRulesIntoMetadata,
  resolveQuestTimeRulesPatch,
} from '../lib/questTimeSimulationMetadata.js';
import {
  touchQuestsLinkedFromSceneMetadata,
  touchParentQuestFromObjectiveMetadata,
  touchQuestFromStatusChange,
} from '../lib/questTimelineTouchHooks.js';
import {
  computeQuestTimePressureBadges,
  parseQuestTimePayload,
} from '../../../shared/questTimeSimulation.js';

const wikiPageSelect = {
  id: true,
  campaignId: true,
  notebookArcId: true,
  title: true,
  parentId: true,
  visibility: true,
  featuredImageId: true,
  metadata: true,
  blocks: true,
  templateType: true,
  workspace: true,
  pathKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

function canManageNotebooks(actor: CampaignActor): boolean {
  return canManageNotebooksFromActor(actor);
}

const wikiPageDetailSelect = {
  id: true,
  title: true,
  metadata: true,
  parentId: true,
  visibility: true,
  mapAssetId: true,
  blocks: true,
  templateType: true,
  workspace: true,
  pathKey: true,
  ownerType: true,
  ownerUserId: true,
  ownerPartyId: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  parent: wikiParentChainArgs(WIKI_PARENT_CHAIN_DEPTH),
  tags: {
    select: wikiTagSelect,
    orderBy: { label: 'asc' as const },
  },
} as const;

function normalizeBlocksWithStableIds(
  blocks: unknown,
): { blocks: Array<Record<string, unknown>>; changed: boolean } {
  if (!Array.isArray(blocks)) return { blocks: [], changed: false };
  const seen = new Set<string>();
  let changed = false;
  const normalized = blocks.map((block) => {
    const entry =
      block && typeof block === 'object'
        ? ({ ...(block as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const rawId = typeof entry.id === 'string' ? entry.id.trim() : '';
    const nextId = rawId && !seen.has(rawId) ? rawId : randomUUID();
    if (!rawId || rawId !== nextId || seen.has(rawId)) changed = true;
    entry.id = nextId;
    seen.add(nextId);
    return entry;
  });
  return { blocks: normalized, changed };
}

function redactedBlockPlaceholder(
  block: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...block,
    content: {
      redacted: true,
      message: 'This section has not been revealed yet.',
    },
    isPrivate: false,
    visibility: WikiVisibility.PARTY,
  };
}

async function redactBlocksForPresence(
  campaignId: string,
  rows: Array<{ id: string; blocks: unknown }>,
  canManage: boolean,
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const result = new Map<string, Array<Record<string, unknown>>>();
  if (rows.length === 0) return result;

  const normalizedByPage = new Map<
    string,
    Array<Record<string, unknown>>
  >();
  for (const row of rows) {
    normalizedByPage.set(row.id, normalizeBlocksWithStableIds(row.blocks).blocks);
  }

  if (canManage) {
    for (const [pageId, blocks] of normalizedByPage) result.set(pageId, blocks);
    return result;
  }

  const pageState = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.WIKI_PAGE,
    rows.map((row) => row.id),
  );
  const blockRefs: Array<{
    entityType: (typeof ContentPresenceEntityType)['WIKI_BLOCK'];
    entityId: string;
    subEntityId: string;
  }> = [];
  for (const row of rows) {
    const blocks = normalizedByPage.get(row.id) ?? [];
    for (const block of blocks) {
      if (typeof block.id !== 'string') continue;
      blockRefs.push({
        entityType: ContentPresenceEntityType.WIKI_BLOCK,
        entityId: row.id,
        subEntityId: block.id,
      });
    }
  }
  const blockState = await getContentPresenceStateBySubEntityMap(
    campaignId,
    blockRefs,
  );

  const revelationCtx = buildRevelationViewerContext({ role: null, canManage });
  for (const row of rows) {
    const base = normalizedByPage.get(row.id) ?? [];
    const state =
      pageState.get(row.id) ?? ContentRevelationStates.REVEALED;
    if (!isPresenceVisibleToContext(state, revelationCtx)) {
      result.set(row.id, []);
      continue;
    }
    result.set(
      row.id,
      base.map((block) => {
        const blockId = typeof block.id === 'string' ? block.id : '';
        const key = `${ContentPresenceEntityType.WIKI_BLOCK}:${row.id}:${blockId}`;
        const blockPresenceState =
          blockState.get(key) ?? ContentRevelationStates.REVEALED;
        if (!isPresenceVisibleToContext(blockPresenceState, revelationCtx)) {
          return redactedBlockPlaceholder(block);
        }
        return block;
      }),
    );
  }

  return result;
}

async function formatWikiPageDetailResponse(
  page: {
    id: string;
    title: string;
    workspace?: string | null;
    pathKey?: string | null;
    metadata: unknown;
    parentId: string | null;
    visibility: string;
    mapAssetId?: string | null;
    blocks: unknown;
    templateType: string;
    createdAt: Date;
    updatedAt: Date;
    tags: {
      id: string;
      name: string;
      label: string;
      icon: string | null;
      color: string | null;
    }[];
    parent?: Parameters<typeof formatWikiParentChainForApi>[0];
  },
  options?: {
    canManage?: boolean;
    campaignId?: string;
    role?: string | null;
    actor?: CampaignActor;
    ownership?: {
      ownerType: string;
      ownerUserId?: string | null;
      ownerPartyId?: string | null;
      createdByUserId?: string | null;
    };
  },
) {
  const { parent, ...rest } = page;
  const canManage = options?.canManage ?? false;
  const editPayload =
    options?.actor && options?.ownership
      ? resolvePageEditBlock(options.actor, {
          ownerType: options.ownership.ownerType as import('../../../shared/campaignPolicy/pageOwnership.js').PageOwnerType,
          ownerUserId: options.ownership.ownerUserId,
          ownerPartyId: options.ownership.ownerPartyId,
        })
      : { canEdit: canManage };
  let metadata = rest.metadata;
  if (isQuestMetadataPresent(rest.metadata)) {
    const parsed = parseQuestMetadata(rest.metadata);
    const sanitized = sanitizeQuestMetadataForRole(
      parsed,
      options?.actor ? hasElevatedNarrativeView(options.actor) : canManage,
    );
    metadata = mergeQuestMetadata(rest.metadata, sanitized);
  }
  if (isSceneMetadataPresent(rest.metadata)) {
    const parsed = parseSceneMetadata(rest.metadata);
    const sanitized = sanitizeSceneMetadataForRole(parsed, canManage);
    metadata = mergeSceneMetadata(rest.metadata, sanitized);
  }
  const normalizedBlocks = normalizeBlocksWithStableIds(rest.blocks);
  let responseBlocks = normalizedBlocks.blocks;

  if (!canManage && options?.campaignId) {
    const pagePresence = await getContentPresenceStateMap(
      options.campaignId,
      ContentPresenceEntityType.WIKI_PAGE,
      [rest.id],
    );
    const pageState =
      pagePresence.get(rest.id) ?? ContentRevelationStates.REVEALED;
    const revelationCtx = buildRevelationViewerContext({
      role: options?.role ?? null,
      canManage: false,
    });
    if (!isPresenceVisibleToContext(pageState, revelationCtx)) {
      responseBlocks = [];
    } else if (responseBlocks.length > 0) {
      const blockRefs = responseBlocks.map((block) => ({
        entityType: ContentPresenceEntityType.WIKI_BLOCK,
        entityId: rest.id,
        subEntityId:
          typeof block.id === 'string' ? block.id : null,
      }));
      const blockPresence = await getContentPresenceStateBySubEntityMap(
        options.campaignId,
        blockRefs,
      );
      responseBlocks = responseBlocks.map((block) => {
        const blockId = typeof block.id === 'string' ? block.id : '';
        const state =
          blockPresence.get(
            `${ContentPresenceEntityType.WIKI_BLOCK}:${rest.id}:${blockId}`,
          ) ?? ContentRevelationStates.REVEALED;
        if (!isPresenceVisibleToContext(state, revelationCtx)) {
          return redactedBlockPlaceholder(block);
        }
        return block;
      });
    }
  }

  const formatted = {
    id: rest.id,
    title: rest.title,
    workspace: rest.workspace ?? null,
    pathKey: rest.pathKey ?? null,
    parentId: rest.parentId,
    visibility: rest.visibility,
    mapAssetId: rest.mapAssetId ?? null,
    metadata,
    blocks: responseBlocks,
    templateType: rest.templateType,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    parent: formatWikiParentChainForApi(parent),
    tags: await formatTagsForApiEnriched(rest.tags),
  };

  if (options?.campaignId) {
    const viewerCtx = await buildNarrativeViewerContextFromCampaign(
      options.campaignId,
      (options.role as import('../types/domain.js').CampaignMemberRole | null) ??
        null,
    );
    const stored = await getPageNarrativeStatus(options.campaignId, rest.id);
    const effective = resolveEffectivePageNarrativeStatus({
      stored,
      templateType: rest.templateType,
      metadata,
    });
    const withNarrativeStatus = {
      ...formatted,
      narrativeStatus: projectStoredPageNarrativeStatus(
        stored,
        viewerCtx,
        effective,
      ),
      canEdit: editPayload.canEdit,
      ...(editPayload.editBlock ? { editBlock: editPayload.editBlock } : {}),
      ...(options.ownership
        ? {
            ownership: {
              type: options.ownership.ownerType,
              ownerUserId: options.ownership.ownerUserId ?? null,
              ownerPartyId: options.ownership.ownerPartyId ?? null,
              createdByUserId: options.ownership.createdByUserId ?? null,
            },
          }
        : {}),
    };
    return applyWikiContentDecorators(withNarrativeStatus, {
      campaignId: options.campaignId,
      role: options.role ?? null,
    });
  }

  return {
    ...formatted,
    canEdit: editPayload.canEdit,
    ...(editPayload.editBlock ? { editBlock: editPayload.editBlock } : {}),
  };
}

function parseTagColorValue(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'string') {
    return { ok: false, error: 'color must be a string or null' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (!/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(trimmed)) {
    return { ok: false, error: 'color must be a hex value like #abc or #aabbcc' };
  }
  return { ok: true, value: trimmed };
}

function canModifySessionNote(
  role: string | null,
  userId: string | null | undefined,
  metadata: unknown,
): boolean {
  if (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  ) {
    return true;
  }
  if (!userId) return false;
  return getSessionNoteAuthorId(metadata) === userId;
}

function extractSessionNoteMarkdown(blocks: unknown): string {
  const rawBlocks: any[] = Array.isArray(blocks) ? (blocks as any[]) : [];
  const textBlock =
    rawBlocks.find((block) => block?.id === 'session-note-body') ??
    rawBlocks.find((block) => block?.type === 'text-tiptap');
  const markdown =
    typeof textBlock?.content?.markdown === 'string'
      ? textBlock.content.markdown
      : '';
  return markdown.trim();
}

function compareSessionNoteTitles(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function sortSessionNotePages<T extends { title: string }>(pages: T[]): T[] {
  return [...pages].sort((a, b) => compareSessionNoteTitles(a.title, b.title));
}

async function expandSessionNoteDeleteIds(
  campaignId: string,
  pageIds: string[],
): Promise<string[]> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: pageIds } },
    select: { id: true, metadata: true },
  });

  const expanded = new Set(pageIds);
  for (const page of pages) {
    const meta = parseSessionNoteMetadata(page.metadata);
    if (!meta.isSessionAnchor) continue;

    const groupCtx = await resolveSessionGroupContext(campaignId, {
      pageId: page.id,
    });
    if (!groupCtx) continue;

    const authorPages = await fetchAuthorPagesForSession(
      campaignId,
      groupCtx.sessionGroupId,
      groupCtx.timelinePointId,
    );
    for (const authorPage of authorPages) {
      expanded.add(authorPage.id);
    }
  }

  return [...expanded];
}

async function runWikiDataInterceptors(
  res: Response,
  input: Parameters<typeof runDataInterceptors>[0],
): Promise<Record<string, unknown> | null> {
  try {
    return await runDataInterceptors(input);
  } catch (err) {
    if (err instanceof InterceptorRejectedError) {
      res.status(422).json({ error: err.message });
      return null;
    }
    throw err;
  }
}

export async function getWikiTree(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;

  await ensureQuickAccessCategoryTitle(ctx.campaignId);
  await ensureRemoveLegacyDashboardWikiPage(ctx.campaignId);
  await ensureNarrativeThreadsSystemCategoryKey(ctx.campaignId);
  await ensureDowntimeSystemCategoryKey(ctx.campaignId);

  const [campaign, pages, members] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: {
        id: true,
        name: true,
        handle: true,
        updatedAt: true,
        sidebarConfig: true,
        themePreset: true,
        appearanceProfile: true,
        allowPlayerChronologyManagement: true,
        campaignIntegrations: true,
      },
    }),
    prisma.wikiPage.findMany({
      where: { campaignId: ctx.campaignId, deletedAt: null },
      select: wikiPageSelect,
    }),
    prisma.campaignMember.findMany({
      where: {
        campaignId: ctx.campaignId,
        role: CampaignMemberRoles.PARTICIPANT,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        identityPage: {
          select: { id: true, title: true, visibility: true },
        },
      },
      orderBy: { user: { email: 'asc' } },
    }),
  ]);

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  let sidebarConfig = normalizeSidebarConfig(campaign.sidebarConfig);
  if (isSidebarConfigBlank(campaign.sidebarConfig)) {
    sidebarConfig = normalizeSidebarConfig(null);
    await prisma.campaign.update({
      where: { id: ctx.campaignId },
      data: { sidebarConfig: toInputJsonValue(sidebarConfig) },
    });
  }

  sidebarConfig = await enrichSidebarConfigWithIconUrls(sidebarConfig);

  const tree = buildWikiTree(pages, ctx.role);

  const lastWikiUpdate = pages.reduce<Date | null>((latest, page) => {
    if (!latest || page.updatedAt > latest) return page.updatedAt;
    return latest;
  }, null);

  res.json({
    tree,
    campaign: {
      id: campaign.id,
      slug: campaign.handle,
      name: campaign.name,
      updatedAt: (lastWikiUpdate ?? campaign.updatedAt).toISOString(),
      role: ctx.role,
      isMember: ctx.isMember,
      isCampaignOwner: ctx.isCampaignOwner,
      campaignOwnerUserId: ctx.campaignOwnerUserId,
      sidebarConfig: sidebarConfig,
      themePreset: campaign.themePreset ?? 'dark',
      appearanceProfile: serializeAppearanceProfileForApi(
        resolveCampaignAppearanceProfile(campaign),
      ),
      allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
      campaignIntegrations: parseCampaignIntegrations(campaign.campaignIntegrations),
    },
    players: members.map((m, index) => {
      const identity = mapMemberToIdentityFields(m, index);
      return {
        id: m.userId,
        label: identity.label,
        playerContext: identity.playerContext,
        displayName: identity.displayName,
        identityPageId: identity.identityPageId,
        role: m.role,
      };
    }),
    playerSessionNotesFolderTitle: PLAYER_SESSION_NOTES_TITLE,
  });
}

export async function previewCreatePageMarkdownImport(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;

  if (!policyCan(ctx.actor, CampaignCapabilities.PAGE_CREATE)) {
    res.status(403).json({ error: 'Forbidden: cannot create pages' });
    return;
  }

  const { markdown, categoryTitle, filename } = req.body as {
    markdown?: string;
    categoryTitle?: string;
    filename?: string;
  };

  if (typeof markdown !== 'string' || !markdown.trim()) {
    res.status(400).json({ error: 'markdown is required' });
    return;
  }

  if (typeof categoryTitle !== 'string' || !categoryTitle.trim()) {
    res.status(400).json({ error: 'categoryTitle is required' });
    return;
  }

  try {
    const result = buildCreatePageImportPrefill(markdown, categoryTitle.trim(), {
      filename: typeof filename === 'string' ? filename : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to parse markdown import',
    });
  }
}

export async function createWikiPage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const { temporal, rest } = extractTemporalFromBody(req.body);
  const {
    id: requestedId,
    title,
    parentId,
    metadata,
    blocks,
    templateType,
    tags,
    visibility,
    initialThreadLifecycle,
  } = rest as {
    id?: string;
    title?: string;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
    blocks?: Array<Record<string, unknown>>;
    templateType?: string;
    tags?: WikiTagInput[];
    visibility?: string;
    initialThreadLifecycle?: string;
  };

  let resolvedTemporal;
  try {
    resolvedTemporal = resolveTemporalFromRequest(req, temporal);
    if (!validateTemporalEnvelope(res, temporal, resolvedTemporal)) return;
  } catch (err) {
    rejectTemporalError(res, err);
    return;
  }
  const temporalActor = buildTemporalActor(req);
  const temporalProvenance = resolvedTemporal?.provenance ?? 'user';
  const temporalAuthority = resolvedTemporal?.authority;
  let temporalEventAt: Date | undefined;

  if (!title?.trim()) {
    res.status(400).json({ error: 'Page title is required' });
    return;
  }

  if (!policyCan(ctx.actor, CampaignCapabilities.PAGE_CREATE)) {
    res.status(403).json({ error: 'Forbidden: cannot create pages' });
    return;
  }

  const resolvedParentId =
    typeof parentId === 'string' && parentId.trim() ? parentId.trim() : null;

  const lorePageId =
    typeof requestedId === 'string' && requestedId.trim() ? requestedId.trim() : null;
  if (lorePageId && !/^event-[a-zA-Z0-9_-]+$/.test(lorePageId)) {
    res.status(400).json({ error: 'Invalid event lore page id.' });
    return;
  }
  if (lorePageId) {
    const existingLorePage = await prisma.wikiPage.findFirst({
      where: { id: lorePageId, campaignId: ctx.campaignId },
      select: { id: true },
    });
    if (existingLorePage) {
      res.status(409).json({ error: 'Event lore page already exists.' });
      return;
    }
  }

  let parent: { id: string; title: string } | null = null;
  if (resolvedParentId) {
    parent = await prisma.wikiPage.findFirst({
      where: {
        id: resolvedParentId,
        campaignId: ctx.campaignId,
      },
      select: { id: true, title: true },
    });

    if (!parent) {
      res.status(404).json({
        error: 'Parent page not found in this campaign',
      });
      return;
    }
  }

  const initialNormalized = normalizeWikiPageTemplateFields({
    templateType: templateType ?? 'DEFAULT',
    metadata: metadata ?? {},
  });
  const resolvedTemplate = initialNormalized.templateType;
  let resolvedBlocks: Array<Record<string, unknown>> | null =
    Array.isArray(blocks) && blocks.length > 0 ? blocks : null;

  if (!resolvedBlocks) {
    if (lorePageId) {
      const eventDescription = await loadCalendarEventDescriptionForLorePage(
        ctx.campaignId,
        lorePageId,
      );
      resolvedBlocks = buildEventLoreBlocks(eventDescription) as any;
    } else {
      resolvedBlocks = buildDefaultBlocks(
        resolvedTemplate,
        readEntityCategoryFromMetadata(initialNormalized.metadata),
      ) as any;
    }
  }
  const normalizedCreateBlocks = normalizeBlocksWithStableIds(resolvedBlocks);
  resolvedBlocks = normalizedCreateBlocks.blocks;

  const sessionNoteAuthorId = req.user?.id ? { sessionNoteAuthorId: req.user.id } : {};
  const baseMetadata =
    resolvedTemplate === 'SESSION_NOTE'
      ? ({ ...initialNormalized.metadata, ...sessionNoteAuthorId } as Record<string, unknown>)
      : initialNormalized.metadata;

  const intercepted = await runWikiDataInterceptors(res, {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_CREATE,
    campaignId: ctx.campaignId,
    payload: {
      title: title.trim(),
      parentId: resolvedParentId,
      visibility:
        visibility === 'Public' ||
        visibility === 'Party' ||
        visibility === 'DM_Only'
          ? visibility
          : WikiVisibility.PARTY,
      templateType: resolvedTemplate,
      metadata: baseMetadata,
    },
  });
  if (!intercepted) return;

  const interceptedTitle =
    typeof intercepted.title === 'string' && intercepted.title.trim()
      ? intercepted.title.trim()
      : title.trim();
  const interceptedVisibility =
    intercepted.visibility === 'Public' ||
    intercepted.visibility === 'Party' ||
    intercepted.visibility === 'DM_Only'
      ? intercepted.visibility
      : WikiVisibility.PARTY;
  let interceptedTemplateType =
    typeof intercepted.templateType === 'string' && intercepted.templateType.trim()
      ? intercepted.templateType.trim()
      : resolvedTemplate;
  let interceptedMetadata =
    intercepted.metadata && typeof intercepted.metadata === 'object' && !Array.isArray(intercepted.metadata)
      ? (intercepted.metadata as Record<string, unknown>)
      : baseMetadata;

  let threadCreateInitialLifecycle: NarrativeLifecycleState | null = null;
  let sceneCreateInitialLifecycle: NarrativeLifecycleState | null = null;
  if (isExplicitThreadCreate(interceptedMetadata)) {
    const boot = bootstrapThreadPageOnCreate({
      metadata: interceptedMetadata,
      initialThreadLifecycle,
      blocks: resolvedBlocks,
    });
    if (!boot.ok) {
      res.status(boot.status).json({ error: boot.error });
      return;
    }
    interceptedMetadata = boot.metadata;
    resolvedBlocks = boot.blocks;
    threadCreateInitialLifecycle = boot.initialLifecycle;
  }

  if (isExplicitSceneCreate(interceptedMetadata)) {
    const boot = bootstrapScenePageOnCreate({
      metadata: interceptedMetadata,
      initialSceneLifecycle: (intercepted as Record<string, unknown>).initialSceneLifecycle,
      blocks: resolvedBlocks,
    });
    if (!boot.ok) {
      res.status(boot.status).json({ error: boot.error });
      return;
    }
    interceptedMetadata = boot.metadata;
    resolvedBlocks = boot.blocks;
    sceneCreateInitialLifecycle = boot.initialLifecycle;
    interceptedTemplateType = 'SCENE';
  }

  if (
    interceptedTemplateType === 'OBJECTIVE' ||
    isObjectiveMetadataPresent(interceptedMetadata)
  ) {
    interceptedTemplateType = 'OBJECTIVE';
    interceptedMetadata = mergeObjectiveMetadata(interceptedMetadata, {});
    if (!resolvedBlocks) {
      resolvedBlocks = buildObjectiveDefaultBlocks();
    }
  }

  const campaignRow = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: { createdAt: true },
  });

  let temporalPageData: { createdAt?: Date; updatedAt?: Date } = {};
  try {
    const applied = applyWikiPageTemporalData(
      {},
      resolvedTemporal,
      temporalActor,
      { campaignCreatedAt: campaignRow?.createdAt, now: new Date() },
    );
    temporalPageData = applied.data;
    temporalEventAt = applied.data.updatedAt ?? applied.data.createdAt;
  } catch (err) {
    rejectTemporalError(res, err);
    return;
  }

  const persistedTemplate = normalizeWikiPageTemplateFields({
    templateType: interceptedTemplateType,
    metadata: interceptedMetadata,
  });
  interceptedTemplateType = persistedTemplate.templateType;
  interceptedMetadata = persistedTemplate.metadata;

  const existingRows = await loadCampaignWikiPathKeyRows(ctx.campaignId);
  const pathRouting = lorePageId
    ? { workspace: null, pathKey: null }
    : await assignPathKeyForNewPage(
        ctx.campaignId,
        {
          id: 'pending',
          title: interceptedTitle,
          parentId: resolvedParentId,
          templateType: interceptedTemplateType,
          metadata: interceptedMetadata,
        },
        existingRows,
      );

  const ownershipBody = rest as { ownerType?: string | null };
  const ownership = resolveDefaultPageOwnership({
    creatorUserId: req.user!.id,
    creatorRole: ctx.role,
    defaultPartyId: ctx.partyId,
    requestedOwnerType: ownershipBody.ownerType,
    workspace: pathRouting.workspace,
    templateType: interceptedTemplateType,
  });

  const page = await prisma.wikiPage.create({
    data: {
      ...(lorePageId ? { id: lorePageId } : {}),
      campaignId: ctx.campaignId,
      title: interceptedTitle,
      parentId: resolvedParentId,
      visibility: interceptedVisibility,
      metadata: interceptedMetadata as any,
      blocks: resolvedBlocks as any,
      templateType: interceptedTemplateType,
      workspace: pathRouting.workspace,
      pathKey: pathRouting.pathKey,
      ownerType: ownership.ownerType,
      ownerUserId: ownership.ownerUserId,
      ownerPartyId: ownership.ownerPartyId,
      createdByUserId: ownership.createdByUserId,
      ...(temporalPageData.createdAt ? { createdAt: temporalPageData.createdAt } : {}),
      ...(temporalPageData.updatedAt ? { updatedAt: temporalPageData.updatedAt } : {}),
    },
    select: wikiPageSelect,
  });

  await ensurePageNarrativeStatusOnCreate({
    campaignId: ctx.campaignId,
    wikiPageId: page.id,
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId: ctx.campaignId,
    sourcePageId: page.id,
    blocks: resolvedBlocks ?? [],
    actorUserId: req.user?.id,
    emitEvents: true,
    suppressSocialNotifications: true,
    narrativeSource: temporalProvenance,
    narrativeAuthority: temporalAuthority,
    eventAt: temporalEventAt ?? page.updatedAt,
    isInitialCreate: true,
  });

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'CREATE',
      entityId: page.id,
      entityName: page.title,
      parentContext: parent?.title ?? null,
      parentId: resolvedParentId,
      newBlocks: resolvedBlocks,
      previousBlocks: null,
      provenance: temporalProvenance !== 'user' ? temporalProvenance : undefined,
    });
  }

  dispatchDomainEvent({
    type: CoreDomainEvents.WIKI_CREATED,
    campaignId: ctx.campaignId,
    payload: toWikiPageEventDto(page),
  });

  const parentRows = await prisma.wikiPage.findMany({
    where: { campaignId: ctx.campaignId },
    select: { id: true, parentId: true },
  });
  const parentById = new Map(
    parentRows.map((row) => [row.id, { parentId: row.parentId }]),
  );

  const questsRootId = await ensureQuestsSystemCategoryKey(ctx.campaignId);
  if (
    questsRootId &&
    resolvedParentId &&
    (interceptedTemplateType === 'QUEST' ||
      resolvedParentId === questsRootId ||
      isDescendantOfQuestsRoot(resolvedParentId, questsRootId, parentById))
  ) {
    const questMeta = parseQuestMetadata(interceptedMetadata);
    const initialState = initialQuestLifecycleFromWikiVisibility({
      visibility: interceptedVisibility,
      questStatus: questMeta.questStatus,
    });
    await createDefaultQuestLifecycle(ctx.campaignId, page.id, {
      initialState,
      actorUserId: req.user?.id,
    });
    const existingBlocks = Array.isArray(page.blocks) ? (page.blocks as { type?: string }[]) : [];
    if (!existingBlocks.some((block) => block.type === 'entity-quest-properties')) {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { blocks: buildQuestDefaultBlocks() as never },
      });
    }
  }

  const threadsRootId = await ensureNarrativeThreadsSystemCategoryKey(ctx.campaignId);
  if (
    threadsRootId &&
    resolvedParentId &&
    (resolvedParentId === threadsRootId ||
      isDescendantOfThreadsRoot(resolvedParentId, threadsRootId, parentById) ||
      isThreadMetadataPresent(interceptedMetadata))
  ) {
    const lifecycleInitial =
      threadCreateInitialLifecycle ?? DEFAULT_QUEST_LIFECYCLE_STATE;
    await createDefaultThreadLifecycle(ctx.campaignId, page.id, {
      initialState: lifecycleInitial,
      actorUserId: req.user?.id,
    });
    if (!isThreadMetadataPresent(interceptedMetadata)) {
      const merged = mergeThreadMetadata(interceptedMetadata, {});
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { metadata: merged as never },
      });
    }
    const existingBlocks = Array.isArray(page.blocks) ? (page.blocks as { type?: string }[]) : [];
    if (!existingBlocks.some((block) => block.type === 'entity-thread-properties')) {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { blocks: buildThreadDefaultBlocks() as never },
      });
    }
    const { syncEntityRelationsForWikiPage } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await syncEntityRelationsForWikiPage(prisma, ctx.campaignId, page.id);
  }

  const scenesRootId = await ensureNarrativeScenesSystemCategoryKey(ctx.campaignId);
  if (
    scenesRootId &&
    resolvedParentId &&
    (resolvedParentId === scenesRootId ||
      isDescendantOfScenesRoot(resolvedParentId, scenesRootId, parentById) ||
      isSceneMetadataPresent(interceptedMetadata))
  ) {
    const lifecycleInitial =
      sceneCreateInitialLifecycle ?? DEFAULT_QUEST_LIFECYCLE_STATE;
    await createDefaultSceneLifecycle(ctx.campaignId, page.id, {
      initialState: lifecycleInitial,
      actorUserId: req.user?.id,
    });
    if (!isSceneMetadataPresent(interceptedMetadata)) {
      const merged = mergeSceneMetadata(interceptedMetadata, {});
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { metadata: merged as never, templateType: 'SCENE' },
      });
    } else if (page.templateType !== 'SCENE') {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { templateType: 'SCENE' },
      });
    }
    const existingBlocks = Array.isArray(page.blocks) ? (page.blocks as { type?: string }[]) : [];
    if (!existingBlocks.some((block) => block.type === 'entity-scene-properties')) {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { blocks: buildSceneDefaultBlocks() as never },
      });
    }
    const { syncEntityRelationsForWikiPage } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await syncEntityRelationsForWikiPage(prisma, ctx.campaignId, page.id);
  }

  if (
    interceptedTemplateType === 'OBJECTIVE' ||
    isObjectiveMetadataPresent(interceptedMetadata)
  ) {
    if (page.templateType !== 'OBJECTIVE') {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { templateType: 'OBJECTIVE' },
      });
    }
    const existingBlocks = Array.isArray(page.blocks) ? (page.blocks as { type?: string }[]) : [];
    if (!existingBlocks.some((block) => block.type === 'entity-objective-properties')) {
      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { blocks: buildObjectiveDefaultBlocks() as never },
      });
    }
    const { syncEntityRelationsForWikiPage } = await import(
      '../lib/entityRelationSyncService.js'
    );
    await syncEntityRelationsForWikiPage(prisma, ctx.campaignId, page.id);
  }

  if (Array.isArray(tags) && tags.length > 0) {
    try {
      await syncWikiPageTags(page.id, ctx.campaignId, tags);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid tags',
      });
      return;
    }
  }

  const responsePage =
    Array.isArray(tags) && tags.length > 0
      ? await prisma.wikiPage.findFirst({
          where: { id: page.id, campaignId: ctx.campaignId },
          select: wikiPageSelect,
        })
      : page;

  res.status(201).json({ page: responsePage ?? page });
}

export async function getWikiPageByWorkspacePath(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const segment = String(req.params.workspaceSegment);
  const pathKey = String(req.params.pathKey);
  const workspace = segmentToWorkspace(segment);

  if (!workspace) {
    res.status(404).json({ error: 'Unknown workspace' });
    return;
  }

  const page = await resolveWikiPageByPathKey(
    ctx.campaignId,
    workspace as CampaignWorkspace,
    pathKey,
  );

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  req.params.pageId = page.id;
  return getWikiPage(req, res);
}

export async function getWikiPage(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null },
    select: wikiPageDetailSelect,
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (!canViewWikiPage(page.visibility, ctx.role)) {
    res.status(403).json({ error: 'Forbidden: page not visible to your role' });
    return;
  }

  let responsePage = page;
  if (isEventLorePageId(pageId)) {
    const eventDescription = await loadCalendarEventDescriptionForLorePage(
      ctx.campaignId,
      pageId,
    );
    responsePage = {
      ...page,
      blocks: hydrateEventLoreBlocks(page.blocks, eventDescription) as typeof page.blocks,
    };
  }

  res.json(
    await formatWikiPageDetailResponse(responsePage, {
      canManage: canManageNotebooks(ctx.actor),
      campaignId: ctx.campaignId,
      role: ctx.role,
      actor: ctx.actor,
      ownership: {
        ownerType: page.ownerType,
        ownerUserId: page.ownerUserId,
        ownerPartyId: page.ownerPartyId,
        createdByUserId: page.createdByUserId,
      },
    }),
  );
}

export async function updateWikiPage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { parentId, title, tags } = req.body as {
    parentId?: string | null;
    title?: string;
    tags?: WikiTagInput[];
  };

  if (
    parentId === undefined &&
    title === undefined &&
    tags === undefined
  ) {
    res.status(400).json({
      error: 'parentId, title, or tags is required',
    });
    return;
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    res.status(400).json({ error: 'tags must be an array' });
    return;
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ error: 'title must be a non-empty string' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      workspace: true,
      pathKey: true,
      ownerType: true,
      ownerUserId: true,
      ownerPartyId: true,
    },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (
    !canEditPage(ctx.actor, {
      ownerType: page.ownerType as import('../../../shared/campaignPolicy/pageOwnership.js').PageOwnerType,
      ownerUserId: page.ownerUserId,
      ownerPartyId: page.ownerPartyId,
    })
  ) {
    res.status(403).json({ error: 'Forbidden: cannot edit this page' });
    return;
  }

  const previousTitle = page.title;

  let resolvedParentId: string | null | undefined;
  if (parentId !== undefined) {
    resolvedParentId =
      typeof parentId === 'string' && parentId.trim() ? parentId.trim() : null;

    if (
      await isInvalidWikiParent(ctx.campaignId, page.id, resolvedParentId)
    ) {
      res.status(400).json({
        error:
          'Cannot set parent: would create an invalid or circular hierarchy',
      });
      return;
    }

    try {
      await validateWikiParentModuleScope(
        ctx.campaignId,
        page.id,
        resolvedParentId ?? null,
      );
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : 'Parent must stay within the same module',
      });
      return;
    }
  }

  const nextTitle = title !== undefined ? title.trim() : undefined;
  let nextPathKey: string | null | undefined;

  if (
    nextTitle !== undefined &&
    nextTitle !== previousTitle &&
    page.workspace
  ) {
    nextPathKey = await syncPathKeyForTitleChange(
      ctx.campaignId,
      page.id,
      nextTitle,
      page.workspace as CampaignWorkspace,
      page.pathKey,
    );
  }

  if (nextTitle !== undefined || parentId !== undefined || nextPathKey !== undefined) {
    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(parentId !== undefined
          ? { parentId: resolvedParentId ?? null }
          : {}),
        ...(nextPathKey !== undefined ? { pathKey: nextPathKey } : {}),
      },
    });
  }

  if (
    nextTitle !== undefined &&
    nextTitle !== previousTitle
  ) {
    await propagatePageTitleRename({
      campaignId: ctx.campaignId,
      pageId: page.id,
      oldTitle: previousTitle,
      newTitle: nextTitle,
    });
  }

  if (tags !== undefined) {
    try {
      await syncWikiPageTags(page.id, ctx.campaignId, tags);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid tags',
      });
      return;
    }
  }

  const updatedPage = await prisma.wikiPage.findFirstOrThrow({
    where: { id: page.id },
    select: wikiPageDetailSelect,
  });

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'UPDATE',
      entityId: updatedPage.id,
      entityName: updatedPage.title,
      parentId: updatedPage.parentId,
    });
  }

  res.json(
    await formatWikiPageDetailResponse(updatedPage, {
      canManage: canManageNotebooks(ctx.actor),
      campaignId: ctx.campaignId,
      role: ctx.role,
    }),
  );
}

export async function transformWikiPage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { targetModule } = req.body as { targetModule?: string };

  if (typeof targetModule !== 'string' || !targetModule.trim()) {
    res.status(400).json({ error: 'targetModule is required' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: {
      id: true,
      ownerType: true,
      ownerUserId: true,
      ownerPartyId: true,
    },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (
    !canEditPage(ctx.actor, {
      ownerType: page.ownerType as import('../../../shared/campaignPolicy/pageOwnership.js').PageOwnerType,
      ownerUserId: page.ownerUserId,
      ownerPartyId: page.ownerPartyId,
    })
  ) {
    res.status(403).json({ error: 'Forbidden: cannot edit this page' });
    return;
  }

  try {
    const result = await transformWikiPageInCampaign({
      campaignId: ctx.campaignId,
      pageId,
      targetModuleKey: targetModule.trim(),
      actorUserId: req.user?.id,
      actorRole: ctx.role,
      partyId: ctx.partyId,
    });

    if (req.user?.id) {
      logWikiPageActivity({
        campaignId: ctx.campaignId,
        userId: req.user.id,
        actionType: 'UPDATE',
        entityId: pageId,
        entityName: 'Transform page module',
      });
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to transform page',
    });
  }
}

export async function listCampaignWikiTags(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;

  const tags = await prisma.tag.findMany({
    where: { campaignId: ctx.campaignId },
    select: wikiTagSelect,
    orderBy: { label: 'asc' },
  });

  res.json({ tags: await formatTagsForApiEnriched(tags) });
}

export async function getTagsHub(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);
  const pageVisibilityWhere = wikiPageVisibilityFilter(
    hasElevatedNarrativeView(ctx.actor),
  );
  const requestedTagId =
    typeof req.query.tagId === 'string' && req.query.tagId.trim()
      ? req.query.tagId.trim()
      : undefined;

  const allTags = await prisma.tag.findMany({
    where: { campaignId: ctx.campaignId },
    select: {
      ...wikiTagSelect,
      pages: {
        where: pageVisibilityWhere,
        select: { id: true },
      },
    },
    orderBy: { label: 'asc' },
  });

  const enrichedTags = await formatTagsForApiEnriched(
    allTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      label: tag.label,
      icon: tag.icon,
      color: tag.color,
    })),
  );
  const tags = enrichedTags.map((tag, index) => ({
    ...tag,
    pageCount: allTags[index]!.pages.length,
  }));

  let selectedTagId: string | null = null;
  if (requestedTagId && tags.some((tag) => tag.id === requestedTagId)) {
    selectedTagId = requestedTagId;
  } else {
    selectedTagId = tags.find((tag) => tag.pageCount > 0)?.id ?? null;
  }

  let pages: Array<{
    id: string;
    title: string;
    visibility: string;
    updatedAt: string;
    snippet: string;
  }> = [];

  if (selectedTagId) {
    const taggedPages = await prisma.wikiPage.findMany({
      where: {
        campaignId: ctx.campaignId,
        tags: { some: { id: selectedTagId } },
        ...(pageVisibilityWhere ?? {}),
      },
      select: {
        id: true,
        title: true,
        visibility: true,
        blocks: true,
        updatedAt: true,
        metadata: true,
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });

    pages = taggedPages.map((page) => {
      const metadata = page.metadata as { description?: string } | null;
      const description =
        typeof metadata?.description === 'string'
          ? metadata.description.trim()
          : '';
      const snippet =
        description || buildContentSnippet(page.blocks as Parameters<typeof buildContentSnippet>[0]);

      return {
        id: page.id,
        title: page.title,
        visibility: page.visibility,
        updatedAt: page.updatedAt.toISOString(),
        snippet,
      };
    });
  }

  res.json({ tags, selectedTagId, pages });
}

export async function patchWikiTag(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const tagId = String(req.params.tagId).trim();
  const body = req.body as {
    label?: string;
    icon?: string | null;
    color?: string | null;
  };

  const existing = await prisma.tag.findFirst({
    where: { id: tagId, campaignId: ctx.campaignId },
    select: { id: true, icon: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  const data: {
    label?: string;
    icon?: string | null;
    color?: string | null;
  } = {};

  if (body.label !== undefined) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) {
      res.status(400).json({ error: 'label cannot be empty' });
      return;
    }
    data.label = label;
  }

  if (body.icon !== undefined) {
    const parsed = parseTagIconValue(body.icon);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (parsed.value?.startsWith('asset:')) {
      const assetId = parseTagIconAssetId(parsed.value);
      const asset = await prisma.asset.findFirst({
        where: {
          id: assetId!,
          campaignId: ctx.campaignId,
          type: AssetTypes.TAG_ICON,
        },
      });
      if (!asset) {
        res.status(400).json({ error: 'Invalid tag icon asset' });
        return;
      }
    }
    data.icon = parsed.value;
  }

  if (body.color !== undefined) {
    const parsedColor = parseTagColorValue(body.color);
    if (!parsedColor.ok) {
      res.status(400).json({ error: parsedColor.error });
      return;
    }
    data.color = parsedColor.value;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const previousIcon = existing.icon;
  const nextIcon =
    data.icon !== undefined ? data.icon : previousIcon;

  if (
    previousIcon &&
    previousIcon !== nextIcon &&
    previousIcon.startsWith('asset:')
  ) {
    await releaseTagIconAsset(ctx.campaignId, previousIcon, tagId);
  }

  const updated = await prisma.tag.update({
    where: { id: tagId },
    data,
    select: wikiTagSelect,
  });

  const [enriched] = await formatTagsForApiEnriched([updated]);
  res.json({ tag: enriched });
}

export async function uploadWikiTagIcon(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const tagId = String(req.params.tagId).trim();
  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: 'SVG file is required' });
    return;
  }

  const existing = await prisma.tag.findFirst({
    where: { id: tagId, campaignId: ctx.campaignId },
    select: { id: true, icon: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  try {
    assertTagIconUploadMeta(
      file.mimetype,
      file.originalname,
      file.size,
    );
    const sanitized = sanitizeTagIconSvg(file.buffer);
    const { ingestSvgBuffer } = await import('../lib/assetIngest.js');
    const ingested = await ingestSvgBuffer({
      campaignId: ctx.campaignId,
      buffer: sanitized,
      type: AssetTypes.TAG_ICON,
      uploadedByUserId: req.user?.id ?? null,
    });
    const asset = ingested.asset;

    const previousIcon = existing.icon;
    const nextIcon = `asset:${asset.id}`;

    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: { icon: nextIcon },
      select: wikiTagSelect,
    });

    if (
      previousIcon &&
      previousIcon !== nextIcon &&
      previousIcon.startsWith('asset:')
    ) {
      await releaseTagIconAsset(ctx.campaignId, previousIcon, tagId);
    }

    const [enriched] = await formatTagsForApiEnriched([updated]);
    res.status(201).json({ tag: enriched, asset });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[wiki] Tag icon upload failed', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Tag icon upload failed',
    });
  }
}

export async function updateWikiPageLayout(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { temporal, rest } = extractTemporalFromBody(req.body);
  const { blocks, templateType } = rest as {
    blocks?: Array<Record<string, unknown>>;
    templateType?: string;
  };

  let resolvedTemporal;
  try {
    resolvedTemporal = resolveTemporalFromRequest(req, temporal);
    if (!validateTemporalEnvelope(res, temporal, resolvedTemporal)) return;
  } catch (err) {
    rejectTemporalError(res, err);
    return;
  }
  const temporalActor = buildTemporalActor(req);
  const temporalProvenance = resolvedTemporal?.provenance ?? 'user';
  const temporalAuthority = resolvedTemporal?.authority;

  if (!Array.isArray(blocks)) {
    res.status(400).json({ error: 'Blocks must be an array' });
    return;
  }

  try {
    validateWikiBlocksAssetReferences(blocks);
  } catch (err) {
    if (respondAssetReferenceValidationError(res, err)) return;
    throw err;
  }

  const normalizedLayoutBlocks = normalizeBlocksWithStableIds(blocks);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: wikiPageSelect,
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const previousBlocks = page.blocks;

  const intercepted = await runWikiDataInterceptors(res, {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_UPDATE,
    campaignId: ctx.campaignId,
    payload: {
      id: page.id,
      title: page.title,
      templateType: templateType ?? page.templateType,
    },
  });
  if (!intercepted) return;

  const nextTemplateType = normalizeWikiPageTemplateFields({
    templateType:
      typeof intercepted.templateType === 'string' && intercepted.templateType.trim()
        ? intercepted.templateType.trim()
        : templateType ?? page.templateType,
    metadata: page.metadata,
  }).templateType;

  const campaignRow = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: { createdAt: true },
  });

  let layoutTemporal: { updatedAt?: Date } = {};
  let temporalEventAt: Date | undefined;
  try {
    const applied = applyWikiPageTemporalData(
      { updatedAt: page.updatedAt },
      resolvedTemporal,
      temporalActor,
      { campaignCreatedAt: campaignRow?.createdAt, now: new Date() },
    );
    layoutTemporal = applied.data;
    temporalEventAt = applied.data.updatedAt;
  } catch (err) {
    rejectTemporalError(res, err);
    return;
  }

  const updatedPage = await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      blocks: normalizedLayoutBlocks.blocks as any,
      templateType: nextTemplateType,
      ...(layoutTemporal.updatedAt ? { updatedAt: layoutTemporal.updatedAt } : {}),
    },
    select: {
      blocks: true,
      templateType: true,
      updatedAt: true,
    },
  });

  await syncWikiLinksForSourcePage(prisma, {
    campaignId: ctx.campaignId,
    sourcePageId: page.id,
    blocks: (updatedPage.blocks as any) ?? [],
    actorUserId: req.user?.id,
    emitEvents: true,
    narrativeSource: temporalProvenance,
    narrativeAuthority: temporalAuthority,
    eventAt: temporalEventAt ?? updatedPage.updatedAt,
  });

  let responseBlocks = updatedPage.blocks;
  let responseTemplateType = updatedPage.templateType;

  if (isEventLorePageId(pageId)) {
    const markdown = await syncEventLoreDescriptionFromBlocks(
      ctx.campaignId,
      pageId,
      normalizedLayoutBlocks.blocks,
    );
    const syncedBlocks = hydrateEventLoreBlocks(
      normalizedLayoutBlocks.blocks,
      markdown ?? '',
    );
    await prisma.wikiPage.update({
      where: { id: page.id },
      data: { blocks: syncedBlocks as any },
    });
    responseBlocks = syncedBlocks as typeof updatedPage.blocks;
  }

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'UPDATE',
      entityId: page.id,
      entityName: page.title,
      parentId: page.parentId,
      newBlocks: responseBlocks,
      previousBlocks,
      provenance: temporalProvenance !== 'user' ? temporalProvenance : undefined,
    });
  }

  dispatchDomainEvent({
    type: CoreDomainEvents.WIKI_UPDATED,
    campaignId: ctx.campaignId,
    payload: toWikiPageEventDto({
      ...page,
      templateType: responseTemplateType,
      updatedAt: updatedPage.updatedAt,
    }),
  });

  res.json({ blocks: responseBlocks, templateType: responseTemplateType });
}

export async function updateWikiPageVisibility(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { visibility } = req.body as { visibility?: string };

  if (
    visibility !== 'Public' &&
    visibility !== 'Party' &&
    visibility !== 'DM_Only'
  ) {
    res.status(400).json({ error: 'Invalid visibility' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true, title: true, parentId: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const intercepted = await runWikiDataInterceptors(res, {
    entity: 'wikiPage',
    phase: InterceptorPhases.BEFORE_UPDATE,
    campaignId: ctx.campaignId,
    payload: {
      id: page.id,
      title: page.title,
      visibility,
    },
  });
  if (!intercepted) return;

  const nextVisibility =
    intercepted.visibility === 'Public' ||
    intercepted.visibility === 'Party' ||
    intercepted.visibility === 'DM_Only'
      ? intercepted.visibility
      : visibility;

  const updated = await prisma.wikiPage.update({
    where: { id: page.id },
    data: { visibility: nextVisibility },
    select: { visibility: true },
  });

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'UPDATE',
      entityId: page.id,
      entityName: page.title,
      parentId: page.parentId,
    });
  }

  const linkedMapObjectCount = await (
    await import('../lib/mapSceneService.js')
  ).countMapObjectsLinkedToWikiPage(ctx.campaignId, page.id);

  res.json({ ...updated, linkedMapObjectCount });
}

async function buildCharacterIndexTitleResolver(
  campaignId: string,
  metadata: unknown,
): Promise<(pageId: string) => string | null> {
  const identity = parseCharacterMetadata(metadata);
  const lineage = parseCharacterLineageMetadata(metadata);
  const linkedIds = new Set<string>();
  if (identity.primaryAffiliationId) linkedIds.add(identity.primaryAffiliationId);
  if (identity.currentLocationId) linkedIds.add(identity.currentLocationId);
  if (lineage.familyId) linkedIds.add(lineage.familyId);
  for (const aff of lineage.orgAffiliations) {
    if (aff.orgId) linkedIds.add(aff.orgId);
  }
  const titleById = new Map<string, string>();
  if (linkedIds.size > 0) {
    const linkedPages = await prisma.wikiPage.findMany({
      where: { campaignId, id: { in: [...linkedIds] } },
      select: { id: true, title: true },
    });
    for (const linked of linkedPages) {
      titleById.set(linked.id, linked.title);
    }
  }
  return (id) => titleById.get(id) ?? null;
}

function isCharacterPageMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  if ('firstName' in raw || 'quickInfo' in raw) return true;
  const category = raw.entityCategory;
  return (
    typeof category === 'string' &&
    normalizeEntityCategoryKey(category) === 'characters'
  );
}

export async function updateWikiPageMetadata(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const body = req.body as Record<string, unknown> & {
    key?: string;
    value?: string;
    clearQuest?: boolean;
  };
  const { key, value, clearQuest } = body;
  const questPatchInput = resolveQuestMetadataPatchInput(body);
  const questTimeRulesPatch = resolveQuestTimeRulesPatch(body);
  const threadPatchInput = resolveThreadMetadataPatchInput(body);
  const scenePatchInput = resolveSceneMetadataPatchInput(body);
  const objectivePatchInput = resolveObjectiveMetadataPatchInput(body);
  const arcPatchInput = resolveArcMetadataPatchInput(body);
  const orgPatchInput = resolveOrganizationMetadataPatchInput(body);
  const familyPatchInput = resolveFamilyMetadataPatchInput(body);
  const bestiaryPatchInput = resolveBestiaryMetadataPatchInput(body);
  const ancestryPatchInput = resolveAncestryMetadataPatchInput(body);
  const objectPatchInput = resolveObjectMetadataPatchInput(body);
  const locationPatchInput = resolveLocationMetadataPatchInput(body);
  const ruleResourcePatchInput = resolveRuleResourceMetadataPatchInput(body);
  const characterPatchInput = resolveCharacterMetadataPatchInput(body);
  const lineagePatchInput = resolveCharacterLineageMetadataPatchInput(body);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true, title: true, parentId: true, metadata: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  try {
    if (characterPatchInput?.appearance) {
      validateAppearanceAssetReferences(characterPatchInput.appearance);
    }
    if (bestiaryPatchInput?.appearance) {
      validateAppearanceAssetReferences(bestiaryPatchInput.appearance);
    }
    if (ancestryPatchInput && 'appearance' in ancestryPatchInput) {
      validateAppearanceAssetReferences(ancestryPatchInput.appearance);
    }
    if (objectPatchInput && 'appearance' in objectPatchInput) {
      validateAppearanceAssetReferences(objectPatchInput.appearance);
    }
  } catch (err) {
    if (respondAssetReferenceValidationError(res, err)) return;
    throw err;
  }

  const canManage = canManageNotebooks(ctx.actor);

  if (clearQuest === true) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const updatedPage = await prisma.wikiPage.update({
      where: { id: page.id },
      data: { metadata: clearQuestMetadata(page.metadata) as never },
      select: { metadata: true },
    });
    await clearQuestLifecycle(ctx.campaignId, page.id);
    const parsed = parseQuestMetadata(updatedPage.metadata);
    res.json({
      metadata: mergeQuestMetadata(
        updatedPage.metadata,
        sanitizeQuestMetadataForRole(parsed, canManage),
      ),
    });
    return;
  }

  let updatedMetadata: any = page.metadata ?? {};

  if (questPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if ('dmRewardsText' in questPatchInput && !canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<QuestMetadataFields> = {};
    if ('questStatus' in questPatchInput) {
      const targetStatus = parseQuestMetadata({
        questStatus: questPatchInput.questStatus,
      }).questStatus;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await transitionQuestByPublishedStatus({
          campaignId: ctx.campaignId,
          questPageId: page.id,
          targetQuestStatus: targetStatus,
          actorUserId,
          canManage,
          entityName: page.title,
        });
        const campaign = await prisma.campaign.findUnique({
          where: { id: ctx.campaignId },
          select: { currentEpochMinute: true },
        });
        await touchQuestFromStatusChange(prisma, {
          campaignId: ctx.campaignId,
          questPageId: page.id,
          targetQuestStatus: targetStatus,
          epochMinute: campaign?.currentEpochMinute ?? 0n,
          actorUserId,
        });
      } catch (err) {
        if (err instanceof NarrativeLifecycleTransitionError) {
          res.status(409).json({
            error: err.message,
            code: err.code,
            fromState: err.fromState,
            toState: err.toState,
            allowedTargets: err.allowedTargets,
          });
          return;
        }
        throw err;
      }
      const refreshed = await prisma.wikiPage.findFirst({
        where: { id: page.id, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      updatedMetadata = refreshed?.metadata ?? page.metadata ?? {};
    }
    if ('boardOrder' in questPatchInput) {
      patch.boardOrder = parseQuestMetadata({
        boardOrder: questPatchInput.boardOrder,
      }).boardOrder;
    }
    if ('questGiverId' in questPatchInput) {
      patch.questGiverId = parseQuestMetadata({
        questGiverId: questPatchInput.questGiverId,
      }).questGiverId;
    }
    if ('factionId' in questPatchInput) {
      patch.factionId = parseQuestMetadata({
        factionId: questPatchInput.factionId,
      }).factionId;
    }
    if ('rewardsText' in questPatchInput) {
      patch.rewardsText = parseQuestMetadata({
        rewardsText: questPatchInput.rewardsText,
      }).rewardsText;
    }
    if ('dmRewardsText' in questPatchInput) {
      patch.dmRewardsText = parseQuestMetadata({
        dmRewardsText: questPatchInput.dmRewardsText,
      }).dmRewardsText;
    }
    if ('questType' in questPatchInput) {
      patch.questType =
        questPatchInput.questType === null
          ? null
          : parseQuestMetadata({ questType: questPatchInput.questType }).questType;
    }
    if ('questDate' in questPatchInput) {
      patch.questDate =
        questPatchInput.questDate === null
          ? null
          : parseQuestMetadata({ questDate: questPatchInput.questDate }).questDate;
    }
    if (Object.keys(patch).length > 0) {
      updatedMetadata = mergeQuestMetadata(updatedMetadata, patch);
    }
  }

  if (questTimeRulesPatch && canManage) {
    updatedMetadata = mergeQuestTimeRulesIntoMetadata(updatedMetadata, questTimeRulesPatch);
  }

  if (threadPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<ThreadMetadataFields> = {};
    if ('threadStatus' in threadPatchInput) {
      const targetStatus = parseThreadMetadata({
        threadStatus: threadPatchInput.threadStatus,
      }).threadStatus;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await transitionThreadByPublishedStatus({
          campaignId: ctx.campaignId,
          threadPageId: page.id,
          targetThreadStatus: targetStatus,
          actorUserId,
          canManage,
          entityName: page.title,
        });
      } catch (err) {
        if (err instanceof NarrativeLifecycleTransitionError) {
          res.status(409).json({
            error: err.message,
            code: err.code,
            fromState: err.fromState,
            toState: err.toState,
            allowedTargets: err.allowedTargets,
          });
          return;
        }
        if (err instanceof Error && err.message.startsWith('THREAD_STATUS_NOT_ALLOWED')) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
      const refreshed = await prisma.wikiPage.findFirst({
        where: { id: page.id, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      updatedMetadata = refreshed?.metadata ?? page.metadata ?? {};
    }
    if ('lastAdvancedSessionId' in threadPatchInput) {
      patch.lastAdvancedSessionId = parseThreadMetadata({
        lastAdvancedSessionId: threadPatchInput.lastAdvancedSessionId,
      }).lastAdvancedSessionId;
    }
    if ('resolvedSessionId' in threadPatchInput) {
      patch.resolvedSessionId = parseThreadMetadata({
        resolvedSessionId: threadPatchInput.resolvedSessionId,
      }).resolvedSessionId;
    }
    if ('threadKind' in threadPatchInput) {
      patch.threadKind = parseThreadMetadata({
        threadKind: threadPatchInput.threadKind,
      }).threadKind;
    }
    if ('narrativeWeight' in threadPatchInput) {
      patch.narrativeWeight = parseThreadMetadata({
        narrativeWeight: threadPatchInput.narrativeWeight,
      }).narrativeWeight;
    }
    if ('relatedPageIds' in threadPatchInput) {
      patch.relatedPageIds = parseThreadMetadata({
        relatedPageIds: threadPatchInput.relatedPageIds,
      }).relatedPageIds;
    }
    if ('introducedSessionId' in threadPatchInput) {
      patch.introducedSessionId = parseThreadMetadata({
        introducedSessionId: threadPatchInput.introducedSessionId,
      }).introducedSessionId;
    }
    if ('payoffPageId' in threadPatchInput) {
      patch.payoffPageId = parseThreadMetadata({
        payoffPageId: threadPatchInput.payoffPageId,
      }).payoffPageId;
    }
    if ('playerSubmitted' in threadPatchInput) {
      patch.playerSubmitted = parseThreadMetadata({
        playerSubmitted: threadPatchInput.playerSubmitted,
      }).playerSubmitted;
    }
    if ('sortOrder' in threadPatchInput) {
      patch.sortOrder = parseThreadMetadata({
        sortOrder: threadPatchInput.sortOrder,
      }).sortOrder;
    }
    if (Object.keys(patch).length > 0) {
      updatedMetadata = mergeThreadMetadata(updatedMetadata, patch);
    }
  }

  if (scenePatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if ('sceneStatus' in scenePatchInput) {
      const targetStatus = parseSceneMetadata({
        sceneStatus: scenePatchInput.sceneStatus,
      }).sceneStatus;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await transitionSceneByPublishedStatus({
          campaignId: ctx.campaignId,
          scenePageId: page.id,
          targetSceneStatus: targetStatus,
          actorUserId,
          canManage,
          entityName: page.title,
        });
      } catch (err) {
        if (err instanceof NarrativeLifecycleTransitionError) {
          res.status(409).json({
            error: err.message,
            code: err.code,
            fromState: err.fromState,
            toState: err.toState,
            allowedTargets: err.allowedTargets,
          });
          return;
        }
        if (err instanceof Error && err.message.startsWith('SCENE_STATUS_NOT_ALLOWED')) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
      const refreshed = await prisma.wikiPage.findFirst({
        where: { id: page.id, campaignId: ctx.campaignId },
        select: { metadata: true },
      });
      updatedMetadata = refreshed?.metadata ?? updatedMetadata;
    } else {
      const patch = parseSceneMetadata(scenePatchInput);
      updatedMetadata = mergeSceneMetadata(updatedMetadata, patch);
    }
  }

  if (objectivePatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch = parseObjectiveMetadata(objectivePatchInput);
    updatedMetadata = mergeObjectiveMetadata(updatedMetadata, patch);
  }

  if (arcPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch = parseArcMetadata(arcPatchInput);
    updatedMetadata = mergeArcMetadata(updatedMetadata, patch);
  }

  if (orgPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch = buildOrganizationMetadataPatch(orgPatchInput);
    const mergedPreview = {
      ...parseOrganizationMetadata(updatedMetadata),
      ...patch,
    };
    if (mergedPreview.parentOrgId === pageId) {
      res.status(400).json({ error: 'An organization cannot be its own parent.' });
      return;
    }
    if (mergedPreview.parentOrgId) {
      const visited = new Set<string>([pageId]);
      let current: string | null = mergedPreview.parentOrgId;
      while (current) {
        if (visited.has(current)) {
          res.status(400).json({ error: 'Organization parent chain would create a cycle.' });
          return;
        }
        visited.add(current);
        const parentRow: { metadata: Prisma.JsonValue } | null =
          await prisma.wikiPage.findFirst({
            where: { campaignId: ctx.campaignId, id: current },
            select: { metadata: true },
          });
        if (!parentRow) break;
        current = parseOrganizationMetadata(parentRow.metadata).parentOrgId;
      }
    }
    const linkedPageIds = [
      mergedPreview.parentOrgId,
      mergedPreview.leaderId,
      mergedPreview.headquartersId,
      ...mergedPreview.strongholdLocationIds,
      ...mergedPreview.influenceRegionIds,
      ...mergedPreview.activeTerritoryIds,
      ...mergedPreview.hiddenEnclaveIds,
      ...mergedPreview.tradeReachRegionIds,
      ...mergedPreview.contestedZoneIds,
    ].filter((id): id is string => Boolean(id));
    const titleById = new Map<string, string>();
    if (linkedPageIds.length > 0) {
      const linkedPages = await prisma.wikiPage.findMany({
        where: { campaignId: ctx.campaignId, id: { in: linkedPageIds } },
        select: { id: true, title: true },
      });
      for (const linked of linkedPages) {
        titleById.set(linked.id, linked.title);
      }
    }
    updatedMetadata = mergeOrganizationMetadata(updatedMetadata, patch, {
      resolvePageTitle: (id) => titleById.get(id) ?? null,
    });
  }

  if (familyPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<FamilyMetadataFields> = {};
    if ('familyType' in familyPatchInput) {
      patch.familyType = parseFamilyMetadata({
        familyType: familyPatchInput.familyType,
      }).familyType;
    }
    if ('status' in familyPatchInput) {
      patch.status = parseFamilyMetadata({ status: familyPatchInput.status }).status;
    }
    if ('headCharacterId' in familyPatchInput) {
      patch.headCharacterId = parseFamilyMetadata({
        headCharacterId: familyPatchInput.headCharacterId,
      }).headCharacterId;
    }
    if ('seatLocationId' in familyPatchInput) {
      patch.seatLocationId = parseFamilyMetadata({
        seatLocationId: familyPatchInput.seatLocationId,
      }).seatLocationId;
    }
    if ('region' in familyPatchInput) {
      patch.region = parseFamilyMetadata({ region: familyPatchInput.region }).region;
    }
    if ('coatOfArms' in familyPatchInput) {
      patch.coatOfArms = parseFamilyMetadata({
        coatOfArms: familyPatchInput.coatOfArms,
      }).coatOfArms;
    }
    if ('inheritedTraits' in familyPatchInput) {
      patch.inheritedTraits = parseFamilyMetadata({
        inheritedTraits: familyPatchInput.inheritedTraits,
      }).inheritedTraits;
    }
    if ('houseBranch' in familyPatchInput) {
      patch.houseBranch = parseFamilyMetadata({
        houseBranch: familyPatchInput.houseBranch,
      }).houseBranch;
    }
    updatedMetadata = mergeFamilyMetadata(updatedMetadata, patch);
  }

  if (bestiaryPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<BestiaryMetadataFields> = {};
    if ('creatureType' in bestiaryPatchInput) {
      patch.creatureType = parseBestiaryMetadata({
        creatureType: bestiaryPatchInput.creatureType,
      }).creatureType;
    }
    if ('habitat' in bestiaryPatchInput) {
      patch.habitat = parseBestiaryMetadata({ habitat: bestiaryPatchInput.habitat }).habitat;
    }
    if ('threatLevel' in bestiaryPatchInput) {
      patch.threatLevel = parseBestiaryMetadata({
        threatLevel: bestiaryPatchInput.threatLevel,
      }).threatLevel;
    }
    if ('region' in bestiaryPatchInput) {
      patch.region = parseBestiaryMetadata({ region: bestiaryPatchInput.region }).region;
    }
    if ('intelligence' in bestiaryPatchInput) {
      patch.intelligence = parseBestiaryMetadata({
        intelligence: bestiaryPatchInput.intelligence,
      }).intelligence;
    }
    if ('knownFor' in bestiaryPatchInput) {
      patch.knownFor = parseBestiaryMetadata({
        knownFor: bestiaryPatchInput.knownFor,
      }).knownFor;
    }
    if ('behaviorSummary' in bestiaryPatchInput) {
      patch.behaviorSummary = parseBestiaryMetadata({
        behaviorSummary: bestiaryPatchInput.behaviorSummary,
      }).behaviorSummary;
    }
    if ('appearance' in bestiaryPatchInput) {
      patch.appearance = parseBestiaryMetadata({
        appearance: bestiaryPatchInput.appearance,
      }).appearance;
    }
    if ('relatedCreatureIds' in bestiaryPatchInput) {
      patch.relatedCreatureIds = parseBestiaryMetadata({
        relatedCreatureIds: bestiaryPatchInput.relatedCreatureIds,
      }).relatedCreatureIds;
    }
    if ('relatedLocationIds' in bestiaryPatchInput) {
      patch.relatedLocationIds = parseBestiaryMetadata({
        relatedLocationIds: bestiaryPatchInput.relatedLocationIds,
      }).relatedLocationIds;
    }
    updatedMetadata = mergeBestiaryMetadata(updatedMetadata, patch);
  }

  if (ancestryPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch = buildAncestryMetadataPatch(ancestryPatchInput);
    const mergedPreview = {
      ...parseAncestryMetadata(updatedMetadata),
      ...patch,
    };
    if (mergedPreview.parentAncestryId === pageId) {
      res.status(400).json({ error: 'An ancestry page cannot be its own parent.' });
      return;
    }
    if (mergedPreview.parentAncestryId) {
      const visited = new Set<string>([pageId]);
      let current: string | null = mergedPreview.parentAncestryId;
      while (current) {
        if (visited.has(current)) {
          res.status(400).json({ error: 'Ancestry parent chain would create a cycle.' });
          return;
        }
        visited.add(current);
        const parentRow: { metadata: Prisma.JsonValue } | null =
          await prisma.wikiPage.findFirst({
            where: { campaignId: ctx.campaignId, id: current },
            select: { metadata: true },
          });
        if (!parentRow) break;
        current = parseAncestryMetadata(parentRow.metadata).parentAncestryId;
      }
    }
    const linkedPageIds = [
      mergedPreview.parentAncestryId,
      mergedPreview.secondaryParentAncestryId,
      ...mergedPreview.homelandRegionIds,
      ...mergedPreview.communityRegionIds,
      ...mergedPreview.diasporaRegionIds,
      ...mergedPreview.languageIds,
      ...mergedPreview.relatedOrganizationIds,
    ].filter((id): id is string => Boolean(id));
    const titleById = new Map<string, string>();
    if (linkedPageIds.length > 0) {
      const linkedPages = await prisma.wikiPage.findMany({
        where: { campaignId: ctx.campaignId, id: { in: linkedPageIds } },
        select: { id: true, title: true },
      });
      for (const linked of linkedPages) {
        titleById.set(linked.id, linked.title);
      }
    }
    updatedMetadata = mergeAncestryMetadata(updatedMetadata, patch, {
      resolvePageTitle: (id) => titleById.get(id) ?? null,
    });
  }

  if (objectPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch = buildObjectMetadataPatch(objectPatchInput);
    const holderId = patch.currentHolderId;
    let resolvePageTitle: ((id: string) => string | null) | undefined;
    if (holderId) {
      const linked = await prisma.wikiPage.findFirst({
        where: { campaignId: ctx.campaignId, id: holderId },
        select: { title: true },
      });
      if (linked) {
        resolvePageTitle = () => linked.title;
      }
    }
    updatedMetadata = mergeObjectMetadata(updatedMetadata, patch, { resolvePageTitle });
  }

  if (locationPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    updatedMetadata = mergeLocationMetadata(
      updatedMetadata,
      buildLocationMetadataPatch(locationPatchInput),
    );
  }

  if (ruleResourcePatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    updatedMetadata = mergeRuleResourceMetadata(
      updatedMetadata,
      buildRuleResourceMetadataPatch(ruleResourcePatchInput),
    );
  }

  if (characterPatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<CharacterIdentityFields> = {};
    if ('profession' in characterPatchInput) {
      patch.profession = parseCharacterMetadata({
        profession: characterPatchInput.profession,
      }).profession;
    }
    if ('title' in characterPatchInput) {
      patch.title = parseCharacterMetadata({ title: characterPatchInput.title }).title;
    }
    if ('primaryAffiliationId' in characterPatchInput) {
      patch.primaryAffiliationId = parseCharacterMetadata({
        primaryAffiliationId: characterPatchInput.primaryAffiliationId,
      }).primaryAffiliationId;
    }
    if ('ancestry' in characterPatchInput) {
      patch.ancestry = parseCharacterMetadata({
        ancestry: characterPatchInput.ancestry,
      }).ancestry;
    }
    if ('ancestryId' in characterPatchInput) {
      patch.ancestryId = parseCharacterMetadata({
        ancestryId: characterPatchInput.ancestryId,
      }).ancestryId;
    }
    if ('lineageId' in characterPatchInput) {
      patch.lineageId = parseCharacterMetadata({
        lineageId: characterPatchInput.lineageId,
      }).lineageId;
    }
    if ('currentLocationId' in characterPatchInput) {
      patch.currentLocationId = parseCharacterMetadata({
        currentLocationId: characterPatchInput.currentLocationId,
      }).currentLocationId;
    }
    if ('status' in characterPatchInput) {
      patch.status = parseCharacterMetadata({ status: characterPatchInput.status }).status;
    }
    if ('gender' in characterPatchInput) {
      const genderValue = characterPatchInput.gender;
      patch.appearance = {
        ...(patch.appearance ?? {}),
        gender:
          typeof genderValue === 'string' ? genderValue.trim() || null : null,
      } as Partial<CharacterIdentityFields['appearance']> as CharacterIdentityFields['appearance'];
    }
    if ('pronouns' in characterPatchInput) {
      const pronounsValue = characterPatchInput.pronouns;
      patch.appearance = {
        ...(patch.appearance ?? {}),
        pronouns:
          typeof pronounsValue === 'string' ? pronounsValue.trim() || null : null,
      } as Partial<CharacterIdentityFields['appearance']> as CharacterIdentityFields['appearance'];
    }
    if ('knownFor' in characterPatchInput) {
      patch.knownFor = parseCharacterMetadata({
        knownFor: characterPatchInput.knownFor,
      }).knownFor;
    }
    if ('activeArc' in characterPatchInput) {
      patch.activeArc = parseCharacterMetadata({
        activeArc: characterPatchInput.activeArc,
      }).activeArc;
    }
    if ('motivation' in characterPatchInput) {
      patch.motivation = parseCharacterMetadata({
        motivation: characterPatchInput.motivation,
      }).motivation;
    }
    if ('partyParticipation' in characterPatchInput) {
      patch.partyParticipation = parseCharacterMetadata({
        partyParticipation: characterPatchInput.partyParticipation,
      }).partyParticipation;
    }
    if ('appearance' in characterPatchInput) {
      const appearanceInput = characterPatchInput.appearance;
      if (
        appearanceInput &&
        typeof appearanceInput === 'object' &&
        !Array.isArray(appearanceInput)
      ) {
        patch.appearance = {
          ...(patch.appearance ?? {}),
          ...(appearanceInput as Partial<CharacterIdentityFields['appearance']>),
        } as CharacterIdentityFields['appearance'];
      }
    }
    const resolvePageTitle = await buildCharacterIndexTitleResolver(
      ctx.campaignId,
      updatedMetadata,
    );
    updatedMetadata = mergeCharacterMetadata(updatedMetadata, patch, {
      resolvePageTitle,
    });
  }

  if (lineagePatchInput) {
    if (!canManage) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const patch: Partial<CharacterLineageFields> = {};
    if ('familyId' in lineagePatchInput) {
      patch.familyId = parseCharacterLineageMetadata({
        familyId: lineagePatchInput.familyId,
      }).familyId;
    }
    if ('parentLinks' in lineagePatchInput) {
      patch.parentLinks = parseCharacterLineageMetadata({
        parentLinks: lineagePatchInput.parentLinks,
      }).parentLinks;
    }
    if ('spouseLinks' in lineagePatchInput) {
      patch.spouseLinks = parseCharacterLineageMetadata({
        spouseLinks: lineagePatchInput.spouseLinks,
      }).spouseLinks;
    }
    if ('birthDate' in lineagePatchInput) {
      patch.birthDate = parseCharacterLineageMetadata({
        birthDate: lineagePatchInput.birthDate,
      }).birthDate;
    }
    if ('deathDate' in lineagePatchInput) {
      patch.deathDate = parseCharacterLineageMetadata({
        deathDate: lineagePatchInput.deathDate,
      }).deathDate;
    }
    if ('successionStart' in lineagePatchInput) {
      patch.successionStart = parseCharacterLineageMetadata({
        successionStart: lineagePatchInput.successionStart,
      }).successionStart;
    }
    if ('successionEnd' in lineagePatchInput) {
      patch.successionEnd = parseCharacterLineageMetadata({
        successionEnd: lineagePatchInput.successionEnd,
      }).successionEnd;
    }
    if ('lineageRole' in lineagePatchInput) {
      patch.lineageRole = parseCharacterLineageMetadata({
        lineageRole: lineagePatchInput.lineageRole,
      }).lineageRole;
    }
    if ('houseBranch' in lineagePatchInput) {
      patch.houseBranch = parseCharacterLineageMetadata({
        houseBranch: lineagePatchInput.houseBranch,
      }).houseBranch;
    }
    if ('bloodlineStatus' in lineagePatchInput) {
      patch.bloodlineStatus = parseCharacterLineageMetadata({
        bloodlineStatus: lineagePatchInput.bloodlineStatus,
      }).bloodlineStatus;
    }
    if ('legitimacy' in lineagePatchInput) {
      patch.legitimacy = parseCharacterLineageMetadata({
        legitimacy: lineagePatchInput.legitimacy,
      }).legitimacy;
    }
    if ('orgAffiliations' in lineagePatchInput) {
      patch.orgAffiliations = parseCharacterLineageMetadata({
        orgAffiliations: lineagePatchInput.orgAffiliations,
      }).orgAffiliations;
    }
    updatedMetadata = mergeCharacterLineageMetadata(updatedMetadata, patch);
    if (isCharacterPageMetadata(updatedMetadata)) {
      const resolvePageTitle = await buildCharacterIndexTitleResolver(
        ctx.campaignId,
        updatedMetadata,
      );
      updatedMetadata = reconcileCharacterIndexFromMetadata(
        updatedMetadata as Record<string, unknown>,
        { resolvePageTitle },
      );
    }
  }

  // If updating a single field (key-value pair), handle it appropriately
  if (
    !questPatchInput &&
    !orgPatchInput &&
    !familyPatchInput &&
    !bestiaryPatchInput &&
    !ancestryPatchInput &&
    !objectPatchInput &&
    !locationPatchInput &&
    !ruleResourcePatchInput &&
    !characterPatchInput &&
    !lineagePatchInput &&
    typeof key === 'string'
  ) {
    const pageMetadata = page.metadata as Record<string, unknown> | null;
    
    // Check if this is old-style CategoryMetadata (with 'fields' array)
    if (pageMetadata && 'fields' in pageMetadata && Array.isArray(pageMetadata.fields)) {
      const existingFields = pageMetadata.fields as Array<{ key: string; value: string }>;
      const nextFields = existingFields.filter((field) => field.key !== key);
      nextFields.push({ key, value: value ?? '' });
      updatedMetadata = { fields: nextFields };
    } else if (pageMetadata && 'quickInfo' in pageMetadata) {
      // New-style CharacterMetadata with quickInfo
      const quickInfo = pageMetadata.quickInfo as Array<{ key: string; value: string }> | undefined ?? [];
      const nextFields = quickInfo.filter((field) => field.key !== key);
      nextFields.push({ key, value: value ?? '' });
      updatedMetadata = { ...pageMetadata, quickInfo: nextFields };
    } else {
      // Default: assume old-style CategoryMetadata
      const existingFields = (pageMetadata as Record<string, unknown>)?.fields ?? [];
      const nextFields = Array.isArray(existingFields)
        ? existingFields.filter((f: any) => f.key !== key)
        : [];
      nextFields.push({ key, value: value ?? '' });
      updatedMetadata = { fields: nextFields };
    }
  }

  const updatedPage = await prisma.wikiPage.update({
    where: { id: page.id },
    data: { metadata: updatedMetadata as any },
    select: { metadata: true, parentId: true },
  });

  const campaignEpoch = (
    await prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    })
  )?.currentEpochMinute ?? 0n;

  if (scenePatchInput) {
    await touchQuestsLinkedFromSceneMetadata(prisma, {
      campaignId: ctx.campaignId,
      metadata: updatedPage.metadata,
      epochMinute: campaignEpoch,
      actorUserId: req.user?.id ?? null,
    });
  }

  if (objectivePatchInput) {
    await touchParentQuestFromObjectiveMetadata(prisma, {
      campaignId: ctx.campaignId,
      objectivePageId: page.id,
      parentId: updatedPage.parentId,
      metadata: updatedPage.metadata,
      epochMinute: campaignEpoch,
      actorUserId: req.user?.id ?? null,
    });
  }

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'UPDATE',
      entityId: page.id,
      entityName: page.title,
      parentId: page.parentId,
      newBlocks: undefined,
    });
  }

  const parsed = parseQuestMetadata(updatedPage.metadata);
  const threadParse = parseThreadMetadataWithWarnings(updatedPage.metadata);
  res.json({
    metadata: isQuestMetadataPresent(updatedPage.metadata)
      ? mergeQuestMetadata(
          updatedPage.metadata,
          sanitizeQuestMetadataForRole(parsed, canManage),
        )
      : isThreadMetadataPresent(updatedPage.metadata)
        ? mergeThreadMetadata(updatedPage.metadata, threadParse.fields)
        : updatedPage.metadata,
    ...(canManage && threadParse.warnings.length > 0
      ? { metadataWarnings: threadParse.warnings }
      : {}),
  });
}

export async function getCategoryIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const categoryPageId = String(req.params.pageId);
  const canManage = canManageNotebooks(ctx.actor);
  const visibilityWhere = wikiPageVisibilityFilter(
    hasElevatedNarrativeView(ctx.actor),
  );

  const category = await prisma.wikiPage.findFirst({
    where: { id: categoryPageId, campaignId: ctx.campaignId },
    select: wikiPageSelect,
  });

  if (!category) {
    res.status(404).json({ error: 'Category page not found' });
    return;
  }

  const children = await prisma.wikiPage.findMany({
    where: {
      campaignId: ctx.campaignId,
      id: { not: categoryPageId },
      ...buildCategoryIndexWhereClause(category.title, categoryPageId),
      ...(visibilityWhere ?? {}),
    },
    select: {
      ...wikiPageSelect,
    },
  });

  children.sort((a, b) =>
    compareWikiTitles(a.title, b.title, category.title),
  );

  const graph = graphFromWikiPageRows(
    await prisma.wikiPage.findMany({
      where: { campaignId: ctx.campaignId },
      select: {
        id: true,
        title: true,
        parentId: true,
        templateType: true,
        metadata: true,
      },
    }),
  );
  const locationTrails = buildCategoryLocationTrails(
    children,
    category.id,
    graph,
  );
  const visibleBlocksByPage = await redactBlocksForPresence(
    ctx.campaignId,
    children.map((child) => ({ id: child.id, blocks: child.blocks })),
    canManage,
  );

  const presenceMap = await buildPageDiscoveryMap(
    ctx.campaignId,
    children.map((child) => child.id),
  );
  const discoveryProjectionMap = await buildPageDiscoveryProjectionMap(
    ctx.campaignId,
    children.map((child) => child.id),
    { role: ctx.role ?? null },
  );
  const narrativeStatusMap = await buildPageNarrativeStatusProjectionMap({
    campaignId: ctx.campaignId,
    pageIds: children.map((child) => child.id),
    ctx: await buildNarrativeViewerContextFromCampaign(
      ctx.campaignId,
      ctx.role ?? null,
    ),
    pages: children.map((child) => ({
      id: child.id,
      templateType: child.templateType,
      metadata: child.metadata,
    })),
  });
  const discoverySummary = canManage
    ? projectBrowseDiscoverySummary(children, presenceMap, canManage)
    : {
        discoveredCount: children.filter(
          (child) => discoveryProjectionMap.get(child.id)?.available,
        ).length,
        undiscoveredCount: children.filter(
          (child) => !discoveryProjectionMap.get(child.id)?.available,
        ).length,
        visibleChildCount: children.filter(
          (child) => discoveryProjectionMap.get(child.id)?.available,
        ).length,
      };
  const visibleChildren = canManage
    ? children
    : children.filter((child) =>
        isPageAvailableFromProjection(
          discoveryProjectionMap.get(child.id),
          presenceMap,
          child.id,
          ctx.role ?? null,
        ),
      );

  res.json({
    category: {
      id: category.id,
      title: category.title,
      parentId: category.parentId,
      visibility: category.visibility,
      updatedAt: category.updatedAt.toISOString(),
      isIndexCategory: isCategoryIndexTitle(category.title),
    },
    discoverySummary: canManage
      ? null
      : {
          discoveredCount: discoverySummary.discoveredCount,
          undiscoveredCount: discoverySummary.undiscoveredCount,
        },
    children: visibleChildren.map((child) => {
      const trail = locationTrails.get(child.id);
      const presenceState =
        presenceMap.get(child.id) ?? ContentRevelationStates.REVEALED;
      return {
        id: child.id,
        title: child.title,
        parentId: child.parentId,
        visibility: child.visibility,
        updatedAt: child.updatedAt.toISOString(),
        type: child.templateType,
        entityCategory: readEntityCategoryFromMetadata(child.metadata),
        presenceState: canManage ? presenceState : undefined,
        discovery: discoveryProjectionMap.get(child.id),
        narrativeStatus: narrativeStatusMap.get(child.id),
        snippet: buildContentSnippet(
          (visibleBlocksByPage.get(child.id) ?? []) as unknown as Parameters<
            typeof buildContentSnippet
          >[0],
        ),
        metadata: child.metadata ?? undefined,
        isCrossNested: trail?.isCrossNested ?? false,
        locationAncestors: trail?.locationAncestors ?? [],
        locationTrailLabel: trail?.locationTrailLabel ?? null,
      };
    }),
  });
}

async function buildQuestHubResponse(
  req: CampaignScopedRequest,
  res: Response,
  questsRootId: string,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);
  const previewAsPlayer =
    req.query.previewAsPlayer === 'true' || req.query.previewAsPlayer === '1';
  const effectiveCanManage = canManage && !previewAsPlayer;

  const category = await prisma.wikiPage.findFirst({
    where: { id: questsRootId, campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      updatedAt: true,
    },
  });

  if (!category || !isQuestsCategoryPage(category.metadata)) {
    res.status(404).json({ error: 'Quests category page not found' });
    return;
  }

  const allRows = await prisma.wikiPage.findMany({
    where: { campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      blocks: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const questRows: QuestHubPageRow[] = allRows.map((row) => ({
    id: row.id,
    title: row.title,
    parentId: row.parentId,
    visibility: row.visibility,
    metadata: row.metadata,
    blocks: row.blocks,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  const effectiveViewerCtx =
    viewerCtx && previewAsPlayer && canManage
      ? { ...viewerCtx, perspective: 'party' as const }
      : viewerCtx;
  const visibilityViewer = effectiveViewerCtx ?? ctx.role;

  const visibleRows = collectVisibleQuestSubtreeRows(
    questRows,
    questsRootId,
    visibilityViewer,
  );

  const lifecycleViewerCtx = effectiveViewerCtx;
  const lifecycleMap = await getLifecycleStates(
    ctx.campaignId,
    NarrativeLifecycleSubjectKinds.QUEST,
    visibleRows.map((row) => row.id),
  );
  const lifecycleFilteredRows =
    lifecycleViewerCtx != null
      ? filterQuestRowsForViewer(visibleRows, lifecycleMap, lifecycleViewerCtx)
      : visibleRows;

  const visibleBlocksByPage = await redactBlocksForPresence(
    ctx.campaignId,
    lifecycleFilteredRows.map((row) => ({ id: row.id, blocks: row.blocks })),
    effectiveCanManage,
  );

  const refIds = new Set<string>();
  for (const row of lifecycleFilteredRows) {
    const quest = parseQuestMetadata(row.metadata);
    if (quest.questGiverId) refIds.add(quest.questGiverId);
    if (quest.factionId) refIds.add(quest.factionId);
  }

  const refPages =
    refIds.size > 0
      ? await prisma.wikiPage.findMany({
          where: { campaignId: ctx.campaignId, id: { in: [...refIds] } },
          select: { ...wikiPageHrefSelect, visibility: true },
        })
      : [];

  const refById = new Map(
    refPages
      .filter((page) => isHubPageVisible(page.visibility, visibilityViewer))
      .map((page) => [page.id, page]),
  );

  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const visibleIds = lifecycleFilteredRows.map((row) => row.id);
  const campaignEpoch = (
    await prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    })
  )?.currentEpochMinute ?? 0n;
  const backlinkMap = await batchSessionBacklinksForQuests({
    campaignId: ctx.campaignId,
    campaignHandle,
    targetPageIds: visibleIds,
    role: ctx.role,
  });

  const pagesWithTags =
    visibleIds.length > 0
      ? await prisma.wikiPage.findMany({
          where: {
            campaignId: ctx.campaignId,
            id: { in: visibleIds },
          },
          select: {
            id: true,
            tags: {
              select: wikiTagSelect,
              orderBy: { label: 'asc' as const },
            },
          },
        })
      : [];

  const tagsByPageId = new Map<string, Awaited<ReturnType<typeof formatTagsForApiEnriched>>>();
  for (const page of pagesWithTags) {
    tagsByPageId.set(page.id, await formatTagsForApiEnriched(page.tags));
  }

  const tree = buildQuestHubTreePayload(
    lifecycleFilteredRows,
    questsRootId,
    (row) => {
      const quest = sanitizeQuestMetadataForRole(
        parseQuestMetadata(row.metadata),
        hasElevatedNarrativeView(ctx.actor) && !previewAsPlayer,
      );
      const lifecycleState = lifecycleMap.get(row.id) ?? null;
      const questGiver = quest.questGiverId
        ? refById.get(quest.questGiverId)
        : undefined;
      const faction = quest.factionId ? refById.get(quest.factionId) : undefined;
      const questTime = parseQuestTimePayload(row.metadata);
      const timePressure =
        effectiveCanManage && questTime && lifecycleState
          ? computeQuestTimePressureBadges({
              rules: questTime.rules,
              state: questTime.state,
              lifecycleState,
              currentEpochMinute: campaignEpoch,
            })
          : undefined;

      return {
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        snippet: buildContentSnippet(
          (visibleBlocksByPage.get(row.id) ?? []) as unknown as Parameters<
            typeof buildContentSnippet
          >[0],
        ),
        quest,
        ...(effectiveCanManage && lifecycleState
          ? { lifecycleState }
          : {}),
        location: readCategoryMetadataField(row.metadata, 'Location'),
        progressNote: readCategoryMetadataField(row.metadata, 'Progress'),
        tags: (tagsByPageId.get(row.id) ?? []).map((tag) => ({
          id: tag.id,
          name: tag.name,
          label: tag.label,
          icon: tag.icon,
          color: tag.color,
          iconAssetUrl: tag.iconAssetUrl,
        })),
        progress: parseQuestTaskProgress(visibleBlocksByPage.get(row.id) ?? [], {
          includeDmOnlyBlocks: effectiveCanManage,
        }),
        ...(timePressure?.length ? { timePressure } : {}),
        recentActivity: backlinkMap.get(row.id) ?? [],
        references: {
          questGiver: questGiver
            ? {
                id: questGiver.id,
                title: questGiver.title,
                href: buildWikiPageHref(campaignHandle, questGiver),
              }
            : null,
          faction: faction
            ? {
                id: faction.id,
                title: faction.title,
                href: buildWikiPageHref(campaignHandle, faction),
              }
            : null,
        },
      };
    },
  );

  res.json({
    category: {
      id: category.id,
      title: category.title,
      parentId: category.parentId,
      visibility: category.visibility,
      updatedAt: category.updatedAt.toISOString(),
      systemCategoryKey: parseSystemCategoryKey(category.metadata),
    },
    previewAsPlayer: previewAsPlayer && canManage,
    quests: tree,
  });
}

export async function getQuestHubBySystemKey(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const questsRootId = await ensureQuestsSystemCategoryKey(ctx.campaignId);
  if (!questsRootId) {
    res.status(404).json({ error: 'Quests category page not found' });
    return;
  }
  await buildQuestHubResponse(req, res, questsRootId);
}

export async function getQuestHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  await ensureQuestsSystemCategoryKey(ctx.campaignId);
  await buildQuestHubResponse(req, res, pageId);
}

async function buildThreadHubResponse(
  req: CampaignScopedRequest,
  res: Response,
  threadsRootId: string,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);
  const previewAsPlayer =
    req.query.previewAsPlayer === 'true' || req.query.previewAsPlayer === '1';
  const effectiveCanManage = canManage && !previewAsPlayer;

  const category = await prisma.wikiPage.findFirst({
    where: { id: threadsRootId, campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      updatedAt: true,
    },
  });

  if (!category || !isNarrativeThreadsCategoryPage(category.metadata)) {
    res.status(404).json({ error: 'Narrative threads category page not found' });
    return;
  }

  const allRows = await prisma.wikiPage.findMany({
    where: { campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      blocks: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const threadRows: ThreadHubPageRow[] = allRows.map((row) => ({
    id: row.id,
    title: row.title,
    parentId: row.parentId,
    visibility: row.visibility,
    metadata: row.metadata,
    blocks: row.blocks,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  const effectiveViewerCtx =
    viewerCtx && previewAsPlayer && canManage
      ? { ...viewerCtx, perspective: 'party' as const }
      : viewerCtx;
  const visibilityViewer = effectiveViewerCtx ?? ctx.role;

  const visibleRows = collectVisibleThreadSubtreeRows(
    threadRows,
    threadsRootId,
    visibilityViewer,
  );

  const lifecycleViewerCtx = effectiveViewerCtx;
  const lifecycleMap = await getLifecycleStates(
    ctx.campaignId,
    NarrativeLifecycleSubjectKinds.OPEN_THREAD,
    visibleRows.map((row) => row.id),
  );
  const lifecycleFilteredRows =
    lifecycleViewerCtx != null
      ? filterThreadRowsForViewer(visibleRows, lifecycleMap, lifecycleViewerCtx)
      : visibleRows;

  const visibleBlocksByPage = new Map<string, unknown[]>();
  for (const row of lifecycleFilteredRows) {
    const lifecycleState =
      lifecycleMap.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED;
    const projected =
      lifecycleViewerCtx != null
        ? projectHubPageBlocks({
            subjectKind: 'open_thread',
            blocks: row.blocks,
            metadata: row.metadata,
            visibility: row.visibility,
            lifecycleState,
            viewerContext: lifecycleViewerCtx,
          })
        : (row.blocks as unknown[]);
    const redacted = await redactBlocksForPresence(
      ctx.campaignId,
      [{ id: row.id, blocks: projected }],
      effectiveCanManage,
    );
    visibleBlocksByPage.set(row.id, redacted.get(row.id) ?? []);
  }

  const refIds = new Set<string>();
  for (const row of lifecycleFilteredRows) {
    const thread = parseThreadMetadata(row.metadata);
    for (const id of thread.relatedPageIds) refIds.add(id);
    if (thread.payoffPageId) refIds.add(thread.payoffPageId);
  }

  const refPages =
    refIds.size > 0
      ? await prisma.wikiPage.findMany({
          where: { campaignId: ctx.campaignId, id: { in: [...refIds] } },
          select: { ...wikiPageHrefSelect, visibility: true },
        })
      : [];

  const refById = new Map(
    refPages
      .filter((page) => isHubPageVisible(page.visibility, visibilityViewer))
      .map((page) => [page.id, page]),
  );

  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

  const threads = buildThreadHubListPayload(
    lifecycleFilteredRows,
    threadsRootId,
    (row) => {
      const parsedThread = parseThreadMetadataWithWarnings(row.metadata);
      const thread = sanitizeThreadMetadataForRole(
        parsedThread.fields,
        effectiveCanManage,
      );
      const lifecycleState = lifecycleMap.get(row.id) ?? null;
      const related = thread.relatedPageIds
        .map((id) => refById.get(id))
        .filter((page): page is NonNullable<typeof page> => page != null)
        .map((page) => ({
          id: page.id,
          title: page.title,
          href: buildWikiPageHref(campaignHandle, page),
        }));
      const payoffPage = thread.payoffPageId
        ? refById.get(thread.payoffPageId)
        : undefined;

      return {
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        snippet: buildContentSnippet(
          (visibleBlocksByPage.get(row.id) ?? []) as Parameters<
            typeof buildContentSnippet
          >[0],
        ),
        thread,
        ...(effectiveCanManage && lifecycleState ? { lifecycleState } : {}),
        ...(effectiveCanManage && parsedThread.warnings.length > 0
          ? { metadataWarnings: parsedThread.warnings }
          : {}),
        ...(effectiveCanManage
          ? {
              threadSignals: computeThreadSignalsFromMetadata(
                thread,
                row.updatedAt,
              ),
            }
          : {}),
        references: {
          related,
          payoff: payoffPage
            ? {
                id: payoffPage.id,
                title: payoffPage.title,
                href: buildWikiPageHref(campaignHandle, payoffPage),
              }
            : null,
        },
      };
    },
  );

  res.json({
    category: {
      id: category.id,
      title: category.title,
      parentId: category.parentId,
      visibility: category.visibility,
      updatedAt: category.updatedAt.toISOString(),
      systemCategoryKey: parseSystemCategoryKey(category.metadata),
    },
    previewAsPlayer: previewAsPlayer && canManage,
    threads,
  });
}

export async function getThreadHubBySystemKey(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const threadsRootId = await ensureNarrativeThreadsSystemCategoryKey(ctx.campaignId);
  if (!threadsRootId) {
    res.status(404).json({ error: 'Narrative threads category page not found' });
    return;
  }
  await buildThreadHubResponse(req, res, threadsRootId);
}

export async function getThreadHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  await ensureNarrativeThreadsSystemCategoryKey(ctx.campaignId);
  await buildThreadHubResponse(req, res, pageId);
}

type SessionNotesIndexPageShape = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  visibility: string;
  canEdit: boolean;
  canDelete: boolean;
  timelinePointId?: string;
  sequenceOrder?: number;
  fantasyEpochMinute?: string | null;
};

export async function getSessionNotesIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);
  const userId = req.user?.id;

  const [arcs, timelineRows, legacyPages] = await Promise.all([
    (prisma as any).noteBookArc.findMany({
      where: { campaignId: ctx.campaignId },
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true, displayOrder: true },
    }),
    (prisma as any).campaignSessionTimeline.findMany({
      where: { campaignId: ctx.campaignId },
      orderBy: [{ sequenceOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        authorId: true,
        sequenceOrder: true,
        wikiPage: {
          select: {
            id: true,
            title: true,
            metadata: true,
            blocks: true,
            updatedAt: true,
            visibility: true,
            notebookArcId: true,
          },
        },
      },
    }),
    prisma.wikiPage.findMany({
      where: {
        campaignId: ctx.campaignId,
        OR: [
          { templateType: 'SESSION_NOTE' },
          { notebookArcId: { not: null } },
        ],
        ...(canManage
          ? {}
          : {
              visibility: {
                in: [WikiVisibility.PUBLIC, WikiVisibility.PARTY],
              },
            }),
      },
      select: {
        id: true,
        title: true,
        notebookArcId: true,
        metadata: true,
        blocks: true,
        updatedAt: true,
        visibility: true,
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const pagesByArc = new Map<string, SessionNotesIndexPageShape[]>();
  const uncategorized: SessionNotesIndexPageShape[] = [];

  for (const row of timelineRows as Array<{
    id: string;
    authorId: string;
    sequenceOrder: number;
    wikiPage: {
      id: string;
      title: string;
      metadata: unknown;
      blocks: unknown;
      updatedAt: Date;
      visibility: string;
      notebookArcId: string | null;
    } | null;
  }>) {
    const anchor = row.wikiPage;
    if (!anchor) continue;
    if (
      !canManage &&
      anchor.visibility !== WikiVisibility.PUBLIC &&
      anchor.visibility !== WikiVisibility.PARTY
    ) {
      continue;
    }

    const anchorMeta = parseSessionNoteMetadata(anchor.metadata);
    const sessionGroupId = anchorMeta.sessionGroupId ?? row.id;
    const authorPages = await fetchAuthorPagesForSession(
      ctx.campaignId,
      sessionGroupId,
      row.id,
    );
    const authorBlocks = await redactBlocksForPresence(
      ctx.campaignId,
      authorPages.map((page) => ({ id: page.id, blocks: page.blocks })),
      canManage,
    );

    let latestUpdated = anchor.updatedAt;
    const contentParts: string[] = [];
    for (const authorPage of authorPages) {
      if (authorPage.updatedAt > latestUpdated) {
        latestUpdated = authorPage.updatedAt;
      }
      const markdown = extractSessionNoteMarkdown(
        authorBlocks.get(authorPage.id) ?? [],
      );
      if (markdown) contentParts.push(markdown);
    }

    const canEditSession =
      canManage || (userId != null && row.authorId === userId);
    const shape: SessionNotesIndexPageShape = {
      id: anchor.id,
      title: anchor.title,
      content: contentParts.join('\n\n').trim(),
      updatedAt: latestUpdated.toISOString(),
      visibility: anchor.visibility,
      canEdit: canEditSession,
      canDelete: canManage,
      timelinePointId: row.id,
      sequenceOrder: row.sequenceOrder,
      fantasyEpochMinute: anchorMeta.fantasyEpochMinute ?? null,
    };

    if (anchor.notebookArcId) {
      const bucket = pagesByArc.get(anchor.notebookArcId) ?? [];
      bucket.push(shape);
      pagesByArc.set(anchor.notebookArcId, bucket);
    } else {
      uncategorized.push(shape);
    }
  }

  const legacyBlocks = await redactBlocksForPresence(
    ctx.campaignId,
    legacyPages.map((page) => ({ id: page.id, blocks: page.blocks })),
    canManage,
  );
  for (const page of legacyPages) {
    if (!isLegacyStandaloneSessionNote(page.metadata)) continue;

    const canEditPage = canModifySessionNote(ctx.role, userId, page.metadata);
    const shape: SessionNotesIndexPageShape = {
      id: page.id,
      title: page.title,
      content: extractSessionNoteMarkdown(legacyBlocks.get(page.id) ?? []),
      updatedAt: page.updatedAt.toISOString(),
      visibility: page.visibility,
      canEdit: canEditPage,
      canDelete: canEditPage,
    };
    if (!page.notebookArcId) {
      uncategorized.push(shape);
      continue;
    }
    const bucket = pagesByArc.get(page.notebookArcId) ?? [];
    bucket.push(shape);
    pagesByArc.set(page.notebookArcId, bucket);
  }

  res.json({
    canManage,
    notebooks: (arcs as Array<{ id: string; title: string; displayOrder: number }>).map(
      (arc) => ({
        id: arc.id,
        title: arc.title,
        displayOrder: arc.displayOrder,
        pages: sortSessionNotePages(pagesByArc.get(arc.id) ?? []),
      }),
    ),
    uncategorized: sortSessionNotePages(uncategorized),
  });
}

function buildSessionNoteBlocks(markdown = ''): Array<Record<string, unknown>> {
  return [
    {
      id: 'session-note-body',
      type: 'text-tiptap',
      x: 0,
      y: 0,
      w: 12,
      h: 10,
      isPrivate: false,
      visibility: WikiVisibility.PARTY,
      content: { markdown },
    },
  ];
}

export async function createNewSessionTimeline(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const authorId = req.user?.id;

  if (!authorId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const sessionRoot = await prisma.wikiPage.findFirst({
    where: {
      campaignId: ctx.campaignId,
      title: PLAYER_SESSION_NOTES_TITLE,
    },
    select: { id: true },
  });

  if (!sessionRoot) {
    res.status(404).json({ error: 'Player Session Notes folder not found' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingCount = await (tx as any).campaignSessionTimeline.count({
      where: { campaignId: ctx.campaignId },
    });
    const sequenceOrder = existingCount + 1;
    const title = `Session ${sequenceOrder}`;

    const anchorPage = await tx.wikiPage.create({
      data: {
        campaignId: ctx.campaignId,
        parentId: sessionRoot.id,
        title,
        visibility: WikiVisibility.PARTY,
        templateType: 'SESSION_NOTE',
        metadata: {
          sessionNoteAuthorId: authorId,
          isSessionAnchor: true,
        } as any,
        blocks: buildSessionNoteBlocks() as any,
      },
      select: { id: true, title: true },
    });

    const timelinePoint = await (tx as any).campaignSessionTimeline.create({
      data: {
        campaignId: ctx.campaignId,
        wikiPageId: anchorPage.id,
        authorId,
        sequenceOrder,
      },
      select: { id: true, wikiPageId: true, sequenceOrder: true },
    });

    const campaign = await tx.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    });
    const fantasyEpochMinute = campaign?.currentEpochMinute?.toString() ?? null;

    const anchorMeta = anchorMetadataForTimeline(
      timelinePoint.id,
      authorId,
      fantasyEpochMinute,
    );
    await tx.wikiPage.update({
      where: { id: anchorPage.id },
      data: { metadata: anchorMeta as any },
    });

    const authorTitle = `${title} — Notes`;
    const authorMeta = authorMetadataForSession(
      timelinePoint.id,
      timelinePoint.id,
      authorId,
      fantasyEpochMinute,
    );
    const authorPage = await tx.wikiPage.create({
      data: {
        campaignId: ctx.campaignId,
        parentId: sessionRoot.id,
        title: authorTitle.slice(0, 120),
        visibility: WikiVisibility.PARTY,
        templateType: 'SESSION_NOTE',
        metadata: authorMeta as any,
        blocks: buildSessionNoteBlocks() as any,
      },
      select: { id: true, title: true },
    });

    return { wikiPage: anchorPage, timelinePoint, authorPage };
  });

  res.status(201).json({
    success: true,
    timelinePointId: result.timelinePoint.id,
    wikiPageId: result.wikiPage.id,
    title: result.wikiPage.title,
    sequenceOrder: result.timelinePoint.sequenceOrder,
  });
}

export async function getSessionTimelinePoint(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const timelinePointId = String(req.params.timelinePointId);

  const timelinePoint = await (prisma as any).campaignSessionTimeline.findFirst({
    where: {
      id: timelinePointId,
      campaignId: ctx.campaignId,
    },
    select: {
      id: true,
      wikiPageId: true,
      authorId: true,
      sequenceOrder: true,
      wikiPage: {
        select: {
          id: true,
          title: true,
          visibility: true,
          templateType: true,
          metadata: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!timelinePoint?.wikiPage) {
    res.status(404).json({ error: 'Session timeline point not found' });
    return;
  }

  let page = timelinePoint.wikiPage;
  if (
    page.visibility === WikiVisibility.DM_ONLY &&
    !canManageNotebooks(ctx.actor)
  ) {
    res.status(403).json({ error: 'Forbidden: no access to this session note' });
    return;
  }

  const anchorMeta = parseSessionNoteMetadata(page.metadata);
  if (!anchorMeta.sessionGroupId || !anchorMeta.fantasyEpochMinute) {
    const campaignRow = await prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    });
    const fantasyEpochMinute =
      anchorMeta.fantasyEpochMinute ??
      campaignRow?.currentEpochMinute?.toString() ??
      null;
    const backfill = anchorMetadataForTimeline(
      timelinePoint.id,
      timelinePoint.authorId,
      fantasyEpochMinute,
    );
    await prisma.wikiPage.update({
      where: { id: page.id },
      data: { metadata: backfill as any },
    });
    page = { ...page, metadata: backfill };
  }

  res.json({
    timelinePointId: timelinePoint.id,
    wikiPageId: timelinePoint.wikiPageId,
    sessionGroupId:
      parseSessionNoteMetadata(page.metadata).sessionGroupId ?? timelinePoint.id,
    authorId: timelinePoint.authorId,
    sequenceOrder: timelinePoint.sequenceOrder,
    page: {
      id: page.id,
      title: page.title,
      visibility: page.visibility,
      metadata: page.metadata,
      blocks: page.blocks,
      templateType: page.templateType,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    },
  });
}

export async function createNotebookArc(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const titleRaw = String((req.body as { title?: string }).title ?? '').trim();
  const title = titleRaw.length > 0 ? titleRaw.slice(0, 80) : 'New Arc';

  const max = await (prisma as any).noteBookArc.aggregate({
    where: { campaignId: ctx.campaignId },
    _max: { displayOrder: true },
  });
  const displayOrder = (max?._max?.displayOrder ?? -1) + 1;

  const intercepted = await runWikiDataInterceptors(res, {
    entity: 'notebookArc',
    phase: InterceptorPhases.BEFORE_CREATE,
    campaignId: ctx.campaignId,
    payload: { title, displayOrder },
  });
  if (!intercepted) return;

  const nextTitle =
    typeof intercepted.title === 'string' && intercepted.title.trim()
      ? intercepted.title.trim().slice(0, 80)
      : title;

  const notebook = await (prisma as any).noteBookArc.create({
    data: { campaignId: ctx.campaignId, title: nextTitle, displayOrder },
    select: { id: true, title: true, displayOrder: true },
  });

  dispatchDomainEvent({
    type: CoreDomainEvents.NOTEBOOK_ARC_CREATED,
    campaignId: ctx.campaignId,
    payload: toNotebookArcEventDto({
      ...notebook,
      campaignId: ctx.campaignId,
    }),
  });

  res.status(201).json({ notebook });
}

export async function deleteNotebookArc(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const notebookId = String(req.params.notebookId);
  const notebook = await (prisma as any).noteBookArc.findFirst({
    where: { id: notebookId, campaignId: ctx.campaignId },
    select: { id: true, title: true, displayOrder: true },
  });
  if (!notebook) {
    res.status(404).json({ error: 'Notebook not found' });
    return;
  }

  await prisma.$transaction([
    prisma.wikiPage.updateMany({
      where: { campaignId: ctx.campaignId, notebookArcId: notebook.id },
      data: { notebookArcId: null },
    }),
    (prisma as any).noteBookArc.delete({ where: { id: notebook.id } }),
  ]);

  dispatchDomainEvent({
    type: CoreDomainEvents.NOTEBOOK_ARC_DELETED,
    campaignId: ctx.campaignId,
    payload: toNotebookArcEventDto({
      ...notebook,
      campaignId: ctx.campaignId,
    }),
  });

  res.json({ ok: true });
}

export async function updateNotebookArc(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const notebookId = String(req.params.notebookId);
  const { title } = req.body as { title?: string };
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const notebook = await (prisma as any).noteBookArc.findFirst({
    where: { id: notebookId, campaignId: ctx.campaignId },
    select: { id: true },
  });
  if (!notebook) {
    res.status(404).json({ error: 'Notebook not found' });
    return;
  }

  const updated = await (prisma as any).noteBookArc.update({
    where: { id: notebook.id },
    data: { title: title.trim().slice(0, 80) },
    select: { id: true, title: true, displayOrder: true },
  });

  dispatchDomainEvent({
    type: CoreDomainEvents.NOTEBOOK_ARC_UPDATED,
    campaignId: ctx.campaignId,
    payload: toNotebookArcEventDto({
      ...updated,
      campaignId: ctx.campaignId,
    }),
  });

  res.json({ notebook: updated });
}

export async function assignWikiPageNotebookArc(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const { pageId, notebookArcId } = req.body as {
    pageId?: string;
    notebookArcId?: string | null;
  };

  if (!pageId || typeof pageId !== 'string') {
    res.status(400).json({ error: 'pageId is required' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (notebookArcId !== null && notebookArcId !== undefined) {
    const notebook = await (prisma as any).noteBookArc.findFirst({
      where: { id: notebookArcId, campaignId: ctx.campaignId },
      select: { id: true },
    });
    if (!notebook) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }
  }

  const updated = await prisma.wikiPage.update({
    where: { id: page.id },
    data: { notebookArcId: notebookArcId ?? null },
    select: { id: true, notebookArcId: true },
  });

  res.json({ page: updated });
}

export async function bulkMoveWikiPages(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const { noteIds, destinationBookId } = req.body as {
    noteIds?: string[];
    destinationBookId?: string | null;
  };

  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    res.status(400).json({ error: 'noteIds must be a non-empty string array' });
    return;
  }

  const normalizedIds = noteIds
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());

  if (normalizedIds.length === 0) {
    res.status(400).json({ error: 'noteIds must include at least one valid id' });
    return;
  }

  if (destinationBookId !== null && destinationBookId !== undefined) {
    const notebook = await (prisma as any).noteBookArc.findFirst({
      where: { id: destinationBookId, campaignId: ctx.campaignId },
      select: { id: true },
    });
    if (!notebook) {
      res.status(404).json({ error: 'Destination notebook not found' });
      return;
    }
  }

  const result = await prisma.wikiPage.updateMany({
    where: {
      campaignId: ctx.campaignId,
      id: { in: normalizedIds },
      OR: [{ templateType: 'SESSION_NOTE' }, { notebookArcId: { not: null } }],
    },
    data: { notebookArcId: destinationBookId ?? null },
  });

  res.json({ updatedCount: result.count });
}

export async function bulkDeleteSessionNotes(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooks(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: DM or Co-DM required' });
    return;
  }

  const { noteIds } = req.body as { noteIds?: string[] };

  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    res.status(400).json({ error: 'noteIds must be a non-empty string array' });
    return;
  }

  const normalizedIds = noteIds
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());

  if (normalizedIds.length === 0) {
    res.status(400).json({ error: 'noteIds must include at least one valid id' });
    return;
  }

  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: ctx.campaignId,
      id: { in: normalizedIds },
      OR: [{ templateType: 'SESSION_NOTE' }, { notebookArcId: { not: null } }],
    },
    select: { id: true },
  });

  const deletableIds = await expandSessionNoteDeleteIds(
    ctx.campaignId,
    pages.map((page) => page.id),
  );
  if (deletableIds.length === 0) {
    res.status(404).json({ error: 'No matching session notes found to delete' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await (tx as any).campaignSessionTimeline.deleteMany({
      where: {
        campaignId: ctx.campaignId,
        wikiPageId: { in: deletableIds },
      },
    });
    await tx.wikiPage.deleteMany({
      where: {
        campaignId: ctx.campaignId,
        id: { in: deletableIds },
      },
    });
  });

  if (req.user?.id) {
    logCampaignActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'DELETE',
      entityType: 'WIKI_PAGE',
      entityId: 'bulk',
      entityName: `Deleted ${deletableIds.length} session note(s)`,
    });
  }

  res.json({ deletedCount: deletableIds.length });
}

export async function updateSessionNotePage(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { title, content } = req.body as { title?: string; content?: string };

  if (title === undefined && content === undefined) {
    res.status(400).json({ error: 'title or content is required' });
    return;
  }
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ error: 'title must be a non-empty string' });
    return;
  }
  if (content !== undefined && typeof content !== 'string') {
    res.status(400).json({ error: 'content must be a string' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      metadata: true,
      blocks: true,
      templateType: true,
      notebookArcId: true,
    },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  if (page.templateType !== 'SESSION_NOTE' && !page.notebookArcId) {
    res.status(400).json({ error: 'Only session notes can be edited here' });
    return;
  }
  if (!canModifySessionNote(ctx.role, req.user?.id, page.metadata)) {
    res.status(403).json({ error: 'Forbidden: cannot edit this session note' });
    return;
  }

  const nextBlocks: Array<Record<string, unknown>> =
    content === undefined
      ? ((Array.isArray(page.blocks) ? page.blocks : []) as any)
      : [
          {
            id: 'session-note-body',
            type: 'text-tiptap',
            x: 0,
            y: 0,
            w: 12,
            h: 10,
            isPrivate: false,
            visibility: WikiVisibility.PARTY,
            content: { markdown: content },
          },
        ];

  const updated = await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      ...(title !== undefined ? { title: title.trim().slice(0, 120) } : {}),
      ...(content !== undefined ? { blocks: nextBlocks as any } : {}),
    },
    select: { id: true, title: true, updatedAt: true },
  });

  if (content !== undefined) {
    await syncWikiLinksForSourcePage(prisma, {
      campaignId: ctx.campaignId,
      sourcePageId: page.id,
      blocks: nextBlocks,
      actorUserId: (req as AuthenticatedRequest).user?.id,
      emitEvents: true,
    });
  }

  if (
    title !== undefined &&
    title.trim() !== page.title
  ) {
    await propagatePageTitleRename({
      campaignId: ctx.campaignId,
      pageId: page.id,
      oldTitle: page.title,
      newTitle: title.trim().slice(0, 120),
    });
  }

  const actorId = (req as any).user?.id as string | undefined;
  if (actorId) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: actorId,
      actionType: 'UPDATE',
      entityId: updated.id,
      entityName: updated.title,
      parentId: page.parentId,
      newBlocks: nextBlocks,
      previousBlocks: page.blocks,
    });
  }

  res.json({
    page: {
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function uploadSessionNotePage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'A document file is required' });
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.txt', '.docx', '.md'].includes(ext)) {
    res.status(400).json({
      error:
        'Only .txt, .docx, and .md are allowed. Convert legacy .doc files to .docx before uploading.',
    });
    return;
  }

  try {
    assertDocumentFile(file.buffer, ext);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  let content = '';
  let parsedFrontMatter: ReturnType<typeof parseMarkdownFrontMatter> | null = null;
  if (ext === '.docx') {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    content = parsed.value ?? '';
  } else {
    content = file.buffer.toString('utf8');
    if (ext === '.md') {
      parsedFrontMatter = parseMarkdownFrontMatter(content);
      content = parsedFrontMatter.bodyMarkdown;
    }
  }

  const sessionRoot = await prisma.wikiPage.findFirst({
    where: {
      campaignId: ctx.campaignId,
      title: PLAYER_SESSION_NOTES_TITLE,
    },
    select: { id: true },
  });

  if (!sessionRoot) {
    res.status(404).json({ error: 'Player Session Notes folder not found' });
    return;
  }

  const fallbackTitle = path.basename(file.originalname, ext).trim() || 'Imported Session Note';
  const frontMatterTitle = parsedFrontMatter?.frontMatter.title?.trim();
  const resolvedTitle = frontMatterTitle || fallbackTitle;
  const importMetadata =
    parsedFrontMatter && (
      parsedFrontMatter.frontMatter.tags.length > 0 ||
      Object.keys(parsedFrontMatter.frontMatter.customFields).length > 0 ||
      Boolean(parsedFrontMatter.frontMatter.blurb)
    )
      ? {
          // Reserved platform taxonomy; intentionally separate from customFields.
          tags: parsedFrontMatter.frontMatter.tags,
          ...(parsedFrontMatter.frontMatter.blurb
            ? { blurb: parsedFrontMatter.frontMatter.blurb }
            : {}),
          customFields: parsedFrontMatter.frontMatter.customFields,
        }
      : null;
  const page = await prisma.wikiPage.create({
    data: {
      campaignId: ctx.campaignId,
      parentId: sessionRoot.id,
      title: resolvedTitle.slice(0, 120),
      visibility: WikiVisibility.PARTY,
      templateType: 'SESSION_NOTE',
      metadata:
        req.user?.id || importMetadata
          ? ({
              ...(req.user?.id ? { sessionNoteAuthorId: req.user.id } : {}),
              ...(importMetadata ? { importMetadata } : {}),
            } as any)
          : undefined,
      blocks: [
        {
          id: 'session-note-body',
          type: 'text-tiptap',
          x: 0,
          y: 0,
          w: 12,
          h: 10,
          isPrivate: false,
          visibility: WikiVisibility.PARTY,
          content: { markdown: content.trim() },
        },
      ] as any,
    },
    select: { id: true, title: true, updatedAt: true },
  });

  const noteBlocks = [
    {
      id: 'session-note-body',
      type: 'text-tiptap',
      content: { markdown: content.trim() },
    },
  ];

  if (req.user?.id) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: req.user.id,
      actionType: 'CREATE',
      entityId: page.id,
      entityName: page.title,
      parentContext: PLAYER_SESSION_NOTES_TITLE,
      parentId: sessionRoot.id,
      newBlocks: noteBlocks,
      previousBlocks: null,
    });
  }

  res.status(201).json({
    page: {
      id: page.id,
      title: page.title,
      updatedAt: page.updatedAt.toISOString(),
    },
  });
}

function parseWikiDeleteBody(body: unknown):
  | { ok: true; mode: WikiDeleteMode; confirmPhrase?: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body required' };
  }
  const { mode, confirm, confirmPhrase } = body as {
    mode?: string;
    confirm?: boolean;
    confirmPhrase?: string;
  };
  if (mode !== 'orphan' && mode !== 'recursive') {
    return { ok: false, error: 'mode must be orphan or recursive' };
  }
  if (confirm !== true) {
    return { ok: false, error: 'confirm must be true' };
  }
  return {
    ok: true,
    mode,
    confirmPhrase: typeof confirmPhrase === 'string' ? confirmPhrase : undefined,
  };
}

function handleWikiDeletionError(res: Response, err: unknown): void {
  if (err instanceof WikiDeletionError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...err.details,
    });
    return;
  }
  throw err;
}

export async function getWikiPageDeletePreview(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const preview = await getWikiDeletePreview(ctx.campaignId, pageId);
  if (!preview) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  res.json(preview);
}

export async function deleteWikiPage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const parsed = parseWikiDeleteBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const preview = await getWikiDeletePreview(ctx.campaignId, pageId);
  if (!preview) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  if (
    parsed.mode === 'recursive' &&
    preview.descendantCount > 0 &&
    parsed.confirmPhrase?.trim() !== preview.page.title.trim()
  ) {
    res.status(422).json({
      error: 'confirmPhrase must match the page title for recursive delete',
    });
    return;
  }

  const actorId = req.user?.id;

  try {
    if (parsed.mode === 'orphan') {
      const result = await executeOrphanDelete(ctx.campaignId, pageId, actorId);
      if (!result) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }
      dispatchDomainEvent({
        type: CoreDomainEvents.WIKI_DELETED,
        campaignId: ctx.campaignId,
        payload: toWikiPageDeletedDto({
          id: preview.page.id,
          campaignId: ctx.campaignId,
          title: preview.page.title,
          parentId: preview.page.parentId,
          deletedPageIds: [pageId],
        }),
      });
      res.json({
        ok: true,
        mode: parsed.mode,
        deletedPageIds: [pageId],
        orphanedChildIds: result.orphanedChildIds,
      });
      return;
    }

    const result = await executeRecursiveDelete(ctx.campaignId, pageId, actorId);
    if (!result) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    dispatchDomainEvent({
      type: CoreDomainEvents.WIKI_DELETED,
      campaignId: ctx.campaignId,
      payload: toWikiPageDeletedDto({
        id: preview.page.id,
        campaignId: ctx.campaignId,
        title: preview.page.title,
        parentId: preview.page.parentId,
        deletedPageIds: result.deletedPageIds,
      }),
    });
    res.json({
      ok: true,
      mode: parsed.mode,
      deletedPageIds: result.deletedPageIds,
    });
  } catch (err) {
    handleWikiDeletionError(res, err);
  }
}

export async function deleteSessionNotePage(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      blocks: true,
      metadata: true,
      templateType: true,
      notebookArcId: true,
    },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  if (page.templateType !== 'SESSION_NOTE' && !page.notebookArcId) {
    res.status(400).json({ error: 'Only session notes can be deleted here' });
    return;
  }
  if (!canModifySessionNote(ctx.role, req.user?.id, page.metadata)) {
    res.status(403).json({ error: 'Forbidden: cannot delete this session note' });
    return;
  }

  const descendants = await collectDescendantIds(ctx.campaignId, pageId);
  if (descendants.length > 0) {
    const parsed = parseWikiDeleteBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({
        error: parsed.error,
        descendantCount: descendants.length,
        requiresMode: true,
      });
      return;
    }

    const preview = await getWikiDeletePreview(ctx.campaignId, pageId);
    if (
      parsed.mode === 'recursive' &&
      preview &&
      preview.descendantCount > 0 &&
      parsed.confirmPhrase?.trim() !== preview.page.title.trim()
    ) {
      res.status(422).json({
        error: 'confirmPhrase must match the page title for recursive delete',
      });
      return;
    }

    const actorId = req.user?.id;
    try {
      if (parsed.mode === 'orphan') {
        const result = await executeOrphanDelete(ctx.campaignId, pageId, actorId);
        if (!result) {
          res.status(404).json({ error: 'Page not found' });
          return;
        }
        dispatchDomainEvent({
          type: CoreDomainEvents.WIKI_DELETED,
          campaignId: ctx.campaignId,
          payload: toWikiPageDeletedDto({
            id: page.id,
            campaignId: ctx.campaignId,
            title: page.title,
            parentId: page.parentId,
            deletedPageIds: [pageId],
          }),
        });
        res.json({
          ok: true,
          mode: parsed.mode,
          deletedPageIds: [pageId],
          orphanedChildIds: result.orphanedChildIds,
        });
        return;
      }

      const result = await executeRecursiveDelete(ctx.campaignId, pageId, actorId);
      if (!result) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }
      dispatchDomainEvent({
        type: CoreDomainEvents.WIKI_DELETED,
        campaignId: ctx.campaignId,
        payload: toWikiPageDeletedDto({
          id: page.id,
          campaignId: ctx.campaignId,
          title: page.title,
          parentId: page.parentId,
          deletedPageIds: result.deletedPageIds,
        }),
      });
      res.json({
        ok: true,
        mode: parsed.mode,
        deletedPageIds: result.deletedPageIds,
      });
    } catch (err) {
      handleWikiDeletionError(res, err);
    }
    return;
  }

  const anchorMeta = parseSessionNoteMetadata(page.metadata);
  const idsToDelete = anchorMeta.isSessionAnchor
    ? await expandSessionNoteDeleteIds(ctx.campaignId, [page.id])
    : [page.id];

  const previousBlocks = page.blocks;

  await prisma.$transaction(async (tx) => {
    await (tx as any).campaignSessionTimeline.deleteMany({
      where: {
        campaignId: ctx.campaignId,
        wikiPageId: { in: idsToDelete },
      },
    });
    await tx.wikiPage.deleteMany({
      where: {
        campaignId: ctx.campaignId,
        id: { in: idsToDelete },
      },
    });
  });

  const actorId = req.user?.id;
  if (actorId) {
    logWikiPageActivity({
      campaignId: ctx.campaignId,
      userId: actorId,
      actionType: 'DELETE',
      entityId: page.id,
      entityName: page.title,
      parentId: page.parentId,
      newBlocks: [],
      previousBlocks,
    });
  }

  dispatchDomainEvent({
    type: CoreDomainEvents.WIKI_DELETED,
    campaignId: ctx.campaignId,
    payload: toWikiPageDeletedDto({
      id: page.id,
      campaignId: ctx.campaignId,
      title: page.title,
      parentId: page.parentId,
      deletedPageIds: idsToDelete,
    }),
  });

  res.json({ ok: true });
}

async function loadSessionRosterMembers(campaignId: string) {
  return prisma.campaignMember.findMany({
    where: { campaignId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      identityPage: {
        select: { id: true, title: true, visibility: true },
      },
    },
    orderBy: [{ role: 'asc' }, { user: { email: 'asc' } }],
  });
}

function mapSessionRosterMember(
  member: Awaited<ReturnType<typeof loadSessionRosterMembers>>[number],
  index: number,
) {
  return mapMemberToIdentityFields(member, index);
}

function rosterRolesForPerspectives(role: string): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER ||
    role === CampaignMemberRoles.PARTICIPANT ||
    role === CampaignMemberRoles.PARTICIPANT
  );
}

export async function getSessionNotePerspectives(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const canManage = canManageNotebooks(ctx.actor);

  const groupCtx = await resolveSessionGroupContext(ctx.campaignId, { pageId });
  if (!groupCtx) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const [members, authorPages] = await Promise.all([
    loadSessionRosterMembers(ctx.campaignId),
    fetchAuthorPagesForSession(
      ctx.campaignId,
      groupCtx.sessionGroupId,
      groupCtx.timelinePointId,
    ),
  ]);

  const notesByAuthor = new Map<
    string,
    { pageId: string; markdown: string; hasNotes: boolean; visibility: string }
  >();

  for (const authorPage of authorPages) {
    const authorId = getSessionNoteAuthorId(authorPage.metadata);
    if (!authorId) continue;
    const visibility = authorPage.visibility;
    if (
      visibility === WikiVisibility.DM_ONLY &&
      !canManage
    ) {
      notesByAuthor.set(authorId, {
        pageId: authorPage.id,
        markdown: '',
        hasNotes: false,
        visibility,
      });
      continue;
    }
    const markdown = extractSessionNoteMarkdown(authorPage.blocks);
    notesByAuthor.set(authorId, {
      pageId: authorPage.id,
      markdown,
      hasNotes: markdown.length > 0,
      visibility,
    });
  }

  const rosterMembers = members.filter((m) => rosterRolesForPerspectives(m.role));

  res.json({
    sessionGroupId: groupCtx.sessionGroupId,
    timelinePointId: groupCtx.timelinePointId,
    roster: rosterMembers.map((member, index) => {
      const entry = notesByAuthor.get(member.userId);
      const isDmRole =
        member.role === CampaignMemberRoles.GAMEMASTER ||
        member.role === CampaignMemberRoles.WRITER;
      const masked =
        entry?.visibility === WikiVisibility.DM_ONLY && !canManage;
      const identity = mapSessionRosterMember(member, index);
      return {
        id: member.userId,
        label: identity.label,
        displayName: identity.displayName,
        playerContext: identity.playerContext,
        identityPageId: identity.identityPageId,
        role: member.role,
        isDmRole,
        masked: masked ?? false,
        hasNotes: entry?.hasNotes ?? false,
        pageId: entry?.pageId ?? null,
        markdown: masked ? '' : (entry?.markdown ?? ''),
      };
    }),
  });
}

export async function ensureSessionAuthorNote(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const timelinePointId = String(req.params.timelinePointId);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const groupCtx = await resolveSessionGroupContext(ctx.campaignId, {
    timelinePointId,
  });
  if (!groupCtx) {
    res.status(404).json({ error: 'Session timeline point not found' });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingPages = await fetchAuthorPagesForSession(
      ctx.campaignId,
      groupCtx.sessionGroupId,
      groupCtx.timelinePointId,
      tx,
    );

    const existing = existingPages.find(
      (p) => getSessionNoteAuthorId(p.metadata) === userId,
    );

    if (existing) {
      const page = await tx.wikiPage.findFirst({
        where: { id: existing.id, campaignId: ctx.campaignId },
        select: wikiPageDetailSelect,
      });
      if (!page) {
        return { kind: 'not_found' as const };
      }
      return { kind: 'existing' as const, page };
    }

    const sessionRoot = await tx.wikiPage.findFirst({
      where: {
        campaignId: ctx.campaignId,
        title: PLAYER_SESSION_NOTES_TITLE,
      },
      select: { id: true },
    });

    if (!sessionRoot) {
      return { kind: 'no_root' as const };
    }

    const timelinePoint = await (tx as any).campaignSessionTimeline.findFirst({
      where: { id: timelinePointId, campaignId: ctx.campaignId },
      select: { sequenceOrder: true, wikiPage: { select: { title: true } } },
    });

    const sessionTitle =
      timelinePoint?.wikiPage?.title ??
      `Session ${timelinePoint?.sequenceOrder ?? ''}`;
    const authorTitle = `${sessionTitle} — Notes`;

    const anchorPage = groupCtx.anchorPageId
      ? await tx.wikiPage.findFirst({
          where: { id: groupCtx.anchorPageId, campaignId: ctx.campaignId },
          select: { metadata: true },
        })
      : null;
    const sessionFantasy = parseSessionNoteMetadata(anchorPage?.metadata)
      .fantasyEpochMinute;

    const authorMeta = authorMetadataForSession(
      groupCtx.sessionGroupId,
      groupCtx.timelinePointId ?? timelinePointId,
      userId,
      sessionFantasy ?? null,
    );

    const created = await tx.wikiPage.create({
      data: {
        campaignId: ctx.campaignId,
        parentId: sessionRoot.id,
        title: authorTitle.slice(0, 120),
        visibility: WikiVisibility.PARTY,
        templateType: 'SESSION_NOTE',
        metadata: authorMeta as any,
        blocks: buildSessionNoteBlocks() as any,
      },
      select: wikiPageDetailSelect,
    });

    return { kind: 'created' as const, page: created };
  });

  if (result.kind === 'not_found') {
    res.status(404).json({ error: 'Author page not found' });
    return;
  }
  if (result.kind === 'no_root') {
    res.status(404).json({ error: 'Player Session Notes folder not found' });
    return;
  }
  if (result.kind === 'existing') {
    res.json({
      created: false,
      page: await formatWikiPageDetailResponse(result.page, {
        canManage: canManageNotebooks(ctx.actor),
        campaignId: ctx.campaignId,
        role: ctx.role,
      }),
    });
    return;
  }

  res.status(201).json({
    created: true,
    page: await formatWikiPageDetailResponse(result.page, {
      canManage: canManageNotebooks(ctx.actor),
      campaignId: ctx.campaignId,
      role: ctx.role,
    }),
  });
}

export async function getCombinedSessionNotes(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);

  const timelinePointId =
    typeof req.query.timelinePointId === 'string'
      ? req.query.timelinePointId
      : undefined;
  const sessionGroupId =
    typeof req.query.sessionGroupId === 'string'
      ? req.query.sessionGroupId
      : undefined;
  const pageId =
    typeof req.query.pageId === 'string' ? req.query.pageId : undefined;

  const groupCtx = await resolveSessionGroupContext(ctx.campaignId, {
    timelinePointId,
    sessionGroupId,
    pageId,
  });

  if (!groupCtx) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const campaignRow = await prisma.campaign.findUnique({
    where: { id: ctx.campaignId },
    select: {
      handle: true,
      fantasyCalendars: {
        where: { isMasterTime: true },
        take: 1,
      },
    },
  });
  const primaryCalendar = campaignRow?.fantasyCalendars[0] ?? null;

  const [members, authorPages, sessionHeader] = await Promise.all([
    loadSessionRosterMembers(ctx.campaignId),
    fetchAuthorPagesForSession(
      ctx.campaignId,
      groupCtx.sessionGroupId,
      groupCtx.timelinePointId,
    ),
    loadSessionHeaderContext(
      ctx.campaignId,
      groupCtx,
      primaryCalendar,
    ),
  ]);

  const rosterMembers = members
    .filter((m) => rosterRolesForPerspectives(m.role))
    .map((member, index) => mapSessionRosterMember(member, index));

  const entityIdSet = new Set<string>();
  for (const page of authorPages) {
    if (!canManage && page.visibility === WikiVisibility.DM_ONLY) continue;
    const blocks = Array.isArray(page.blocks)
      ? (page.blocks as Array<Record<string, unknown>>)
      : [];
    for (const id of extractWikiLinkTargetIdsFromBlocks(blocks)) {
      entityIdSet.add(id);
    }
  }

  const titlePages =
    entityIdSet.size > 0
      ? await prisma.wikiPage.findMany({
          where: {
            campaignId: ctx.campaignId,
            id: { in: [...entityIdSet] },
          },
          select: { id: true, title: true },
        })
      : [];

  const pageTitlesById = new Map(titlePages.map((p) => [p.id, p.title] as const));

  const built = buildCombinedSessionNotes({
    session: sessionHeader,
    canManage,
    members: rosterMembers,
    authorPages,
    pageTitlesById,
  });

  const blocksByPageId = new Map<string, Array<Record<string, unknown>>>();
  for (const page of authorPages) {
    if (!built.referenceSourcePageIds.includes(page.id)) continue;
    blocksByPageId.set(
      page.id,
      Array.isArray(page.blocks)
        ? (page.blocks as Array<Record<string, unknown>>)
        : [],
    );
  }

  const references = await getAggregatedReferencesForPages({
    campaignId: ctx.campaignId,
    campaignHandle: campaignRow?.handle ?? ctx.campaignHandle ?? '',
    sourcePageIds: built.referenceSourcePageIds,
    role: ctx.role,
    blocksByPageId,
  });

  res.json({
    ...built,
    references,
  });
}

function parseCompileSessionNotesQuery(
  query: CampaignScopedRequest['query'],
): {
  sessionPageId?: string;
  notebookArcId?: string;
  timelineFrom?: number;
  timelineTo?: number;
  orderBy?: 'timeline' | 'updated';
} {
  const sessionPageId =
    typeof query.sessionPageId === 'string' ? query.sessionPageId : undefined;
  const notebookArcId =
    typeof query.notebookArcId === 'string' ? query.notebookArcId : undefined;
  const orderByRaw =
    typeof query.orderBy === 'string' ? query.orderBy : undefined;
  const orderBy =
    orderByRaw === 'updated' || orderByRaw === 'timeline' ? orderByRaw : undefined;

  const timelineFrom =
    typeof query.timelineFrom === 'string' && query.timelineFrom.trim()
      ? Number.parseInt(query.timelineFrom, 10)
      : undefined;
  const timelineTo =
    typeof query.timelineTo === 'string' && query.timelineTo.trim()
      ? Number.parseInt(query.timelineTo, 10)
      : undefined;

  return {
    sessionPageId,
    notebookArcId,
    timelineFrom: Number.isFinite(timelineFrom) ? timelineFrom : undefined,
    timelineTo: Number.isFinite(timelineTo) ? timelineTo : undefined,
    orderBy,
  };
}

export async function compileSessionNotes(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooks(ctx.actor);

  try {
    const result = await compileSessionNotesForCampaign(
      ctx.campaignId,
      hasElevatedNarrativeView(ctx.actor),
      parseCompileSessionNotesQuery(req.query),
    );
    res.json(result);
  } catch (err) {
    if (err instanceof SessionCompileError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        ...err.details,
      });
      return;
    }
    console.error('compileSessionNotes failed', err);
    res.status(500).json({
      error: 'Compile failed',
      code: 'COMPILE_INTERNAL',
    });
  }
}

export async function getWikiBacklinks(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const backlinks = await getWikiBacklinksForPage({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? ctx.campaignId,
    targetPageId: page.id,
    role: ctx.role,
  });

  res.json({ backlinks, total: backlinks.length });
}

export async function getWikiOutlinks(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true, blocks: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as Array<
    Record<string, unknown>
  >;

  const payload = await getWikiOutlinksForPage({
    campaignId: ctx.campaignId,
    campaignHandle: ctx.campaignHandle ?? ctx.campaignId,
    sourcePageId: page.id,
    role: ctx.role,
    blocks,
  });

  res.json(payload);
}

export async function getWikiLinkIntegrity(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId },
    select: { id: true, blocks: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as Array<
    Record<string, unknown>
  >;
  const integrity = await getBrokenLinksForPage({
    campaignId: ctx.campaignId,
    pageId: page.id,
    blocks,
  });

  res.json(integrity);
}

export async function getPlayerSessionSummary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const userId = String(req.params.playerId);

  const member = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId, campaignId: ctx.campaignId },
    },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  if (!member) {
    res.status(404).json({ error: 'Player not found in this campaign' });
    return;
  }

  const sandboxNotes = await prisma.playerSandboxNote.findMany({
    where: { userId, campaignId: ctx.campaignId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  });

  const sessionRoot = await prisma.wikiPage.findFirst({
    where: {
      campaignId: ctx.campaignId,
      title: PLAYER_SESSION_NOTES_TITLE,
    },
  });

  const wikiNotes = sessionRoot
    ? await prisma.wikiPage.findMany({
        where: {
          campaignId: ctx.campaignId,
          parentId: sessionRoot.id,
          title: {
            contains:
              member.user.displayName?.trim() ||
              member.user.email.split('@')[0] ||
              '',
          },
        },
        select: {
          id: true,
          title: true,
          blocks: true,
          updatedAt: true,
        },
      })
    : [];

  const compiledMarkdown = compilePlayerSummarySections({
    sandboxNotes,
    wikiPages: wikiNotes,
  });

  res.json({
    player: {
      id: member.userId,
      label: formatPlayerLabel(member.user, 0),
      email: member.user.email,
    },
    compiledMarkdown,
    sandboxNoteCount: sandboxNotes.length,
    wikiPageCount: wikiNotes.length,
  });
}

export async function getPersonalPins(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user || !ctx.isMember) {
    res.json({ shortcuts: [] });
    return;
  }

  const shortcuts = await prisma.pageShortcut.findMany({
    where: { userId: req.user.id, campaignId: ctx.campaignId },
    include: {
      page: { select: { id: true, title: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  res.json({
    shortcuts: shortcuts.map((s) => ({
      pageId: s.pageId,
      title: s.page.title,
      sortOrder: s.sortOrder,
    })),
  });
}

/** @deprecated Use getPersonalPins */
export const getPinnedPageShortcuts = getPersonalPins;

export async function getCampaignQuickAccessShortcuts(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  if (!req.campaign!.isMember) {
    res.json({ shortcuts: [] });
    return;
  }

  // CampaignQuickAccess model — see todo.md
  res.json({ shortcuts: [] });
}

export async function togglePinnedPageShortcut(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!req.user || !ctx.isMember) {
    res.status(403).json({ error: 'Forbidden: campaign member required' });
    return;
  }

  const pageId = String(req.params.pageId);
  const userId = req.user.id;
  const campaignId = ctx.campaignId;

  const existing = await prisma.pageShortcut.findUnique({
    where: {
      userId_campaignId_pageId: { userId, campaignId, pageId },
    },
  });

  if (existing) {
    await prisma.pageShortcut.delete({ where: { id: existing.id } });
  } else {
    const page = await prisma.wikiPage.findFirst({
      where: { id: pageId, campaignId },
      select: { id: true },
    });
    if (!page) {
      res.status(404).json({ error: 'Wiki page not found in this campaign' });
      return;
    }

    const max = await prisma.pageShortcut.aggregate({
      _max: { sortOrder: true },
      where: { userId, campaignId },
    });

    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    await prisma.pageShortcut.create({
      data: { userId, campaignId, pageId, sortOrder },
    });
  }

  const shortcuts = await prisma.pageShortcut.findMany({
    where: { userId, campaignId },
    include: { page: { select: { id: true, title: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  res.json({
    shortcuts: shortcuts.map((s) => ({
      pageId: s.pageId,
      title: s.page.title,
      sortOrder: s.sortOrder,
    })),
  });
}
