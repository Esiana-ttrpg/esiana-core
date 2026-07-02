import { apiFetch } from './api';
import type {
  CategoryMetadata,
  CharacterMetadata,
  InfoboxField,
  PageShortcut,
  SessionNoteMetadata,
  WikiPageBlock,
  WikiPageLayoutPayload,
  WikiPageParentRef,
  WikiTag,
  WikiTagInput,
  WikiTagAppearanceUpdate,
  TagsHubPayload,
  WikiTreeNode,
  WikiTreePayload,
  QuestHubPayload,
  QuestMetadataFields,
  WikiBacklink,
  WikiBrokenLink,
  WikiOutlink,
  WikiLinkIntegrityPayload,
  SessionNotesIndexPayload,
  SessionNotePerspectivesPayload,
  CombinedSessionNotesPayload,
} from '@/types/wiki';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';

export type { DiscoveryStateProjection };
export type { PageNarrativeStatusProjection };

export async function fetchWikiTreePayload(
  campaignHandle: string,
): Promise<WikiTreePayload> {
  return apiFetch<WikiTreePayload>(`/campaigns/${campaignHandle}/wiki/tree`);
}

export interface CategoryLocationAncestor {
  id: string;
  title: string;
}

export interface CategoryIndexChild {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  snippet: string;
  type?: string;
  entityCategory?: string | null;
  presenceState?: string;
  discovery?: DiscoveryStateProjection;
  narrativeStatus?: PageNarrativeStatusProjection;
  metadata?: CategoryMetadata | CharacterMetadata;
  isCrossNested?: boolean;
  locationAncestors?: CategoryLocationAncestor[];
  locationTrailLabel?: string | null;
}

export interface CategoryDiscoverySummary {
  discoveredCount: number;
  undiscoveredCount: number;
}

export interface CategoryIndexPayload {
  category: {
    id: string;
    title: string;
    isIndexCategory: boolean;
  };
  children: CategoryIndexChild[];
  discoverySummary?: CategoryDiscoverySummary | null;
}

export async function fetchCategoryIndex(
  campaignHandle: string,
  categoryPageId: string,
): Promise<CategoryIndexPayload> {
  const data = await apiFetch<CategoryIndexPayload>(
    `/campaigns/${campaignHandle}/wiki/index/${categoryPageId}`,
  );

  return data;
}

export async function fetchQuestHub(
  campaignHandle: string,
  options?: { pageId?: string; previewAsPlayer?: boolean },
): Promise<QuestHubPayload> {
  const params = new URLSearchParams();
  if (options?.previewAsPlayer) {
    params.set('previewAsPlayer', 'true');
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const path = options?.pageId
    ? `/campaigns/${campaignHandle}/wiki/quests-hub/${options.pageId}${query}`
    : `/campaigns/${campaignHandle}/wiki/quests-hub${query}`;
  return apiFetch<QuestHubPayload>(path);
}

export async function fetchThreadHub(
  campaignHandle: string,
  options?: { pageId?: string; previewAsPlayer?: boolean },
): Promise<import('@/types/wiki').ThreadHubPayload> {
  const params = new URLSearchParams();
  if (options?.previewAsPlayer) {
    params.set('previewAsPlayer', 'true');
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const path = options?.pageId
    ? `/campaigns/${campaignHandle}/wiki/threads-hub/${options.pageId}${query}`
    : `/campaigns/${campaignHandle}/wiki/threads-hub${query}`;
  return apiFetch(path);
}

export async function previewQuestPublish(
  campaignHandle: string,
  pageId: string,
): Promise<{ preview: unknown }> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-publish/quest/${pageId}/preview`);
}

export async function publishQuestToParty(
  campaignHandle: string,
  pageId: string,
): Promise<{ lifecycleState: string; blocks: unknown[] }> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-publish/quest/${pageId}`, {
    method: 'POST',
  });
}

export async function updateQuestMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Partial<QuestMetadataFields>,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch<{ metadata: Record<string, unknown> }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ metadata: patch }),
    },
  );
}

export async function clearQuestMetadata(
  campaignHandle: string,
  pageId: string,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch<{ metadata: Record<string, unknown> }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ clearQuest: true }),
    },
  );
}

export async function updateThreadMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Partial<import('@/types/wiki').ThreadMetadataFields>,
): Promise<{ metadata: Record<string, unknown>; metadataWarnings?: string[] }> {
  return apiFetch<{ metadata: Record<string, unknown>; metadataWarnings?: string[] }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ metadata: patch }),
    },
  );
}

export async function updateSceneMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Partial<import('@/lib/sceneMetadata').SceneMetadataFields>,
): Promise<{ metadata: Record<string, unknown>; metadataWarnings?: string[] }> {
  return apiFetch<{ metadata: Record<string, unknown>; metadataWarnings?: string[] }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ metadata: patch }),
    },
  );
}

export async function updateObjectiveMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Partial<import('@/lib/objectiveMetadata').ObjectiveMetadataFields>,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify({ metadata: patch }),
  });
}

export async function updateArcMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Partial<import('@/lib/arcMetadata').ArcMetadataFields>,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify({ metadata: patch }),
  });
}

export async function patchSceneLifecycle(
  campaignHandle: string,
  pageId: string,
  lifecycleState: string,
  entityName?: string,
): Promise<{
  lifecycleState: string;
  sceneStatus: string | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-lifecycle/scene/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      lifecycleState,
      ...(entityName ? { entityName } : {}),
    }),
  });
}

export async function fetchSceneLifecycleStates(
  campaignHandle: string,
  pageIds: string[],
): Promise<{
  items: Array<{
    subjectId: string;
    lifecycleState: string | null;
    visible: string | null;
  }>;
}> {
  const params = new URLSearchParams({
    subjectKind: 'scene',
    subjectIds: pageIds.join(','),
  });
  const data = await apiFetch<{
    items: Array<{
      subjectId: string;
      lifecycleState: string | null;
      visible: string | null;
    }>;
  }>(`/campaigns/${campaignHandle}/narrative-lifecycle?${params.toString()}`);
  return data;
}

export async function patchThreadLifecycle(
  campaignHandle: string,
  pageId: string,
  lifecycleState: string,
  entityName?: string,
): Promise<{
  lifecycleState: string;
  threadStatus: string | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-lifecycle/open_thread/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      lifecycleState,
      ...(entityName ? { entityName } : {}),
    }),
  });
}

export async function patchQuestLifecycle(
  campaignHandle: string,
  pageId: string,
  lifecycleState: string,
  entityName?: string,
): Promise<{
  lifecycleState: string;
  questStatus: string | null;
}> {
  return apiFetch(`/campaigns/${campaignHandle}/narrative-lifecycle/quest/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      lifecycleState,
      ...(entityName ? { entityName } : {}),
    }),
  });
}

export async function fetchQuestLifecycleStates(
  campaignHandle: string,
  pageIds: string[],
): Promise<{
  items: Array<{
    subjectId: string;
    lifecycleState: string | null;
    visible: string | null;
  }>;
}> {
  const params = new URLSearchParams({
    subjectKind: 'quest',
    subjectIds: pageIds.join(','),
  });
  const data = await apiFetch<{
    items: Array<{
      subjectId: string;
      lifecycleState: string | null;
      visible: string | null;
    }>;
  }>(`/campaigns/${campaignHandle}/narrative-lifecycle?${params.toString()}`);
  return data;
}

export async function fetchThreadLifecycleStates(
  campaignHandle: string,
  pageIds: string[],
): Promise<{
  items: Array<{
    subjectId: string;
    lifecycleState: string | null;
    visible: string | null;
  }>;
}> {
  const params = new URLSearchParams({
    subjectKind: 'open_thread',
    subjectIds: pageIds.join(','),
  });
  const data = await apiFetch<{
    items: Array<{
      subjectId: string;
      lifecycleState: string | null;
      visible: string | null;
    }>;
  }>(`/campaigns/${campaignHandle}/narrative-lifecycle?${params.toString()}`);
  return data;
}

async function patchEntityMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return apiFetch<{ metadata: Record<string, unknown> }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ metadata: patch }),
    },
  );
}

export async function updateOrganizationMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateFamilyMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateBestiaryMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateAncestryMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateObjectMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateLocationMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateRuleResourceMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateCharacterLineageMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export async function updateCharacterMetadata(
  campaignHandle: string,
  pageId: string,
  patch: Record<string, unknown>,
): Promise<{ metadata: Record<string, unknown> }> {
  return patchEntityMetadata(campaignHandle, pageId, patch);
}

export interface SessionCompileResult {
  title: string;
  compiledMarkdown: string;
  pageCount: number;
  sourcePageIds: string[];
  warnings?: string[];
  truncated?: boolean;
  skippedPageIds?: string[];
}

export type WikiDeleteMode = 'orphan' | 'recursive';

export type OrphanRuleApplied =
  | 'geographical'
  | 'contained'
  | 'structural'
  | 'fallback';

export interface ChildReparentPlanEntry {
  childId: string;
  childTitle: string;
  proposedParentId: string | null;
  proposedParentTitle: string | null;
  ruleApplied: OrphanRuleApplied;
  rationale: string;
}

export interface WikiDeletePreview {
  page: { id: string; title: string; parentId: string | null };
  directChildCount: number;
  descendantCount: number;
  descendantTitlesSample: string[];
  hasReservedInSubtree: boolean;
  reservedPageIds: string[];
  childReparentPlan: ChildReparentPlanEntry[];
}

export interface WikiDeletePayload {
  mode: WikiDeleteMode;
  confirm: true;
  confirmPhrase?: string;
}

export interface WikiDeleteResult {
  ok: boolean;
  mode: WikiDeleteMode;
  deletedPageIds: string[];
  orphanedChildIds?: string[];
}

export async function compileSessionNotes(
  campaignHandle: string,
  sessionPageId?: string,
): Promise<SessionCompileResult> {
  const query = sessionPageId ? `?sessionPageId=${sessionPageId}` : '';
  return apiFetch<SessionCompileResult>(
    `/campaigns/${campaignHandle}/wiki/session-notes/compile${query}`,
  );
}

export interface PlayerSessionSummary {
  player: { id: string; label: string; email: string };
  compiledMarkdown: string;
  sandboxNoteCount: number;
  wikiPageCount: number;
}

export async function fetchPlayerSessionSummary(
  campaignHandle: string,
  playerId: string,
): Promise<PlayerSessionSummary> {
  return apiFetch<PlayerSessionSummary>(
    `/campaigns/${campaignHandle}/wiki/session-notes/player/${playerId}`,
  );
}

export async function fetchSessionNotesIndex(
  campaignHandle: string,
): Promise<SessionNotesIndexPayload> {
  return apiFetch<SessionNotesIndexPayload>(
    `/campaigns/${campaignHandle}/wiki/session-notes/index`,
  );
}

export interface CreateSessionTimelineResult {
  success: boolean;
  timelinePointId: string;
  wikiPageId: string;
  title: string;
  sequenceOrder: number;
}

export async function createNewSessionTimeline(
  campaignHandle: string,
): Promise<CreateSessionTimelineResult> {
  return apiFetch<CreateSessionTimelineResult>(
    `/campaigns/${campaignHandle}/session-timeline/new`,
    { method: 'POST' },
  );
}

export interface SessionTimelinePointPayload {
  timelinePointId: string;
  wikiPageId: string;
  sessionGroupId?: string;
  authorId: string;
  sequenceOrder: number;
  page: WikiPageLayoutPayload;
}

export async function fetchSessionTimelinePoint(
  campaignHandle: string,
  timelinePointId: string,
): Promise<SessionTimelinePointPayload> {
  return apiFetch<SessionTimelinePointPayload>(
    `/campaigns/${campaignHandle}/session-timeline/${timelinePointId}`,
  );
}

export async function ensureSessionAuthorNote(
  campaignHandle: string,
  timelinePointId: string,
): Promise<import('@/types/wiki').EnsureSessionAuthorNoteResult> {
  return apiFetch<import('@/types/wiki').EnsureSessionAuthorNoteResult>(
    `/campaigns/${campaignHandle}/session-timeline/${timelinePointId}/notes/me`,
    { method: 'POST' },
  );
}

export async function fetchCombinedSessionNotes(
  campaignHandle: string,
  params: { timelinePointId?: string; sessionGroupId?: string; pageId?: string },
): Promise<CombinedSessionNotesPayload> {
  const query = new URLSearchParams();
  if (params.timelinePointId) {
    query.set('timelinePointId', params.timelinePointId);
  }
  if (params.sessionGroupId) {
    query.set('sessionGroupId', params.sessionGroupId);
  }
  if (params.pageId) query.set('pageId', params.pageId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<CombinedSessionNotesPayload>(
    `/campaigns/${campaignHandle}/wiki/session-notes/combined${suffix}`,
  );
}

export async function createNotebookArc(
  campaignHandle: string,
  input: { title?: string },
): Promise<{ id: string; title: string; displayOrder: number }> {
  const data = await apiFetch<{
    notebook: { id: string; title: string; displayOrder: number };
  }>(`/campaigns/${campaignHandle}/notebooks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.notebook;
}

export async function updateNotebookArc(
  campaignHandle: string,
  notebookId: string,
  title: string,
): Promise<{ id: string; title: string; displayOrder: number }> {
  const data = await apiFetch<{
    notebook: { id: string; title: string; displayOrder: number };
  }>(`/campaigns/${campaignHandle}/notebooks/${notebookId}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
  return data.notebook;
}

export async function assignNotebookToWikiPage(
  campaignHandle: string,
  pageId: string,
  notebookArcId: string | null,
): Promise<{ id: string; notebookArcId: string | null }> {
  const data = await apiFetch<{
    page: { id: string; notebookArcId: string | null };
  }>(`/campaigns/${campaignHandle}/wiki-pages/assign-notebook`, {
    method: 'PATCH',
    body: JSON.stringify({ pageId, notebookArcId }),
  });
  return data.page;
}

export async function bulkMoveNotebookPages(
  campaignHandle: string,
  noteIds: string[],
  destinationBookId: string | null,
): Promise<{ updatedCount: number }> {
  return apiFetch<{ updatedCount: number }>(
    `/campaigns/${campaignHandle}/wiki-pages/bulk-move`,
    {
      method: 'PATCH',
      body: JSON.stringify({ noteIds, destinationBookId }),
    },
  );
}

export async function bulkDeleteSessionNotes(
  campaignHandle: string,
  noteIds: string[],
): Promise<{ deletedCount: number }> {
  return apiFetch<{ deletedCount: number }>(
    `/campaigns/${campaignHandle}/wiki-pages/bulk-delete`,
    {
      method: 'POST',
      body: JSON.stringify({ noteIds }),
    },
  );
}

export async function fetchSessionNotePerspectives(
  campaignHandle: string,
  pageId: string,
): Promise<SessionNotePerspectivesPayload> {
  return apiFetch<SessionNotePerspectivesPayload>(
    `/campaigns/${campaignHandle}/wiki/session-notes/${pageId}/perspectives`,
  );
}

export async function updateSessionNotePage(
  campaignHandle: string,
  pageId: string,
  input: { title?: string; content?: string },
): Promise<{ id: string; title: string; updatedAt: string }> {
  const data = await apiFetch<{
    page: { id: string; title: string; updatedAt: string };
  }>(`/campaigns/${campaignHandle}/wiki-pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.page;
}

export async function fetchWikiDeletePreview(
  campaignHandle: string,
  pageId: string,
): Promise<WikiDeletePreview> {
  return apiFetch<WikiDeletePreview>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/delete-preview`,
  );
}

export async function deleteWikiPage(
  campaignHandle: string,
  pageId: string,
  payload: WikiDeletePayload,
): Promise<WikiDeleteResult> {
  return apiFetch<WikiDeleteResult>(`/campaigns/${campaignHandle}/wiki/${pageId}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export async function deleteSessionNotePage(
  campaignHandle: string,
  pageId: string,
  payload?: WikiDeletePayload,
): Promise<WikiDeleteResult> {
  return apiFetch<WikiDeleteResult>(`/campaigns/${campaignHandle}/wiki-pages/${pageId}`, {
    method: 'DELETE',
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}

export async function uploadSessionNotePage(
  campaignHandle: string,
  file: File,
): Promise<{ id: string; title: string; updatedAt: string }> {
  const formData = new FormData();
  formData.append('document', file);
  const data = await apiFetch<{
    page: { id: string; title: string; updatedAt: string };
  }>(`/campaigns/${campaignHandle}/wiki-pages/upload`, {
    method: 'POST',
    body: formData,
  });
  return data.page;
}

export async function deleteNotebookArc(
  campaignHandle: string,
  notebookId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/campaigns/${campaignHandle}/notebooks/${notebookId}`, {
    method: 'DELETE',
  });
}

export function resolveEventsWikiParentId(
  flatPages: Array<{ id: string; title: string }>,
): string | null {
  const eventsPage = flatPages.find(
    (page) => page.title.trim().toLowerCase() === 'events',
  );
  return eventsPage?.id ?? null;
}

export function isEventLorePageId(pageId: string): boolean {
  return /^event-[a-zA-Z0-9_-]+$/.test(pageId);
}

export async function createWikiPage(
  campaignHandle: string,
  input: {
    id?: string;
    title: string;
    parentId: string | null;
    metadata?: CategoryMetadata | CharacterMetadata | Record<string, unknown>;
    blocks?: WikiPageBlock[];
    templateType?: string;
    visibility?: 'Public' | 'Party' | 'DM_Only';
    initialThreadLifecycle?: string;
    tags?: WikiTagInput[];
  },
): Promise<WikiTreeNode> {
  const data = await apiFetch<{ page: WikiTreeNode }>(
    `/campaigns/${campaignHandle}/wiki`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.page;
}

export type CreateThreadPageInput = {
  title: string;
  threadKind: import('@/types/wiki').ThreadKind;
  narrativeWeight?: import('@/types/wiki').ThreadNarrativeWeight;
  initialLifecycle: string;
  threadStatus?: import('@/types/wiki').ThreadStatus;
  relatedPageIds?: string[];
  payoffPageId?: string | null;
  introducedSessionId?: string | null;
  playerSubmitted?: boolean;
};

export async function createThreadPage(
  campaignHandle: string,
  threadsRootId: string,
  input: CreateThreadPageInput,
): Promise<WikiTreeNode> {
  const { buildThreadBodyMarkdown } = await import('@/lib/threadCreate');
  const { buildThreadDefaultBlocks } = await import('@/utils/pageTemplates');
  const markdown = buildThreadBodyMarkdown(input.threadKind);
  const blocks = buildThreadDefaultBlocks({ markdown });
  const metadata: Record<string, unknown> = {
    threadKind: input.threadKind,
    threadStatus: input.threadStatus ?? 'OPEN',
    narrativeWeight: input.narrativeWeight ?? 'major',
    relatedPageIds: input.relatedPageIds ?? [],
    payoffPageId: input.payoffPageId ?? null,
    introducedSessionId: input.introducedSessionId ?? null,
    playerSubmitted: input.playerSubmitted ?? input.threadKind === 'theory',
  };
  return createWikiPage(campaignHandle, {
    title: input.title.trim(),
    parentId: threadsRootId,
    metadata,
    blocks,
    templateType: 'DEFAULT',
    initialThreadLifecycle: input.initialLifecycle,
  });
}

export type CreateQuestPageInput = {
  title: string;
  questType?: string | null;
  visibility?: 'Public' | 'Party' | 'DM_Only';
};

export async function createQuestPage(
  campaignHandle: string,
  questsRootId: string,
  input: CreateQuestPageInput,
): Promise<WikiTreeNode> {
  const { buildQuestDefaultBlocks } = await import('@/utils/pageTemplates');
  const { DEFAULT_QUEST_STATUS } = await import('@/lib/questMetadata');
  const blocks = buildQuestDefaultBlocks();
  const metadata: Record<string, unknown> = {
    entityCategory: 'quests',
    questStatus: DEFAULT_QUEST_STATUS,
  };
  const questType = input.questType?.trim();
  if (questType) {
    metadata.questType = questType;
  }
  return createWikiPage(campaignHandle, {
    title: input.title.trim(),
    parentId: questsRootId,
    metadata,
    blocks,
    templateType: 'QUEST',
    visibility: input.visibility,
  });
}

export type CreateArcPageInput = {
  title: string;
  arcKind?: import('@/lib/arcMetadata').ArcKind;
  pacingTarget?: string | null;
  visibility?: 'Public' | 'Party' | 'DM_Only';
};

export async function createArcPage(
  campaignHandle: string,
  parentId: string,
  input: CreateArcPageInput,
): Promise<WikiTreeNode> {
  const { mergeArcMetadata } = await import('@/lib/arcMetadata');
  const { buildDefaultBlocks } = await import('@/utils/pageTemplates');
  const bodyMarkdown = '## Premise\n\nDescribe the arc scope and stakes.\n';
  const blocks = buildDefaultBlocks('default').map((block) =>
    block.type === 'text-tiptap'
      ? {
          ...block,
          content: {
            ...(block.content ?? {}),
            markdown: bodyMarkdown,
          },
        }
      : block,
  );
  const metadata = mergeArcMetadata({}, {
    arcKind: input.arcKind ?? 'campaign_arc',
    containedPageIds: [],
    actIndex: null,
    pacingTarget: input.pacingTarget?.trim() || null,
  });
  return createWikiPage(campaignHandle, {
    title: input.title.trim(),
    parentId,
    metadata,
    blocks,
    templateType: 'DEFAULT',
    visibility: input.visibility,
  });
}

export async function fetchWikiPageLayout(
  campaignHandle: string,
  pageId: string,
): Promise<WikiPageLayoutPayload> {
  return apiFetch<WikiPageLayoutPayload>(`/campaigns/${campaignHandle}/wiki/${pageId}`);
}

export async function updateWikiPage(
  campaignHandle: string,
  pageId: string,
  input: {
    parentId?: string | null;
    title?: string;
    tags?: WikiTagInput[];
  },
): Promise<WikiPageLayoutPayload> {
  return apiFetch<WikiPageLayoutPayload>(`/campaigns/${campaignHandle}/wiki/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export interface WikiTransformResult {
  pageId: string;
  promotedQuestPageId?: string;
  workspace: string | null;
  pathKey: string | null;
}

export async function transformWikiPage(
  campaignHandle: string,
  pageId: string,
  targetModule: string,
): Promise<WikiTransformResult> {
  return apiFetch<WikiTransformResult>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/transform`,
    {
      method: 'POST',
      body: JSON.stringify({ targetModule }),
    },
  );
}

export async function fetchCampaignTags(
  campaignHandle: string,
): Promise<WikiTag[]> {
  const data = await apiFetch<{ tags: WikiTag[] }>(
    `/campaigns/${campaignHandle}/wiki/tags`,
  );
  return data.tags ?? [];
}

export async function fetchTagsHub(
  campaignHandle: string,
  tagId?: string,
): Promise<TagsHubPayload> {
  const query = tagId ? `?tagId=${encodeURIComponent(tagId)}` : '';
  return apiFetch<TagsHubPayload>(
    `/campaigns/${campaignHandle}/wiki/tags-hub${query}`,
  );
}

export async function updateWikiTag(
  campaignHandle: string,
  tagId: string,
  input: WikiTagAppearanceUpdate,
): Promise<WikiTag> {
  const data = await apiFetch<{ tag: WikiTag }>(
    `/campaigns/${campaignHandle}/wiki/tags/${tagId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.tag;
}

export async function uploadWikiTagIcon(
  campaignHandle: string,
  tagId: string,
  file: File,
): Promise<WikiTag> {
  const form = new FormData();
  form.append('file', file);
  const data = await apiFetch<{ tag: WikiTag }>(
    `/campaigns/${campaignHandle}/wiki/tags/${tagId}/icon`,
    {
      method: 'POST',
      body: form,
    },
  );
  return data.tag;
}

export type { WikiPageParentRef };
export {
  buildParentChainFromFlatPages,
  buildWikiBreadcrumbs,
  buildWikiNavBreadcrumbs,
  buildWikiPageLookup,
  collectDescendantIds,
  formatParentOptionLabel,
  isExcludedParentCandidate,
  resolveWikiParentChain,
  formatIndexLocationTrail,
} from './wikiHierarchy';

export async function fetchWikiBacklinks(
  campaignHandle: string,
  pageId: string,
): Promise<WikiBacklink[]> {
  const data = await apiFetch<{ backlinks: WikiBacklink[]; total?: number }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/backlinks`,
  );
  return data.backlinks ?? [];
}

export interface WikiOutlinksPayload {
  outlinks: WikiOutlink[];
  brokenOutlinks: WikiBrokenLink[];
  total: number;
}

export async function fetchWikiOutlinks(
  campaignHandle: string,
  pageId: string,
): Promise<WikiOutlinksPayload> {
  return apiFetch<WikiOutlinksPayload>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/outlinks`,
  );
}

export async function fetchWikiLinkIntegrity(
  campaignHandle: string,
  pageId: string,
): Promise<WikiLinkIntegrityPayload> {
  return apiFetch<WikiLinkIntegrityPayload>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/link-integrity`,
  );
}

export async function saveWikiPageLayout(
  campaignHandle: string,
  pageId: string,
  blocks: WikiPageBlock[],
  templateType: string,
): Promise<{ blocks: WikiPageBlock[]; templateType: string }> {
  return apiFetch<{ blocks: WikiPageBlock[]; templateType: string }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/layout`,
    {
      method: 'PATCH',
      body: JSON.stringify({ blocks, templateType }),
    },
  );
}

export async function updateWikiPageVisibility(
  campaignHandle: string,
  pageId: string,
  visibility: 'Public' | 'Party' | 'DM_Only',
): Promise<{ visibility: string; linkedMapObjectCount?: number }> {
  return apiFetch<{ visibility: string; linkedMapObjectCount?: number }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/visibility`,
    {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    },
  );
}

export async function fetchWikiPageMetadata(
  campaignHandle: string,
  pageId: string,
): Promise<{ metadata?: CategoryMetadata | CharacterMetadata | SessionNoteMetadata }> {
  return apiFetch<{
    metadata?: CategoryMetadata | CharacterMetadata | SessionNoteMetadata;
  }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}`,
  );
}

export async function saveWikiPageMetadata(
  campaignHandle: string,
  pageId: string,
  metadata: CategoryMetadata | CharacterMetadata | SessionNoteMetadata,
): Promise<{
  metadata: CategoryMetadata | CharacterMetadata | SessionNoteMetadata;
}> {
  return apiFetch<{
    metadata: CategoryMetadata | CharacterMetadata | SessionNoteMetadata;
  }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ metadata }),
    },
  );
}

export async function updateWikiPageMetadataField(
  campaignHandle: string,
  pageId: string,
  key: string,
  value: string,
): Promise<{ metadata: CategoryMetadata | CharacterMetadata }> {
  return apiFetch<{ metadata: CategoryMetadata | CharacterMetadata }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/metadata`,
    {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    },
  );
}

export function flattenWikiTree(
  nodes: WikiTreeNode[],
): WikiTreeNode[] {
  const result: WikiTreeNode[] = [];
  function walk(list: WikiTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export function findWikiNode(
  tree: WikiTreeNode[],
  pageId: string,
): WikiTreeNode | undefined {
  return flattenWikiTree(tree).find((n) => n.id === pageId);
}

function contentStorageKey(campaignHandle: string, pageId: string): string {
  return `esiana-wiki-content-${campaignHandle}-${pageId}`;
}

export function loadWikiPageContent(
  campaignHandle: string,
  pageId: string,
): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(contentStorageKey(campaignHandle, pageId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function saveWikiPageContent(
  campaignHandle: string,
  pageId: string,
  content: Record<string, unknown>,
): void {
  localStorage.setItem(
    contentStorageKey(campaignHandle, pageId),
    JSON.stringify(content),
  );
}

export async function fetchPersonalPins(
  campaignHandle: string,
): Promise<PageShortcut[]> {
  try {
    const data = await apiFetch<{ shortcuts: PageShortcut[] }>(
      `/campaigns/${campaignHandle}/wiki/pins`,
    );
    return data.shortcuts ?? [];
  } catch {
    return [];
  }
}

export async function togglePinnedShortcut(
  campaignHandle: string,
  pageId: string,
): Promise<PageShortcut[]> {
  const data = await apiFetch<{ shortcuts: PageShortcut[] }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/pin`,
    { method: 'PATCH' },
  );
  return data.shortcuts ?? [];
}

function infoboxStorageKey(campaignHandle: string, pageId: string): string {
  return `esiana-wiki-infobox-${campaignHandle}-${pageId}`;
}

const DEFAULT_INFOBOX: InfoboxField[] = [
  { key: 'Location', value: 'Waterdeep' },
  { key: 'Status', value: 'Active' },
  { key: 'Type', value: 'Settlement' },
];

export function loadInfoboxFields(
  campaignHandle: string,
  pageId: string,
): InfoboxField[] {
  try {
    const raw = localStorage.getItem(infoboxStorageKey(campaignHandle, pageId));
    if (raw) {
      const parsed = JSON.parse(raw) as InfoboxField[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_INFOBOX];
}

export function saveInfoboxFields(
  campaignHandle: string,
  pageId: string,
  fields: InfoboxField[],
): void {
  localStorage.setItem(
    infoboxStorageKey(campaignHandle, pageId),
    JSON.stringify(fields),
  );
}

