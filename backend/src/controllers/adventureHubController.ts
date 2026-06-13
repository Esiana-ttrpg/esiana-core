import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { ADVENTURE_HUB_TITLE } from '../lib/adventureConstants.js';
import {
  isLifecyclePartyVisible,
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import {
  buildNarrativePressureFeed,
  narrativeWeightToScore,
} from '../../../shared/narrativePressureFeed.js';
import {
  analyzeDramaticTopology,
  sceneMetadataToSequenceEntry,
} from '../../../shared/dramaticTopology.js';
import { buildInvestigationDependencyLedger } from '../../../shared/investigationTopology.js';
import { EntityRelationKinds } from '../../../shared/entityGraph.js';
import {
  buildStoryboardProjection,
  normalizeAdventureSection,
  parseStoryboardView,
  pruneStaleLayoutNodes,
  sanitizeLayoutForSave,
  STORYBOARD_PRESETS,
  type AdventureSection,
  type StoryboardEntityLookup,
} from '../../../shared/storyboardProjection.js';
import { buildAnalysisSnapshot } from '../lib/entityGraphService.js';
import { resolveCampaignChronologyNow } from '../lib/chronologyDefaults.js';
import { readEntityCategoryFromMetadata } from '../lib/wikiCategoryEntityIndex.js';
import { buildArcHierarchyProjection } from '../../../shared/arcHierarchyProjection.js';
import {
  buildSceneTimelineProjection,
  topologicalSceneOrder,
} from '../../../shared/sceneTimelineProjection.js';
import { buildStoryThreadHistoryProjection } from '../../../shared/storyThreadHistoryProjection.js';
import { canManageNotebooksFromActor, hasElevatedNarrativeView } from '../lib/acl.js';
import { ensureNarrativeScenesSystemCategoryKey } from '../lib/ensureNarrativeScenesSystemCategoryKey.js';
import { ensureNarrativeThreadsSystemCategoryKey } from '../lib/ensureNarrativeThreadsSystemCategoryKey.js';
import { ensureQuestsSystemCategoryKey } from '../lib/ensureQuestsSystemCategoryKey.js';
import { loadClueRedundancyFindings } from '../lib/narrativeClueRedundancyScan.js';
import { loadForeshadowingAnalysis } from '../lib/narrativeForeshadowingScan.js';
import { loadHiddenReachabilityFindings } from '../lib/narrativeHiddenReachabilityScan.js';
import { buildConvergenceOverlay } from '../lib/chronologyConvergenceService.js';
import { ChronologyDomainKind } from '../../../shared/chronologyDomainKinds.js';
import {
  filterQuestRowsForViewer,
  filterSceneRowsForViewer,
  filterThreadRowsForViewer,
  getLifecycleStates,
} from '../lib/narrativeLifecycleService.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import {
  parseQuestMetadata,
  readCategoryMetadataField,
  sanitizeQuestMetadataForRole,
} from '../lib/questMetadata.js';
import {
  buildQuestHubTreePayload,
  collectVisibleQuestSubtreeRows,
  type QuestHubPageRow,
} from '../lib/questHubTree.js';
import { batchSessionBacklinksForQuests } from '../lib/questHubBacklinks.js';
import { parseQuestTaskProgress } from '../lib/questTaskProgress.js';
import {
  buildSceneHubListPayload,
  collectVisibleSceneSubtreeRows,
  type SceneHubPageRow,
} from '../lib/sceneHubTree.js';
import {
  isSceneMetadataPresent,
  parseSceneMetadata,
  parseSceneMetadataWithWarnings,
  sanitizeSceneMetadataForRole,
} from '../lib/sceneMetadata.js';
import {
  buildThreadHubListPayload,
  collectVisibleThreadSubtreeRows,
  type ThreadHubPageRow,
} from '../lib/threadHubTree.js';
import { parseThreadMetadata } from '../lib/threadMetadata.js';
import { loadStoryboardLayout, saveStoryboardLayout } from '../lib/storyboardLayoutService.js';
import { buildGlobalContinuityPayload } from '../lib/wikiContinuityService.js';
import { buildContentSnippet } from '../lib/wikiCategories.js';
import { buildWikiPageHref } from '../lib/wikiLinkService.js';
import { normalizeCampaignMemberRole } from '../lib/acl.js';
import { canViewWikiPage } from '../lib/wikiTree.js';
import {
  isNarrativeScenesCategoryPage,
  isQuestsCategoryPage,
  parseSystemCategoryKey,
} from '../lib/wikiSystemCategory.js';
import { prisma } from '../lib/prisma.js';
import {
  getContentPresenceStateMap,
} from '../lib/contentPresenceService.js';
import {
  ContentPresenceEntityType,
} from '../../../shared/contentPresence.js';
import {
  buildRevelationViewerContext,
  isPresenceVisibleToContext,
} from '../../../shared/narrativeProjection.js';

async function redactBlocksForAdventure(
  campaignId: string,
  pages: Array<{ id: string; blocks: unknown }>,
  canManage: boolean,
): Promise<Map<string, unknown[]>> {
  const result = new Map<string, unknown[]>();
  if (canManage) {
    for (const page of pages) {
      result.set(page.id, (page.blocks as unknown[]) ?? []);
    }
    return result;
  }
  const presenceMap = await getContentPresenceStateMap(
    campaignId,
    ContentPresenceEntityType.WIKI_BLOCK,
    pages.flatMap((page) => {
      const blocks = (page.blocks as Array<{ id?: string }>) ?? [];
      return blocks.filter((b) => b.id).map((b) => b.id!);
    }),
  );
  const viewerCtx = buildRevelationViewerContext({ role: null, isManagerView: false });
  for (const page of pages) {
    const blocks = (page.blocks as Array<Record<string, unknown>>) ?? [];
    result.set(
      page.id,
      blocks.filter((block) => {
        const blockId = typeof block.id === 'string' ? block.id : null;
        if (!blockId) return true;
        const presence = presenceMap.get(blockId);
        if (!presence) return true;
        return isPresenceVisibleToContext(presence, viewerCtx);
      }),
    );
  }
  return result;
}

async function resolveRefPages(
  refIds: Set<string>,
  campaignId: string,
  role: string | null,
) {
  const memberRole = role ? normalizeCampaignMemberRole(role) : null;
  if (refIds.size === 0) {
    return new Map<string, { id: string; title: string; workspace: string | null; pathKey: string | null }>();
  }
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: [...refIds] } },
    select: { id: true, title: true, visibility: true, workspace: true, pathKey: true },
  });
  return new Map(
    pages
      .filter((page) => canViewWikiPage(page.visibility, memberRole))
      .map((page) => [page.id, page]),
  );
}

function mapRef(
  page: { id: string; title: string; workspace?: string | null; pathKey?: string | null },
  handle: string,
) {
  return { id: page.id, title: page.title, href: buildWikiPageHref(handle, page) };
}

const ADVENTURE_TIMELINE_DOMAINS = [
  ChronologyDomainKind.SESSION_CHRONICLE,
  ChronologyDomainKind.DOWNTIME_PERIOD,
  ChronologyDomainKind.WORLD_EVENT,
  ChronologyDomainKind.ORG_RELATION,
] as const;

export async function buildAdventureHubResponse(
  req: CampaignScopedRequest,
  res: Response,
  questsRootId: string,
): Promise<void> {
  const ctx = req.campaign!;
  const canManage = canManageNotebooksFromActor(ctx.actor);
  const previewAsPlayer =
    req.query.previewAsPlayer === 'true' || req.query.previewAsPlayer === '1';
  const effectiveCanManage = canManage && !previewAsPlayer;
  const section: AdventureSection = normalizeAdventureSection(req.query.section);
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

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
    res.status(404).json({ error: 'Adventure category page not found' });
    return;
  }

  await ensureNarrativeScenesSystemCategoryKey(ctx.campaignId);
  await ensureNarrativeThreadsSystemCategoryKey(ctx.campaignId);

  const allRows = await prisma.wikiPage.findMany({
    where: { campaignId: ctx.campaignId, deletedAt: null },
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

  const viewerCtx = await buildNarrativeViewerContextFromRequest(req);
  const lifecycleViewerCtx =
    viewerCtx && previewAsPlayer && canManage
      ? { ...viewerCtx, perspective: 'party' as const }
      : viewerCtx;

  const payload: Record<string, unknown> = {
    category: {
      id: category.id,
      title: ADVENTURE_HUB_TITLE,
      parentId: category.parentId,
      visibility: category.visibility,
      updatedAt: category.updatedAt.toISOString(),
      systemCategoryKey: parseSystemCategoryKey(category.metadata),
    },
    previewAsPlayer: previewAsPlayer && canManage,
    activeSection: section,
  };

  const scenesRootId = allRows.find((p) => isNarrativeScenesCategoryPage(p.metadata))?.id ?? null;
  const threadsRootId =
    allRows.find((p) => parseSystemCategoryKey(p.metadata) === 'narrative_threads')?.id ?? null;

  if (section === 'board' || !req.query.section) {
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
    const visibleQuestRows = collectVisibleQuestSubtreeRows(questRows, questsRootId, ctx.role);
    const questLifecycleMap = await getLifecycleStates(
      ctx.campaignId,
      NarrativeLifecycleSubjectKinds.QUEST,
      visibleQuestRows.map((row) => row.id),
    );
    const lifecycleFilteredQuests =
      lifecycleViewerCtx != null
        ? filterQuestRowsForViewer(visibleQuestRows, questLifecycleMap, lifecycleViewerCtx)
        : visibleQuestRows;

    const visibleBlocksByPage = await redactBlocksForAdventure(
      ctx.campaignId,
      lifecycleFilteredQuests.map((row) => ({ id: row.id, blocks: row.blocks })),
      effectiveCanManage,
    );

    const refIds = new Set<string>();
    for (const row of lifecycleFilteredQuests) {
      const quest = parseQuestMetadata(row.metadata);
      if (quest.questGiverId) refIds.add(quest.questGiverId);
      if (quest.factionId) refIds.add(quest.factionId);
    }
    const refById = await resolveRefPages(refIds, ctx.campaignId, ctx.role);
    const backlinkMap = await batchSessionBacklinksForQuests({
      campaignId: ctx.campaignId,
      campaignHandle,
      targetPageIds: lifecycleFilteredQuests.map((row) => row.id),
      role: ctx.role,
    });

    payload.board = {
      quests: buildQuestHubTreePayload(lifecycleFilteredQuests, questsRootId, (row) => {
        const quest = sanitizeQuestMetadataForRole(
          parseQuestMetadata(row.metadata),
          hasElevatedNarrativeView(ctx.actor) && !previewAsPlayer,
        );
        const lifecycleState = questLifecycleMap.get(row.id) ?? null;
        const questGiver = quest.questGiverId ? refById.get(quest.questGiverId) : undefined;
        const faction = quest.factionId ? refById.get(quest.factionId) : undefined;
        return {
          id: row.id,
          title: row.title,
          parentId: row.parentId,
          visibility: row.visibility,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          snippet: buildContentSnippet(
            (visibleBlocksByPage.get(row.id) ?? []) as Parameters<typeof buildContentSnippet>[0],
          ),
          quest,
          ...(effectiveCanManage && lifecycleState ? { lifecycleState } : {}),
          location: readCategoryMetadataField(row.metadata, 'Location'),
          progressNote: readCategoryMetadataField(row.metadata, 'Progress'),
          progress: parseQuestTaskProgress(visibleBlocksByPage.get(row.id) ?? [], {
            includeDmOnlyBlocks: effectiveCanManage,
          }),
          tags: [],
          recentActivity: backlinkMap.get(row.id) ?? [],
          references: {
            questGiver: questGiver ? mapRef(questGiver, campaignHandle) : null,
            faction: faction ? mapRef(faction, campaignHandle) : null,
          },
        };
      }),
    };
  }

  if (section === 'scenes' && scenesRootId) {
    const sceneRows: SceneHubPageRow[] = allRows.map((row) => ({
      id: row.id,
      title: row.title,
      parentId: row.parentId,
      visibility: row.visibility,
      metadata: row.metadata,
      blocks: row.blocks,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const visibleSceneRows = collectVisibleSceneSubtreeRows(sceneRows, scenesRootId, ctx.role);
    const sceneLifecycleMap = await getLifecycleStates(
      ctx.campaignId,
      NarrativeLifecycleSubjectKinds.SCENE,
      visibleSceneRows.map((row) => row.id),
    );
    const lifecycleFilteredScenes =
      lifecycleViewerCtx != null
        ? filterSceneRowsForViewer(visibleSceneRows, sceneLifecycleMap, lifecycleViewerCtx)
        : visibleSceneRows;

    const sceneRefIds = new Set<string>();
    for (const row of lifecycleFilteredScenes) {
      const scene = parseSceneMetadata(row.metadata);
      for (const id of [
        ...scene.participantPageIds,
        ...scene.linkedQuestPageIds,
        ...scene.linkedObjectivePageIds,
        ...scene.linkedCluePageIds,
        ...scene.linkedThreadPageIds,
        ...scene.followsScenePageIds,
      ]) {
        sceneRefIds.add(id);
      }
      if (scene.locationPageId) sceneRefIds.add(scene.locationPageId);
    }
    const sceneRefById = await resolveRefPages(sceneRefIds, ctx.campaignId, ctx.role);

    const scenes = buildSceneHubListPayload(lifecycleFilteredScenes, scenesRootId, (row) => {
      const parsed = parseSceneMetadataWithWarnings(row.metadata);
      const scene = sanitizeSceneMetadataForRole(parsed.fields, effectiveCanManage);
      const lifecycleState = sceneLifecycleMap.get(row.id) ?? null;
      const mapRefs = (ids: string[]) =>
        ids
          .map((id) => sceneRefById.get(id))
          .filter((p): p is NonNullable<typeof p> => p != null)
          .map((p) => mapRef(p, campaignHandle));

      return {
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        snippet: scene.summary ?? '',
        scene,
        ...(effectiveCanManage && lifecycleState ? { lifecycleState } : {}),
        ...(effectiveCanManage && parsed.warnings.length > 0
          ? { metadataWarnings: parsed.warnings }
          : {}),
        references: {
          participants: mapRefs(scene.participantPageIds),
          location: scene.locationPageId
            ? sceneRefById.get(scene.locationPageId)
              ? mapRef(sceneRefById.get(scene.locationPageId)!, campaignHandle)
              : null
            : null,
          quests: mapRefs(scene.linkedQuestPageIds),
          clues: mapRefs(scene.linkedCluePageIds),
          threads: mapRefs(scene.linkedThreadPageIds),
          followsScenes: mapRefs(scene.followsScenePageIds),
        },
      };
    });

    const { layout } = await loadStoryboardLayout(ctx.campaignId);

    const visibleQuestRows = collectVisibleQuestSubtreeRows(
      allRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        metadata: row.metadata,
        blocks: row.blocks,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      questsRootId,
      ctx.role,
    );
    const arcProjection = buildArcHierarchyProjection({
      questsRootId,
      questRows: visibleQuestRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        metadata: row.metadata,
      })),
      sceneRows: lifecycleFilteredScenes.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        metadata: row.metadata,
      })),
    });

    let lifecycleFilteredThreads: ThreadHubPageRow[] = [];
    if (threadsRootId != null) {
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
      const visibleThreads = collectVisibleThreadSubtreeRows(
        threadRows,
        threadsRootId,
        ctx.role,
      );
      const threadLifecycleMap = await getLifecycleStates(
        ctx.campaignId,
        NarrativeLifecycleSubjectKinds.OPEN_THREAD,
        visibleThreads.map((row) => row.id),
      );
      lifecycleFilteredThreads =
        lifecycleViewerCtx != null
          ? filterThreadRowsForViewer(
              visibleThreads,
              threadLifecycleMap,
              lifecycleViewerCtx,
            )
          : visibleThreads;
    }

    const entityLookup: StoryboardEntityLookup = new Map();
    for (const s of scenes) {
      entityLookup.set(s.id, {
        title: s.title,
        entityType: 'scene',
        beatType: s.scene.beatType,
        narrativeWeight: s.scene.narrativeWeight,
        sceneStatus: s.scene.sceneStatus,
      });
    }
    for (const row of visibleQuestRows) {
      const quest = parseQuestMetadata(row.metadata);
      entityLookup.set(row.id, {
        title: row.title,
        entityType: 'quest',
        questStatus: quest.questStatus ?? null,
      });
    }
    for (const row of lifecycleFilteredThreads) {
      const thread = parseThreadMetadata(row.metadata);
      entityLookup.set(row.id, {
        title: row.title,
        entityType: 'thread',
        threadKind: thread.threadKind ?? null,
        narrativeWeight: thread.narrativeWeight,
      });
    }

    const layoutRefIds = new Set(layout.nodes.map((n) => n.entityId));
    const unresolvedRefIds = [...layoutRefIds].filter((id) => !entityLookup.has(id));
    if (unresolvedRefIds.length > 0) {
      const refPages = await resolveRefPages(
        new Set(unresolvedRefIds),
        ctx.campaignId,
        ctx.role,
      );
      for (const id of unresolvedRefIds) {
        const page = refPages.get(id);
        if (!page) continue;
        const row = allRows.find((r) => r.id === id);
        const category = row ? readEntityCategoryFromMetadata(row.metadata) : null;
        const entityType =
          category === 'Characters'
            ? 'character'
            : category === 'Locations'
              ? 'location'
              : 'wiki_page';
        entityLookup.set(id, {
          title: page.title,
          entityType,
          codexType: category,
        });
      }
    }

    for (const row of allRows) {
      const category = readEntityCategoryFromMetadata(row.metadata);
      if (category === 'Characters' && !entityLookup.has(row.id)) {
        entityLookup.set(row.id, {
          title: row.title,
          entityType: 'character',
          codexType: category,
        });
      }
      if (category === 'Locations' && !entityLookup.has(row.id)) {
        entityLookup.set(row.id, {
          title: row.title,
          entityType: 'location',
          codexType: category,
        });
      }
    }

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: { calendar: { campaignId: ctx.campaignId } },
      select: { id: true, title: true },
      take: 200,
    });
    for (const event of calendarEvents) {
      entityLookup.set(event.id, {
        title: event.title,
        entityType: 'event',
      });
    }

    const campaignNow = await resolveCampaignChronologyNow(ctx.campaignId);
    const graphSnapshot = viewerCtx
      ? await buildAnalysisSnapshot({
          campaignId: ctx.campaignId,
          kinds: [
            EntityRelationKinds.SCENE_FOLLOWS,
            EntityRelationKinds.SCENE_THREAD,
            EntityRelationKinds.SCENE_CLUE,
            EntityRelationKinds.SCENE_QUEST,
            EntityRelationKinds.OBJECTIVE_SCENE,
            EntityRelationKinds.SCENE_PARTICIPANT,
            EntityRelationKinds.SCENE_LOCATION,
            EntityRelationKinds.QUEST_OBJECTIVE,
            EntityRelationKinds.THREAD_RELATED,
            EntityRelationKinds.THREAD_PAYOFF,
          ],
          viewerCtx,
          campaignNow,
          includeSuppressed: effectiveCanManage,
        })
      : { edges: [] };

    const paletteQuests = visibleQuestRows.map((row) => ({
      id: row.id,
      title: row.title,
      entityType: 'quest' as const,
    }));
    const paletteThreads = lifecycleFilteredThreads.map((row) => ({
      id: row.id,
      title: row.title,
      entityType: 'thread' as const,
      threadKind: parseThreadMetadata(row.metadata).threadKind ?? null,
    }));
    const paletteCharacters = allRows
      .filter((row) => readEntityCategoryFromMetadata(row.metadata) === 'Characters')
      .map((row) => ({ id: row.id, title: row.title, entityType: 'character' as const }));
    const paletteLocations = allRows
      .filter((row) => readEntityCategoryFromMetadata(row.metadata) === 'Locations')
      .map((row) => ({ id: row.id, title: row.title, entityType: 'location' as const }));
    const paletteEvents = calendarEvents.map((event) => ({
      id: event.id,
      title: event.title,
      entityType: 'event' as const,
    }));

    payload.scenes = {
      scenes,
      storyboard: buildStoryboardProjection({
        layout,
        entities: entityLookup,
        entityGraphEdges: graphSnapshot.edges,
        ancestryByEntityId: arcProjection.ancestryByEntityId,
      }),
      arcFilterOptions: arcProjection.roots
        .filter((node) => node.kind === 'campaign_arc')
        .map((node) => ({ id: node.id, title: node.title })),
      palette: {
        scenes: scenes.map((s) => ({
          id: s.id,
          title: s.title,
          entityType: 'scene' as const,
        })),
        quests: paletteQuests,
        threads: paletteThreads,
        characters: paletteCharacters,
        locations: paletteLocations,
        events: paletteEvents,
      },
      presets: STORYBOARD_PRESETS,
    };

    if (effectiveCanManage) {
      const sceneSequenceInputs = scenes.map((s) => ({
        id: s.id,
        title: s.title,
        scene: {
          sceneStatus: s.scene.sceneStatus,
          beatType: s.scene.beatType,
          plannedSessionId: s.scene.plannedSessionId,
          playedSessionId: s.scene.playedSessionId,
          sortOrder: s.scene.sortOrder,
          followsScenePageIds: s.scene.followsScenePageIds,
          linkedQuestPageIds: s.scene.linkedQuestPageIds,
        },
      }));
      const sceneById = new Map(scenes.map((s) => [s.id, s]));
      payload.dramaticTopology = analyzeDramaticTopology(
        topologicalSceneOrder(sceneSequenceInputs).map((s) =>
          sceneMetadataToSequenceEntry(s.id, sceneById.get(s.id)!.scene),
        ),
      );
    }
  }

  if (section === 'investigation' && threadsRootId) {
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
    const visibleThreads = collectVisibleThreadSubtreeRows(threadRows, threadsRootId, ctx.role);
    const threadLifecycleMap = await getLifecycleStates(
      ctx.campaignId,
      NarrativeLifecycleSubjectKinds.OPEN_THREAD,
      visibleThreads.map((row) => row.id),
    );
    const lifecycleFilteredThreads =
      lifecycleViewerCtx != null
        ? filterThreadRowsForViewer(visibleThreads, threadLifecycleMap, lifecycleViewerCtx)
        : visibleThreads;

    const sceneRows: SceneHubPageRow[] = allRows.map((row) => ({
      id: row.id,
      title: row.title,
      parentId: row.parentId,
      visibility: row.visibility,
      metadata: row.metadata,
      blocks: row.blocks,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const visibleSceneRows =
      scenesRootId != null
        ? collectVisibleSceneSubtreeRows(sceneRows, scenesRootId, ctx.role)
        : [];
    const sceneLifecycleMap =
      visibleSceneRows.length > 0
        ? await getLifecycleStates(
            ctx.campaignId,
            NarrativeLifecycleSubjectKinds.SCENE,
            visibleSceneRows.map((row) => row.id),
          )
        : new Map<string, (typeof NarrativeLifecycleStates)[keyof typeof NarrativeLifecycleStates]>();
    const lifecycleFilteredScenes =
      lifecycleViewerCtx != null
        ? filterSceneRowsForViewer(visibleSceneRows, sceneLifecycleMap, lifecycleViewerCtx)
        : visibleSceneRows;

    const ledgerRefIds = new Set<string>();
    const threadScans = lifecycleFilteredThreads
      .filter((row) => {
        const thread = parseThreadMetadata(row.metadata);
        return thread.threadKind !== 'theory' && !thread.playerSubmitted;
      })
      .map((row) => {
        const thread = parseThreadMetadata(row.metadata);
        for (const id of thread.relatedPageIds) ledgerRefIds.add(id);
        if (thread.payoffPageId) ledgerRefIds.add(thread.payoffPageId);
        return {
          id: row.id,
          title: row.title,
          threadKind: thread.threadKind,
          narrativeWeight: thread.narrativeWeight ?? null,
          relatedPageIds: thread.relatedPageIds,
          payoffPageId: thread.payoffPageId,
          reachable: isLifecyclePartyVisible(
            threadLifecycleMap.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED,
          ),
          playerSubmitted: thread.playerSubmitted,
        };
      });

    const sceneScans = lifecycleFilteredScenes.map((row) => {
      const scene = parseSceneMetadata(row.metadata);
      for (const id of [
        ...scene.participantPageIds,
        ...scene.linkedCluePageIds,
        ...scene.linkedThreadPageIds,
      ]) {
        ledgerRefIds.add(id);
      }
      if (scene.locationPageId) ledgerRefIds.add(scene.locationPageId);
      for (const outcome of scene.outcomes) {
        for (const id of outcome.linkedPageIds ?? []) ledgerRefIds.add(id);
      }
      return {
        id: row.id,
        title: row.title,
        sceneKind: scene.sceneKind,
        participantPageIds: scene.participantPageIds,
        locationPageId: scene.locationPageId,
        linkedCluePageIds: scene.linkedCluePageIds,
        linkedThreadPageIds: scene.linkedThreadPageIds,
        outcomes: scene.outcomes,
        reachable: isLifecyclePartyVisible(
          sceneLifecycleMap.get(row.id) ?? NarrativeLifecycleStates.DISCOVERED,
        ),
      };
    });

    const titlesById = new Map<string, string>();
    for (const thread of threadScans) titlesById.set(thread.id, thread.title);
    for (const scene of sceneScans) titlesById.set(scene.id, scene.title);

    const refPages = await resolveRefPages(ledgerRefIds, ctx.campaignId, ctx.role);
    for (const [id, page] of refPages) {
      titlesById.set(id, page.title);
    }

    const entityCategoryById = new Map<string, string | null>();
    for (const row of allRows) {
      if (ledgerRefIds.has(row.id)) {
        entityCategoryById.set(row.id, readEntityCategoryFromMetadata(row.metadata));
      }
    }

    const clueThreadIds = new Set(
      threadScans.filter((t) => t.threadKind === 'clue').map((t) => t.id),
    );
    const investigationSceneIds = new Set(sceneScans.map((s) => s.id));

    const [clueRedundancy, hiddenReachability] = await Promise.all([
      effectiveCanManage
        ? loadClueRedundancyFindings({ campaignId: ctx.campaignId, role: ctx.role })
        : Promise.resolve({ findings: [] }),
      effectiveCanManage
        ? loadHiddenReachabilityFindings({ campaignId: ctx.campaignId, role: ctx.role })
        : Promise.resolve({ findings: [] }),
    ]);

    const spofClueIds = new Set<string>();
    for (const finding of clueRedundancy.findings) {
      if (finding.clueThreadPageId && clueThreadIds.has(finding.clueThreadPageId)) {
        spofClueIds.add(finding.clueThreadPageId);
      }
    }

    const unreachableIds = new Set<string>();
    for (const finding of hiddenReachability.findings) {
      if (
        clueThreadIds.has(finding.subjectPageId) ||
        investigationSceneIds.has(finding.subjectPageId) ||
        ledgerRefIds.has(finding.subjectPageId)
      ) {
        unreachableIds.add(finding.subjectPageId);
      }
    }

    const ledgerResult = buildInvestigationDependencyLedger({
      threads: threadScans,
      scenes: sceneScans,
      titlesById,
      entityCategoryById,
      spofClueIds,
      unreachableIds,
    });

    payload.investigation = {
      threadsRootId,
      scenesRootId: scenesRootId ?? undefined,
      ledger: {
        rows: ledgerResult.rows,
        columns: ledgerResult.columns,
        cells: ledgerResult.cells,
        legend: ledgerResult.legend,
      },
      nodes: ledgerResult.nodes,
      edges: ledgerResult.edges,
    };
  }

  if (section === 'continuity' && effectiveCanManage) {
    const globalContinuity = await buildGlobalContinuityPayload({
      campaignId: ctx.campaignId,
      role: ctx.role,
    });
    const weightByEntity = new Map<string, number>();
    for (const row of allRows) {
      if (isSceneMetadataPresent(row.metadata)) {
        weightByEntity.set(row.id, narrativeWeightToScore(parseSceneMetadata(row.metadata).narrativeWeight));
      }
      const thread = parseThreadMetadata(row.metadata);
      if (thread.threadKind) {
        weightByEntity.set(row.id, narrativeWeightToScore(thread.narrativeWeight));
      }
    }
    payload.continuity = {
      issues: globalContinuity.issues,
      counts: globalContinuity.counts,
      pressureFeed: buildNarrativePressureFeed(globalContinuity.issues, weightByEntity),
    };
  }

  if (section === 'scene-timeline') {
    if (!scenesRootId) {
      payload.sceneTimeline = buildSceneTimelineProjection({
        sessions: [],
        scenes: [],
      });
    } else {
    const visibleSceneRows = collectVisibleSceneSubtreeRows(
      allRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        metadata: row.metadata,
        blocks: row.blocks,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      scenesRootId,
      ctx.role,
    );

    const sceneLifecycleMap = await getLifecycleStates(
      ctx.campaignId,
      NarrativeLifecycleSubjectKinds.SCENE,
      visibleSceneRows.map((row) => row.id),
    );
    const lifecycleFilteredScenes =
      lifecycleViewerCtx != null
        ? filterSceneRowsForViewer(visibleSceneRows, sceneLifecycleMap, lifecycleViewerCtx)
        : visibleSceneRows;

    const timelineRows = await prisma.campaignSessionTimeline.findMany({
      where: { campaignId: ctx.campaignId },
      orderBy: [{ sequenceOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        sequenceOrder: true,
        wikiPage: { select: { title: true } },
        schedule: { select: { plannedStartAt: true } },
      },
    });

    const visibleQuestRows = collectVisibleQuestSubtreeRows(
      allRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        metadata: row.metadata,
        blocks: row.blocks,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      questsRootId,
      ctx.role,
    );
    const arcProjection = buildArcHierarchyProjection({
      questsRootId,
      questRows: visibleQuestRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        metadata: row.metadata,
      })),
      sceneRows: lifecycleFilteredScenes
        .filter((row) => isSceneMetadataPresent(row.metadata))
        .map((row) => ({
          id: row.id,
          title: row.title,
          parentId: row.parentId,
          metadata: row.metadata,
        })),
    });

    payload.sceneTimeline = buildSceneTimelineProjection({
      sessions: timelineRows.map((row) => ({
        id: row.id,
        title: row.wikiPage?.title ?? 'Session',
        sequenceOrder: row.sequenceOrder,
        plannedStartAt: row.schedule?.plannedStartAt?.toISOString() ?? null,
      })),
      scenes: lifecycleFilteredScenes
        .filter((row) => isSceneMetadataPresent(row.metadata))
        .map((row) => {
          const sceneMeta = parseSceneMetadata(row.metadata);
          return {
            id: row.id,
            title: row.title,
            scene: {
              sceneStatus: sceneMeta.sceneStatus,
              beatType: sceneMeta.beatType,
              plannedSessionId: sceneMeta.plannedSessionId,
              playedSessionId: sceneMeta.playedSessionId,
              sortOrder: sceneMeta.sortOrder,
              followsScenePageIds: sceneMeta.followsScenePageIds,
              linkedQuestPageIds: sceneMeta.linkedQuestPageIds,
            },
          };
        }),
      arcFilterOptions: arcProjection.roots
        .filter((node) => node.kind === 'campaign_arc')
        .map((node) => ({ id: node.id, title: node.title })),
      questArcAncestry: arcProjection.ancestryByEntityId,
    });
    }
  }

  if (section === 'thread-history' && effectiveCanManage) {
    const timelineRows = await prisma.campaignSessionTimeline.findMany({
      where: { campaignId: ctx.campaignId },
      orderBy: [{ sequenceOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        sequenceOrder: true,
        wikiPage: { select: { title: true } },
        schedule: { select: { plannedStartAt: true } },
      },
    });

    const sessionPayload = timelineRows.map((row) => ({
      id: row.id,
      title: row.wikiPage?.title ?? 'Session',
      sequenceOrder: row.sequenceOrder,
      plannedStartAt: row.schedule?.plannedStartAt?.toISOString() ?? null,
    }));

    if (!threadsRootId) {
      payload.threadHistory = buildStoryThreadHistoryProjection({
        sessions: sessionPayload,
        threads: [],
      });
    } else {
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
      const visibleThreads = collectVisibleThreadSubtreeRows(threadRows, threadsRootId, ctx.role);
      const threadLifecycleMap = await getLifecycleStates(
        ctx.campaignId,
        NarrativeLifecycleSubjectKinds.OPEN_THREAD,
        visibleThreads.map((row) => row.id),
      );
      const lifecycleFilteredThreads =
        lifecycleViewerCtx != null
          ? filterThreadRowsForViewer(visibleThreads, threadLifecycleMap, lifecycleViewerCtx)
          : visibleThreads;

      const threadInputs = lifecycleFilteredThreads
        .map((row) => {
          const thread = parseThreadMetadata(row.metadata);
          return {
            threadPageId: row.id,
            title: row.title,
            thread,
          };
        })
        .filter(
          (row) =>
            row.thread.threadKind !== 'theory' &&
            !row.thread.playerSubmitted &&
            row.thread.threadKind,
        );

      const payoffPageIds = new Set<string>();
      for (const row of threadInputs) {
        if (row.thread.payoffPageId) payoffPageIds.add(row.thread.payoffPageId);
      }

      const payoffPages =
        payoffPageIds.size > 0
          ? await prisma.wikiPage.findMany({
              where: {
                campaignId: ctx.campaignId,
                deletedAt: null,
                id: { in: [...payoffPageIds] },
              },
              select: { id: true, title: true },
            })
          : [];

      const pageTitlesById: Record<string, string> = Object.fromEntries(
        payoffPages.map((page) => [page.id, page.title]),
      );

      const foreshadowingAnalysis = await loadForeshadowingAnalysis({
        campaignId: ctx.campaignId,
        role: ctx.role,
      });

      payload.threadHistory = buildStoryThreadHistoryProjection({
        sessions: sessionPayload,
        threads: threadInputs,
        chains: foreshadowingAnalysis.chains,
        findings: foreshadowingAnalysis.findings,
        pageTitlesById,
      });
    }
  }

  if (section === 'sessions') {
    const readyScenes =
      scenesRootId && allRows.length > 0
        ? collectVisibleSceneSubtreeRows(
            allRows.map((row) => ({
              id: row.id,
              title: row.title,
              parentId: row.parentId,
              visibility: row.visibility,
              metadata: row.metadata,
              blocks: row.blocks,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            })),
            scenesRootId,
            ctx.role,
          )
            .filter((row) => parseSceneMetadata(row.metadata).sceneStatus === 'READY')
            .map((row) => ({
              id: row.id,
              title: row.title,
              sceneStatus: parseSceneMetadata(row.metadata).sceneStatus,
            }))
        : [];
    const { layout } = await loadStoryboardLayout(ctx.campaignId);
    payload.sessions = {
      readyScenes,
      presets: STORYBOARD_PRESETS,
      storyboardLayout: layout,
    };
  }

  if (section === 'timeline') {
    const overlay = await buildConvergenceOverlay({
      campaignId: ctx.campaignId,
      campaignHandle,
      role: ctx.role,
      allowPlayerChronologyManagement: ctx.allowPlayerChronologyManagement ?? false,
      window: { mode: 'YEAR_RANGE', from: '0', to: '9999' },
      domains: [...ADVENTURE_TIMELINE_DOMAINS],
      sessionLinkedOnly: false,
      includeSuppressed: effectiveCanManage,
    });

    payload.timeline = {
      embedded: true,
      chronologyPath: `/campaigns/${campaignHandle}/chronology?view=feed`,
      overlay,
      defaultDomains: [...ADVENTURE_TIMELINE_DOMAINS],
    };
  }

  if (section === 'arcs') {
    const { layout } = await loadStoryboardLayout(ctx.campaignId);
    const visibleQuestRows = collectVisibleQuestSubtreeRows(
      allRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        visibility: row.visibility,
        metadata: row.metadata,
        blocks: row.blocks,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      questsRootId,
      ctx.role,
    );
    const sceneRowsForArc =
      scenesRootId != null
        ? collectVisibleSceneSubtreeRows(
            allRows.map((row) => ({
              id: row.id,
              title: row.title,
              parentId: row.parentId,
              visibility: row.visibility,
              metadata: row.metadata,
              blocks: row.blocks,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            })),
            scenesRootId,
            ctx.role,
          )
        : [];

    payload.arcHierarchy = buildArcHierarchyProjection({
      questsRootId,
      questRows: visibleQuestRows.map((row) => ({
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        metadata: row.metadata,
      })),
      sceneRows: sceneRowsForArc
        .filter((row) => isSceneMetadataPresent(row.metadata))
        .map((row) => ({
          id: row.id,
          title: row.title,
          parentId: row.parentId,
          metadata: row.metadata,
        })),
    });
    payload.actLanes = layout.lanes;
  }

  if (effectiveCanManage && section !== 'continuity') {
    const globalContinuity = await buildGlobalContinuityPayload({
      campaignId: ctx.campaignId,
      role: ctx.role,
    });
    const weightByEntity = new Map<string, number>();
    for (const row of allRows) {
      if (isSceneMetadataPresent(row.metadata)) {
        weightByEntity.set(
          row.id,
          narrativeWeightToScore(parseSceneMetadata(row.metadata).narrativeWeight),
        );
      }
      const thread = parseThreadMetadata(row.metadata);
      if (thread.threadKind) {
        weightByEntity.set(row.id, narrativeWeightToScore(thread.narrativeWeight));
      }
    }
    payload.continuity = {
      issues: globalContinuity.issues.slice(0, 20),
      counts: globalContinuity.counts,
      pressureFeed: buildNarrativePressureFeed(globalContinuity.issues, weightByEntity).slice(
        0,
        12,
      ),
    };
  }

  res.json(payload);
}

export async function getAdventureHubBySystemKey(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const questsRootId = await ensureQuestsSystemCategoryKey(ctx.campaignId);
  if (!questsRootId) {
    res.status(404).json({ error: 'Adventure category page not found' });
    return;
  }
  await buildAdventureHubResponse(req, res, questsRootId);
}

export async function getAdventureHubIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  await ensureQuestsSystemCategoryKey(ctx.campaignId);
  await buildAdventureHubResponse(req, res, pageId);
}

export async function getStoryboardLayout(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { layoutPageId, layout } = await loadStoryboardLayout(ctx.campaignId);
  res.json({ layoutPageId, layout });
}

export async function patchStoryboardLayout(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canManageNotebooksFromActor(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const body = req.body as { layout?: unknown };
  let layout = parseStoryboardView(body.layout);

  const wikiPages = await prisma.wikiPage.findMany({
    where: { campaignId: ctx.campaignId, deletedAt: null },
    select: { id: true },
  });
  const calendarEvents = await prisma.calendarEvent.findMany({
    where: { calendar: { campaignId: ctx.campaignId } },
    select: { id: true },
  });
  const validEntityIds = new Set([
    ...wikiPages.map((p) => p.id),
    ...calendarEvents.map((e) => e.id),
  ]);

  layout = pruneStaleLayoutNodes(layout, validEntityIds);
  layout = sanitizeLayoutForSave(layout);

  const result = await saveStoryboardLayout(ctx.campaignId, layout);
  res.json(result);
}
