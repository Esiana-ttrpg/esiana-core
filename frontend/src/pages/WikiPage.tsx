import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveWikiRoutePageId,
  shouldBlockFreeformRoute,
} from '@/lib/resolveWikiRoutePageId';
import { PageBlockDraftRegistryProvider } from '@/contexts/PageBlockDraftRegistry';
import type { PageBlockDraftRegistryValue } from '@/contexts/PageBlockDraftRegistry';
import { PageBlockDraftRegistryBridge } from '@/components/wiki/PageBlockDraftRegistryBridge';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchCampaign } from '@/lib/campaigns';
import { CampaignMemberRoles } from '@/types/domain';
import { useWiki } from '@/contexts/WikiContext';
import {
  buildWikiNavBreadcrumbs,
  buildWikiPageLookup,
  createWikiPage,
  findWikiNode,
  isEventLorePageId,
  resolveEventsWikiParentId,
  resolveWikiParentChain,
  togglePinnedShortcut,
  fetchCampaignTags,
  fetchWikiPageLayout,
  saveWikiPageLayout,
  updateWikiPage,
  updateWikiPageVisibility,
} from '@/lib/wiki';
import {
  campaignDashboardPath,
  campaignNotePath,
  campaignWikiPath,
  campaignWikiTagsPath,
  campaignWorkspaceEntityPath,
  readCampaignHandle,
  resolveCanonicalPagePath,
  workspaceToSegment,
} from '@/lib/campaignPaths';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { isWikiVisibilityVisibleToViewer } from '@shared/narrativeProjection';
import { useCampaignActor } from '@/hooks/useCampaignActor';
import { EventConsequencesEditor } from '@/components/chronology/EventConsequencesEditor';
import { resolveCategoryIndexTitleForPage } from '@/lib/wikiCategories';
import type {
  CharacterMetadata,
  WikiPageBlock,
  WikiPageLayoutPayload,
  WikiTag,
  WikiTagInput,
} from '@/types/wiki';
import { HavenWikiPageView } from '@/components/downtime/HavenWikiPageView';
import { ProjectWikiPageView } from '@/components/downtime/ProjectWikiPageView';
import { DOWNTIME_HAVEN_TEMPLATE_TYPE } from '@shared/havenMetadata';
import { DOWNTIME_PROJECT_TEMPLATE_TYPE } from '@shared/projectMetadata';
import { CreateThreadModal } from '@/components/thread/CreateThreadModal';
import { ThreadHistoryPanel } from '@/components/thread/ThreadHistoryPanel';
import { isPageUnderNarrativeThreadsCategory } from '@/lib/threadHubLayout';
import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';
import {
  parseSystemCategoryKey,
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
  SYSTEM_CATEGORY_PARTY,
  SYSTEM_CATEGORY_QUESTS,
  isDowntimeHubCategoryPage,
} from '@/lib/wikiSystemCategory';
import { WikiPageEditorHeader } from '@/components/wiki/WikiPageEditorHeader';
import { WikiPageRendererSlot } from '@/components/wiki/WikiPageRendererSlot';
import { AncestryPageShellView } from '@/components/entity/shells/AncestryPageShellView';
import { BestiaryPageShellView } from '@/components/entity/shells/BestiaryPageShellView';
import { CharacterPageShellView } from '@/components/entity/shells/CharacterPageShellView';
import { OrganizationPageShellView } from '@/components/entity/shells/OrganizationPageShellView';
import { GenericWikiPageShellView } from '@/components/entity/shells/GenericWikiPageShellView';
import { PageSettingsDrawer } from '@/components/entity/shells/PageSettingsDrawer';
import { resolveEntityPageShell } from '@/lib/entityPageShells/registry';
import { ensureSystemBlocks } from '@/lib/entityPageShells/systemBlocks';
import type { EntitySubviewId } from '@/lib/entityPageShells/types';
import {
  getMasterPageWidthPreference,
  MASTER_PAGE_WIDTH_EVENT,
} from '@/lib/pageWidthPreference';
import { usePageCodexDiagnostics } from '@/hooks/usePageCodexDiagnostics';
import { resolveSubviewFromCodexDeepLink } from '@/lib/pageCodexDiagnostics';
import { WikiPageDeleteDialog } from '@/components/wiki/WikiPageDeleteDialog';
import { isReservedSystemWikiPage } from '@/lib/wikiSystemPages';
import { wikiTagsInputsEqual } from '@/components/wiki/WikiPageTagsInput';
import { WikiContinuityPanel } from '@/components/wiki/WikiContinuityPanel';
import { PluginSlotHost, PluginUiSlots } from '@/plugins/slots';
import { useDeclaredPluginSlot } from '@/plugins/useDeclaredPluginSlot';
import { fetchCampaignMap, fetchCampaignMaps } from '@/lib/maps';
import type { CampaignMapAsset } from '@/types/maps';
import { SessionNoteEditor } from '@/components/session/SessionNoteEditor';
import { buildCharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import { buildOrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import { buildFamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import {
  buildBestiaryIdentityProjection,
  buildBestiaryIntelProjection,
} from '@/lib/bestiaryIdentityProjection';
import { buildAncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import { buildObjectIdentityProjection } from '@/lib/objectIdentityProjection';
import { buildLocationIdentityProjection } from '@/lib/locationIdentityProjection';
import { buildRuleResourceIdentityProjection } from '@/lib/ruleResourceIdentityProjection';
import {
  isEntityWorkspacePage,
  resolveEntitySurfaceProfile,
  type SurfaceProfileKey,
} from '@/lib/entitySurfaceProfile';
import { entityWorkspaceReaderFirst } from '@/lib/entityWorkspaceSlots';
import { EntityWorkspaceSurface } from '@/components/wiki/EntityWorkspaceSurface';
import type { WorkspaceCompositionId } from '@/lib/workspaceComposition';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { parseFamilyMetadata } from '@/lib/familyMetadata';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useSessionCombined } from '@/hooks/useSessionCombined';
import { parseSessionNoteMetadata } from '@/utils/sessionNote';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { InterpretiveLoreReadSection } from '@/components/entity/lore/InterpretiveLoreReadSection';
import {
  fetchInterpretiveSummary,
  type InterpretiveSummaryResponse,
} from '@/lib/loreKnowledgeApi';
import { normalizeChronologyDate } from '@/lib/entityRelationTypes';
import { chronologyDateKey } from '@/hooks/useCampaignChronologyNow';
import type { CampaignDetail } from '@/types/campaign';
import {
  buildDefaultBlocks,
  buildEventLoreBlocks,
  createWikiBlock,
  ensureAppearanceBlock,
  resolveSemanticPageBlocks,
} from '@/utils/pageTemplates';
import { stripHeightsForPersist } from '@/utils/wikiLayoutRuntime';
import {
  DEFAULT_BLOCK_DISPLAY_STATE,
  type BlockDisplayState,
} from '@/lib/blockDisplayState';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import {
  masterPageWidthToCodexLayout,
  resolvePageMeasureTier,
  resolveReadableMeasureCh,
  type CodexLayoutVariant,
} from '@/lib/codexWorkspaceUx';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import {
  findPrimaryProseBlockId,
  getWorkspaceOrchestration,
  workspaceModeCssVars,
} from '@/lib/workspaceOrchestration';
import {
  shouldShowLoreSemanticSections,
  type WikiPageSubview,
} from '@/lib/wikiPageSubviews';
import { getWikiWidgetOptions } from '@/utils/wikiWidgets';
import { getEmptyGridSlots } from '@/utils/wikiGrid';
import type { BlocksUpdater } from '@/components/wiki/WikiPageRenderer';

function resolveWikiPageBlocks(
  serverBlocks: WikiPageBlock[] | undefined,
  wikiPageId: string,
  surfaceKey: SurfaceProfileKey,
): WikiPageBlock[] {
  if (Array.isArray(serverBlocks) && serverBlocks.length > 0) {
    return serverBlocks;
  }
  if (isEventLorePageId(wikiPageId)) {
    return buildEventLoreBlocks();
  }
  return buildDefaultBlocks(surfaceKey);
}

function getInfoboxFieldValue(blocks: WikiPageBlock[], fieldKey: string): string {
  const infobox = blocks.find((b) => b.type === 'wiki-infobox');
  const raw = (infobox?.content as { fields?: Array<{ key?: string; value?: string }> })
    ?.fields;
  if (!Array.isArray(raw)) return '';
  const match = raw.find(
    (f) =>
      typeof f?.key === 'string' &&
      f.key.trim().toLowerCase() === fieldKey.toLowerCase(),
  );
  return typeof match?.value === 'string' ? match.value.trim() : '';
}

function getPageDisplayTitle(
  pageTitle: string,
  _metadata?: WikiPageLayoutPayload['metadata'],
): string {
  return pageTitle;
}

function isTagsHubPage(title: string): boolean {
  return title.trim().toLowerCase() === 'tags';
}

function tagsFromPayload(tags?: WikiTag[]): WikiTagInput[] {
  return (tags ?? []).map((tag) => ({
    id: tag.id,
    name: tag.name,
    label: tag.label,
  }));
}

function headerIconButtonClass(active: boolean): string {
  return `inline-flex size-9 items-center justify-center rounded-lg border transition-all ${
    active
      ? 'border-primary/60 bg-primary/15 text-primary'
      : 'border-border bg-surface/80 text-muted hover:border-border hover:text-foreground'
  }`;
}

export function WikiPage() {
  const params = useParams<{
    campaignHandle?: string;
    pageId?: string;
    pathKey?: string;
  }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    campaignHandle: wikiCampaignSlug,
    campaign: wikiCampaign,
    tree,
    flatPages,
    loading,
    refresh,
    pinnedShortcuts,
    pageIdByTitle,
    players,
    can: wikiCan,
  } = useWiki();
  const campaignHandle = readCampaignHandle(params) || wikiCampaignSlug;
  const pageId = useMemo(
    () =>
      resolveWikiRoutePageId({
        pathname: location.pathname,
        campaignHandle,
        pathKey: params.pathKey,
        pageId: params.pageId,
        flatPages,
      }),
    [
      location.pathname,
      campaignHandle,
      params.pathKey,
      params.pageId,
      flatPages,
    ],
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!params.pathKey || !pageId || !campaignHandle) return;
    const page = flatPages.find((entry) => entry.id === pageId);
    if (!page?.pathKey || params.pathKey === page.pathKey) return;
    const canonicalPath = resolveCanonicalPagePath(campaignHandle, page, flatPages);
    if (canonicalPath.split('?')[0] === location.pathname) return;
    navigate(`${canonicalPath}${location.search}`, { replace: true });
  }, [
    campaignHandle,
    flatPages,
    location.pathname,
    location.search,
    navigate,
    pageId,
    params.pathKey,
  ]);

  const shouldCreateDraft =
    searchParams.get('create') === 'true' && isEventLorePageId(pageId);
  const prefillTitle = searchParams.get('prefillTitle')?.trim() ?? '';

  const [pageData, setPageData] = useState<WikiPageLayoutPayload | null>(null);
  const [pageFetchState, setPageFetchState] = useState<
    'loading' | 'ready' | 'error' | 'creating'
  >('loading');
  const [blocks, setBlocks] = useState<WikiPageBlock[]>([]);
  const [templateType, setTemplateType] = useState('DEFAULT');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [inspectorFocusField, setInspectorFocusField] = useState<string | null>(null);
  const [_focusBlockType, setFocusBlockType] = useState<string | null>(null);
  const [pendingCodexSubview, setPendingCodexSubview] = useState(false);
  const [pageSubview, setPageSubview] = useState<EntitySubviewId | WikiPageSubview>(
    'overview',
  );
  const [workspaceMode] = useState<WorkspaceMode>('focused');
  const [codexLayout, setCodexLayout] = useState<CodexLayoutVariant>(() =>
    masterPageWidthToCodexLayout(getMasterPageWidthPreference()),
  );
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [blockDisplayState, setBlockDisplayState] = useState<BlockDisplayState>(
    DEFAULT_BLOCK_DISPLAY_STATE,
  );
  const [showGridLines, setShowGridLines] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pageTags, setPageTags] = useState<WikiTagInput[]>([]);
  const [savedPageTags, setSavedPageTags] = useState<WikiTagInput[]>([]);
  const [allCampaignTags, setAllCampaignTags] = useState<WikiTag[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isThreadCreateOpen, setIsThreadCreateOpen] = useState(false);
  const workspaceOrchestrationKeyRef = useRef<string | null>(null);
  const [embeddedMap, setEmbeddedMap] = useState<CampaignMapAsset | null>(null);
  const [embeddedCampaignMaps, setEmbeddedCampaignMaps] = useState<CampaignMapAsset[]>([]);
  const [entityDetailTab, setEntityDetailTab] = useState<'lore' | 'structure'>('lore');
  const hasEditorSlot = useDeclaredPluginSlot(PluginUiSlots.EDITOR);

  useEffect(() => {
    setEntityDetailTab('lore');
    setPageSubview('overview');
    setCodexLayout(masterPageWidthToCodexLayout(getMasterPageWidthPreference()));
  }, [pageId, templateType]);

  useEffect(() => {
    const onWidthChange = () => {
      setCodexLayout(masterPageWidthToCodexLayout(getMasterPageWidthPreference()));
    };
    window.addEventListener(MASTER_PAGE_WIDTH_EVENT, onWidthChange);
    return () => window.removeEventListener(MASTER_PAGE_WIDTH_EVENT, onWidthChange);
  }, []);

  const entitySurfaceProfile = useMemo(() => {
    if (!pageId) {
      return resolveEntitySurfaceProfile({
        pageId: '',
        templateType,
        metadata: pageData?.metadata,
        flatPages,
      });
    }
    return resolveEntitySurfaceProfile({
      pageId,
      templateType,
      metadata: pageData?.metadata,
      flatPages,
    });
  }, [pageId, templateType, pageData?.metadata, flatPages]);

  const entityPageShell = useMemo(
    () =>
      resolveEntityPageShell(
        entitySurfaceProfile.key,
        entitySurfaceProfile.appearanceMode,
      ),
    [entitySurfaceProfile.key, entitySurfaceProfile.appearanceMode],
  );

  const wikiComposition: WorkspaceCompositionId = useMemo(
    () => (isEntityWorkspacePage(entitySurfaceProfile.key) ? 'entity' : 'codex'),
    [entitySurfaceProfile.key],
  );

  const showEntityDetailTabs = Boolean(entitySurfaceProfile.structureTab);

  const treePage = findWikiNode(tree, pageId);
  const resolvedTitle = treePage?.title ?? pageData?.title ?? '';
  const resolvedVisibility = treePage?.visibility ?? pageData?.visibility ?? 'Public';
  const isTagsHub = resolvedTitle ? isTagsHubPage(resolvedTitle) : false;
  const indexCategoryTitle = useMemo(
    () =>
      pageId && !isTagsHub
        ? resolveCategoryIndexTitleForPage(pageId, flatPages, pageIdByTitle)
        : null,
    [pageId, isTagsHub, flatPages, pageIdByTitle],
  );
  const isIndexCategory = Boolean(indexCategoryTitle);
  const isQuestHubCategory =
    parseSystemCategoryKey(treePage?.metadata ?? pageData?.metadata) ===
    SYSTEM_CATEGORY_QUESTS;
  const isThreadHubCategory =
    parseSystemCategoryKey(treePage?.metadata ?? pageData?.metadata) ===
    SYSTEM_CATEGORY_NARRATIVE_THREADS;
  const isPartyHubCategory =
    parseSystemCategoryKey(treePage?.metadata ?? pageData?.metadata) ===
    SYSTEM_CATEGORY_PARTY;
  const isDowntimeHubCategory = isDowntimeHubCategoryPage(
    treePage?.metadata ?? pageData?.metadata,
  );
  const isThreadDetailPage =
    Boolean(pageId) &&
    !isThreadHubCategory &&
    isPageUnderNarrativeThreadsCategory(pageId, flatPages);
  const tagsDirty = !wikiTagsInputsEqual(pageTags, savedPageTags);

  const { viewerContext, isElevated } = useCampaignActor();
  const isDMUser = isElevated();

  const codexDiagnosticsEnabled = Boolean(pageId && pageData && !isTagsHub);
  const pageCodexDiagnostics = usePageCodexDiagnostics(
    campaignHandle,
    pageId,
    codexDiagnosticsEnabled,
    isDMUser,
  );

  const entityCategoryKey = useMemo(() => {
    const raw =
      pageData?.metadata && typeof pageData.metadata === 'object'
        ? (pageData.metadata as Record<string, unknown>).entityCategory
        : undefined;
    return normalizeEntityCategoryKey(
      typeof raw === 'string' ? raw : entitySurfaceProfile.key,
    );
  }, [pageData?.metadata, entitySurfaceProfile.key]);

  const canTrackNarrativeThread =
    isDMUser &&
    Boolean(pageId) &&
    !isTagsHub &&
    !isIndexCategory &&
    !isThreadHubCategory &&
    !isQuestHubCategory &&
    !isPartyHubCategory &&
    !isDowntimeHubCategory &&
    entitySurfaceProfile.key !== 'thread' &&
    !isPageUnderNarrativeThreadsCategory(pageId, flatPages);

  const readerFirstLayout =
    !isDMUser && entityWorkspaceReaderFirst(entitySurfaceProfile.key);

  const showSectionSubviews = Boolean(
    pageData &&
      !isTagsHub &&
      !isIndexCategory &&
      pageData.templateType !== 'SESSION_NOTE' &&
      !(readerFirstLayout && showEntityDetailTabs),
  );

  useEffect(() => {
    if (!entityPageShell.isValidSubview(pageSubview, isDMUser)) {
      setPageSubview('overview');
    }
  }, [pageSubview, entityPageShell, isDMUser]);

  const canDeleteWikiPage =
    isDMUser &&
    !isTagsHub &&
    !isIndexCategory &&
    pageData?.templateType !== 'SESSION_NOTE' &&
    !isReservedSystemWikiPage({
      title: resolvedTitle,
      templateType: pageData?.templateType,
    });

  const canInitializeEventLore = wikiCan(CampaignCapabilities.CHRONOLOGY_EDIT);

  const isSessionNotePage = pageData?.templateType === 'SESSION_NOTE';
  const sessionNoteMeta = isSessionNotePage
    ? parseSessionNoteMetadata(pageData?.metadata)
    : null;
  const sessionTimelineRedirectId = sessionNoteMeta?.timelinePointId ?? null;

  const {
    data: sessionCombined,
    loading: sessionCombinedLoading,
    refetch: refetchSessionCombined,
  } = useSessionCombined(campaignHandle, {
    pageId:
      isSessionNotePage && !sessionTimelineRedirectId ? pageId : undefined,
  });

  const [pageVisibility, setPageVisibility] = useState(resolvedVisibility);

  useEffect(() => {
    setPageVisibility(resolvedVisibility);
  }, [resolvedVisibility]);

  useEffect(() => {
    const mapAssetId = pageData?.mapAssetId;
    if (!mapAssetId) {
      setEmbeddedMap(null);
      setEmbeddedCampaignMaps([]);
      return;
    }
    let cancelled = false;
    const mapPromise = fetchCampaignMap(campaignHandle, mapAssetId);
    const mapsPromise =
      isDMUser
        ? fetchCampaignMaps(campaignHandle).then((data) => data.maps)
        : Promise.resolve([]);
    Promise.all([mapPromise, mapsPromise])
      .then(([detail, maps]) => {
        if (!cancelled) {
          setEmbeddedMap(detail.map);
          setEmbeddedCampaignMaps(maps);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmbeddedMap(null);
          setEmbeddedCampaignMaps([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, pageData?.mapAssetId, isDMUser]);

  const isPinned = useMemo(
    () => pinnedShortcuts.some((pin) => pin.pageId === pageId),
    [pinnedShortcuts, pageId],
  );

  const displayTitle = useMemo(
    () => getPageDisplayTitle(resolvedTitle, pageData?.metadata),
    [resolvedTitle, pageData?.metadata],
  );

  const pageById = useMemo(
    () => buildWikiPageLookup(flatPages),
    [flatPages],
  );

  const wikiBreadcrumbs = useMemo(() => {
    if (!pageData) return [];
    const parentChain = resolveWikiParentChain(
      pageId,
      pageData.parent,
      pageById,
    );
    const currentTitle = pageById.get(pageId)?.title ?? displayTitle;
    const trail = buildWikiNavBreadcrumbs(parentChain, {
      id: pageId,
      title: currentTitle,
    });
    return trail;
  }, [pageData, pageId, displayTitle, pageById]);

  const professionSubtitle = useMemo(() => {
    if (entitySurfaceProfile.key === 'character') {
      const meta = parseCharacterMetadata(pageData?.metadata);
      return meta.profession?.trim() ?? '';
    }
    return getInfoboxFieldValue(blocks, 'Profession');
  }, [blocks, pageData?.metadata, entitySurfaceProfile.key]);

  const knownForSubtitle = useMemo(() => {
    if (entitySurfaceProfile.key === 'character') {
      return parseCharacterMetadata(pageData?.metadata).knownFor?.trim() ?? '';
    }
    return '';
  }, [pageData?.metadata, entitySurfaceProfile.key]);

  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const [interpretiveSummary, setInterpretiveSummary] =
    useState<InterpretiveSummaryResponse | null>(null);

  const viewDateParam = searchParams.get('viewDate');
  const viewDateForLore = useMemo(() => {
    if (!viewDateParam?.trim()) return null;
    try {
      return normalizeChronologyDate(JSON.parse(viewDateParam) as unknown);
    } catch {
      return null;
    }
  }, [viewDateParam]);

  const interpretiveSummaryDateKey =
    viewDateForLore != null
      ? chronologyDateKey(viewDateForLore)
      : chronologyDateKey(campaignNow);

  useEffect(() => {
    if (!pageId || isEventLorePageId(pageId)) {
      setInterpretiveSummary(null);
      return;
    }
    const viewDate = viewDateForLore ?? campaignNow;
    let cancelled = false;
    void fetchInterpretiveSummary(campaignHandle, pageId, viewDate)
      .then((summary) => {
        if (!cancelled) setInterpretiveSummary(summary);
      })
      .catch(() => {
        if (!cancelled) setInterpretiveSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, pageId, interpretiveSummaryDateKey]);

  const characterSnapshots = useMemo(
    () =>
      flatPages.map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata,
      })),
    [flatPages],
  );

  const characterIdentityProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'character' || !pageId) return null;
    return buildCharacterIdentityProjection(pageId, characterSnapshots, campaignNow);
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots, campaignNow]);

  const organizationIdentityProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'organization' || !pageId) return null;
    return buildOrganizationIdentityProjection(pageId, characterSnapshots);
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots]);

  const familyIdentityProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'family' || !pageId) return null;
    return buildFamilyIdentityProjection(pageId, characterSnapshots);
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots]);

  const bestiaryIdentityProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'bestiary' || !pageId) return null;
    return buildBestiaryIdentityProjection(pageId, characterSnapshots);
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots]);

  const bestiaryIntelProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'bestiary' || !pageData) return null;
    return buildBestiaryIntelProjection(
      pageData.metadata,
      pageCodexDiagnostics.discovery,
      isDMUser,
    );
  }, [
    entitySurfaceProfile.identityStrip,
    pageData,
    pageCodexDiagnostics.discovery,
    isDMUser,
  ]);

  const ancestryIdentityProjection = useMemo(() => {
    if (entitySurfaceProfile.identityStrip !== 'ancestry' || !pageId) return null;
    return buildAncestryIdentityProjection(pageId, characterSnapshots);
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots]);

  const pass2IdentityProjection = useMemo(() => {
    const strip = entitySurfaceProfile.identityStrip;
    if (!pageId || !strip) return null;
    switch (strip as SurfaceProfileKey) {
      case 'ancestry':
        return buildAncestryIdentityProjection(pageId, characterSnapshots);
      case 'object':
        return buildObjectIdentityProjection(pageId, characterSnapshots);
      case 'location':
        return buildLocationIdentityProjection(pageId, characterSnapshots);
      case 'rule-resource':
        return buildRuleResourceIdentityProjection(pageId, characterSnapshots);
      default:
        return null;
    }
  }, [entitySurfaceProfile.identityStrip, pageId, characterSnapshots]);

  const hasHeroBlock = useMemo(
    () =>
      blocks.some((b) =>
        [
          'entity-hero',
          'entity-org-hero',
          'entity-family-hero',
          'entity-location-hero',
          'entity-bestiary-hero',
          'entity-ancestry-hero',
        ].includes(b.type),
      ),
    [blocks],
  );

  const displayBlocks = useMemo(
    () =>
      entityPageShell.filterBlocksForSubview(blocks, pageSubview, isDMUser),
    [blocks, pageSubview, isDMUser, entityPageShell],
  );

  const showLoreSemanticSections = useMemo(() => {
    if (entityPageShell.key === 'bestiary') {
      return pageSubview === 'lore' && showSectionSubviews;
    }
    if (entityPageShell.key === 'character') {
      return pageSubview === 'biography' && showSectionSubviews;
    }
    return shouldShowLoreSemanticSections(
      pageSubview as WikiPageSubview,
      showSectionSubviews,
      entityDetailTab,
    );
  }, [pageSubview, showSectionSubviews, entityDetailTab, entityPageShell.key]);

  const loreSemanticPanel = useMemo(() => {
    if (!showLoreSemanticSections || !pageData) return null;
    return (
      <InterpretiveLoreReadSection
        campaignHandle={campaignHandle}
        pageId={pageId}
        flatPages={flatPages}
        memberRole={wikiCampaign?.role ?? campaign?.role ?? undefined}
        allowPlayerChronologyManagement={
          wikiCampaign?.allowPlayerChronologyManagement ??
          campaign?.allowPlayerChronologyManagement ??
          false
        }
      />
    );
  }, [
    showLoreSemanticSections,
    pageData,
    campaignHandle,
    pageId,
    flatPages,
    wikiCampaign?.role,
    wikiCampaign?.allowPlayerChronologyManagement,
    campaign?.role,
    campaign?.allowPlayerChronologyManagement,
  ]);

  const widgetOptions = useMemo(
    () =>
      getWikiWidgetOptions(templateType, {
        appearanceMode: entitySurfaceProfile.appearanceMode,
        surfaceKey: entitySurfaceProfile.key,
      }),
    [templateType, entitySurfaceProfile.appearanceMode, entitySurfaceProfile.key],
  );

  function handleFocusBlock(blockType: string, field?: string) {
    setFocusBlockType(blockType);
    if (field) setInspectorFocusField(field);
    const subview = entityPageShell.subviewForBlockType(
      blockType as WikiPageBlock['type'],
    );
    setPageSubview(subview);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-codex-block-type="${blockType}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  useEffect(() => {
    const openSettings = searchParams.get('openSettings') === '1';
    const openCodex =
      searchParams.get('openCodex') === '1' ||
      searchParams.get('openInspector') === '1';
    const focusField = searchParams.get('focusField');
    const focusBlock = searchParams.get('focusBlock');
    if (openSettings) {
      setPageSettingsOpen(true);
      if (focusField) setInspectorFocusField(focusField);
      if (focusBlock) setFocusBlockType(focusBlock);
      setIsEditingPage(true);
      setSearchParams({}, { replace: true });
      return;
    }
    if (openCodex) {
      setPendingCodexSubview(true);
      if (focusField) setInspectorFocusField(focusField);
      if (focusBlock) setFocusBlockType(focusBlock);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (pendingCodexSubview && pageData) {
      setPageSubview(
        resolveSubviewFromCodexDeepLink(pageCodexDiagnostics.railVariant, isDMUser),
      );
      setPendingCodexSubview(false);
    }
  }, [pendingCodexSubview, pageData, pageCodexDiagnostics.railVariant, isDMUser]);

  useEffect(() => {
    if (
      pageData?.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE &&
      searchParams.get('view') === 'lore' &&
      isDMUser
    ) {
      setIsEditingPage(true);
    }
  }, [pageData?.templateType, searchParams, isDMUser]);

  useEffect(() => {
    setIsEditingPage(false);
    setInspectorFocusField(null);
    setFocusBlockType(null);
    setShowGridLines(false);
    setPageSettingsOpen(false);
    setIsSearchOpen(false);
    setBlockDisplayState(DEFAULT_BLOCK_DISPLAY_STATE);
    setPageFetchState('loading');
    setPageData(null);
  }, [pageId, campaignHandle]);

  function applyBlocksUpdate(updater: BlocksUpdater) {
    setBlocks((previous) =>
      typeof updater === 'function' ? updater(previous) : updater,
    );
    setIsDirty(true);
  }

  function handleAddWidget(type: WikiPageBlock['type']) {
    setBlocks((previous) => {
      const firstEmpty = getEmptyGridSlots(previous)[0];
      const x = firstEmpty?.x ?? 0;
      const y = firstEmpty?.y ?? 0;
      return [...previous, createWikiBlock(type, x, y)];
    });
    setIsDirty(true);
  }

  useEffect(() => {
    if (!campaignHandle) return;
    fetchCampaign(campaignHandle)
      .then(setCampaign)
      .catch(() => setCampaign(null));
  }, [campaignHandle]);

  useEffect(() => {
    if (!campaignHandle) return;
    if (!pageId) {
      if (params.pathKey && !loading) {
        setPageFetchState('error');
        setPageData(null);
      }
      return;
    }

    async function loadPage() {
      setPageFetchState('loading');
      try {
        const result = await fetchWikiPageLayout(campaignHandle, pageId);
        setPageData(result);
        if (
          params.pathKey &&
          result.pathKey &&
          result.pathKey !== params.pathKey &&
          result.workspace
        ) {
          const canonicalPage = flatPages.find((page) => page.id === result.id);
          const canonical = canonicalPage
            ? resolveCanonicalPagePath(campaignHandle, canonicalPage, flatPages)
            : campaignWikiPath(campaignHandle, result.id, flatPages);
          navigate(`${canonical}${location.search}`, { replace: true });
        }
        const serverBlocks = result.blocks ?? [];
        const template = result.templateType ?? 'DEFAULT';
        const profile = resolveEntitySurfaceProfile({
          pageId,
          templateType: template,
          metadata: result.metadata,
          flatPages,
        });
        let nextBlocks = resolveWikiPageBlocks(
          serverBlocks,
          pageId,
          profile.key,
        );
        nextBlocks = resolveSemanticPageBlocks(profile.key, nextBlocks);
        nextBlocks = ensureAppearanceBlock(nextBlocks, profile.appearanceMode);
        const shell = resolveEntityPageShell(profile.key);
        if (shell) {
          nextBlocks = ensureSystemBlocks(shell, nextBlocks);
        }
        setBlocks(nextBlocks);
        setTemplateType(result.templateType ?? 'DEFAULT');
        const loadedTags = tagsFromPayload(result.tags);
        setPageTags(loadedTags);
        setSavedPageTags(loadedTags);
        setIsDirty(false);
        setPageFetchState('ready');
        if (shouldCreateDraft) {
          setSearchParams({}, { replace: true });
        }
      } catch {
        if (shouldCreateDraft && canInitializeEventLore) {
          setPageFetchState('creating');
          try {
            const eventsParentId = resolveEventsWikiParentId(flatPages);
            await createWikiPage(campaignHandle, {
              id: pageId,
              title: prefillTitle || 'Event Lore',
              parentId: eventsParentId,
              templateType: 'DEFAULT',
            });
            await refresh();
            setSearchParams({}, { replace: true });
            const created = await fetchWikiPageLayout(campaignHandle, pageId);
            setPageData(created);
            const serverBlocks = created.blocks ?? [];
            const template = created.templateType ?? 'DEFAULT';
            const profile = resolveEntitySurfaceProfile({
              pageId,
              templateType: template,
              metadata: created.metadata,
              flatPages,
            });
            let nextBlocks = resolveWikiPageBlocks(
              serverBlocks,
              pageId,
              profile.key,
            );
            nextBlocks = resolveSemanticPageBlocks(profile.key, nextBlocks);
            nextBlocks = ensureAppearanceBlock(nextBlocks, profile.appearanceMode);
            setBlocks(nextBlocks);
            setTemplateType(created.templateType ?? 'DEFAULT');
            const loadedTags = tagsFromPayload(created.tags);
            setPageTags(loadedTags);
            setSavedPageTags(loadedTags);
            setIsDirty(false);
            setPageFetchState('ready');
            setIsEditingPage(true);
            return;
          } catch (createError) {
            console.error('Failed to initialize event lore page:', createError);
          }
        }
        setPageData(null);
        setPageFetchState('error');
      }
    }

    void loadPage();
  }, [
    campaignHandle,
    pageId,
    params.pathKey,
    loading,
    shouldCreateDraft,
    prefillTitle,
    canInitializeEventLore,
    flatPages,
    location.search,
    navigate,
    refresh,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!isDMUser || !campaignHandle) return;
    fetchCampaignTags(campaignHandle)
      .then(setAllCampaignTags)
      .catch(() => setAllCampaignTags([]));
  }, [isDMUser, campaignHandle]);

  async function handleSaveTags() {
    if (!campaignHandle || !pageId) return;
    setIsSaving(true);
    try {
      const updated = await updateWikiPage(campaignHandle, pageId, {
        tags: pageTags,
      });
      const nextTags = tagsFromPayload(updated.tags);
      setPageTags(nextTags);
      setSavedPageTags(nextTags);
      setPageData((prev) =>
        prev ? { ...prev, tags: updated.tags ?? [] } : prev,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save tags');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveLayout(options?: { manageSaving?: boolean }) {
    if (!campaignHandle || !pageId) return;
    const manageSaving = options?.manageSaving !== false;
    if (manageSaving) setIsSaving(true);
    try {
      if (tagsDirty) {
        await handleSaveTags();
      }
      const toSave = stripHeightsForPersist(blocks);
      const saved = await saveWikiPageLayout(
        campaignHandle,
        pageId,
        toSave,
        templateType,
      );
      setBlocks(saved.blocks);
      setTemplateType(saved.templateType);
      setIsDirty(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save page');
      throw err;
    } finally {
      if (manageSaving) setIsSaving(false);
    }
  }

  const draftRegistryRef = useRef<PageBlockDraftRegistryValue | null>(null);
  const bindDraftRegistry = useCallback((registry: PageBlockDraftRegistryValue | null) => {
    draftRegistryRef.current = registry;
  }, []);

  async function flushSemanticDrafts() {
    const registry = draftRegistryRef.current;
    if (!registry?.hasSemanticDirty) return;
    const failures = await registry.flushAll();
    if (failures.length > 0) {
      window.alert(
        `Could not save ${failures.length} block(s). Check your connection and try Save again.`,
      );
    }
  }

  async function handleSavePage() {
    setIsSaving(true);
    try {
      if (isDirty) {
        await handleSaveLayout({ manageSaving: false });
      }
      await flushSemanticDrafts();
    } catch {
      /* layout alert already shown */
    } finally {
      setIsSaving(false);
    }
  }

  function handleTogglePin() {
    void (async () => {
      try {
        await togglePinnedShortcut(campaignHandle, pageId);
        await refresh();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Unable to update pin',
        );
      }
    })();
  }

  async function handleVisibilityChange(
    next: 'Public' | 'Party' | 'DM_Only',
  ) {
    setPageVisibility(next);
    try {
      const result = await updateWikiPageVisibility(campaignHandle, pageId, next);
      if (
        next === 'DM_Only' &&
        typeof result.linkedMapObjectCount === 'number' &&
        result.linkedMapObjectCount > 0
      ) {
        window.alert(
          `Changing this page to DM Only will hide ${result.linkedMapObjectCount} connected map object(s) from players.`,
        );
      }
      await refresh();
    } catch (err) {
      setPageVisibility(resolvedVisibility);
      window.alert(
        err instanceof Error ? err.message : 'Unable to update visibility',
      );
    }
  }

  async function handleToggleEditPage() {
    if (isEditingPage) {
      const hasSemanticDirty = draftRegistryRef.current?.hasSemanticDirty ?? false;
      if (isDirty || hasSemanticDirty) {
        setIsSaving(true);
        try {
          if (isDirty) {
            await handleSaveLayout({ manageSaving: false });
          }
          await flushSemanticDrafts();
        } catch {
          /* alerts shown */
        } finally {
          setIsSaving(false);
        }
      }
      setBlockDisplayState(DEFAULT_BLOCK_DISPLAY_STATE);
      setIsEditingPage(false);
      return;
    }
    setShowGridLines(false);
    setIsEditingPage(true);
  }

  function handleJumpToTab(subviewId: EntitySubviewId, focus?: string) {
    setPageSubview(subviewId);
    if (focus) setInspectorFocusField(focus);
    setIsEditingPage(true);
  }

  function handleJumpToContinuity(blockId: string) {
    if (pageCodexDiagnostics.summary.hasAny) {
      setPageSubview('continuity');
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-codex-block-id="${blockId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function applyWorkspaceOrchestration(mode: WorkspaceMode) {
    const profile = getWorkspaceOrchestration(mode);
    const proseId = findPrimaryProseBlockId(blocks);
    if (profile.autoExpandProseBlock && proseId) {
      setBlockDisplayState({
        activeBlockId: proseId,
        scale: profile.defaultProseDisplayScale,
      });
    } else if (mode === 'balanced' || mode === 'expanded') {
      setBlockDisplayState(DEFAULT_BLOCK_DISPLAY_STATE);
    }
  }

  useEffect(() => {
    workspaceOrchestrationKeyRef.current = null;
  }, [pageId]);

  useEffect(() => {
    if (!pageData || blocks.length === 0) return;
    const key = `${pageId}:${workspaceMode}`;
    if (workspaceOrchestrationKeyRef.current === key) return;
    workspaceOrchestrationKeyRef.current = key;
    applyWorkspaceOrchestration(workspaceMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial orchestration per page/mode
  }, [pageData, blocks.length, pageId, workspaceMode]);

  function handleToggleSearch() {
    setIsSearchOpen((prev) => !prev);
  }

  function openEditFromStrip(fieldKey: string) {
    setInspectorFocusField(fieldKey);
    if (fieldKey.startsWith('appearance.')) {
      setFocusBlockType('entity-appearance');
      setPageSubview('appearance');
    } else {
      setFocusBlockType('entity-hero');
      setPageSubview('overview');
    }
    setIsEditingPage(true);
  }

  const continuityPanel = useMemo(() => {
    if (pageSubview !== 'continuity' || !isDMUser || !pageData) return null;
    return (
      <div className="mb-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          World consistency
        </h2>
        <WikiContinuityPanel
          campaignHandle={campaignHandle}
          currentPageId={pageId}
          pageTitle={resolvedTitle}
          compact={isEditingPage}
          sharedIssues={pageCodexDiagnostics.issues}
          sharedUnresolved={pageCodexDiagnostics.unresolved}
          sharedLoading={pageCodexDiagnostics.loading}
          onSharedReload={pageCodexDiagnostics.reload}
        />
      </div>
    );
  }, [
    pageSubview,
    isDMUser,
    pageData,
    campaignHandle,
    pageId,
    resolvedTitle,
    isEditingPage,
    pageCodexDiagnostics.issues,
    pageCodexDiagnostics.unresolved,
    pageCodexDiagnostics.loading,
    pageCodexDiagnostics.reload,
  ]);

  const wikiPageRendererSlot = useMemo(() => {
    if (!pageData) return null;
    return (
      <WikiPageRendererSlot
        blocks={displayBlocks}
        templateType={templateType}
        isEditingPage={isEditingPage}
        showGridLines={showGridLines}
        onShowGridLinesChange={setShowGridLines}
        onBlocksChange={applyBlocksUpdate}
        blockDisplayState={blockDisplayState}
        onBlockDisplayChange={setBlockDisplayState}
        memberRole={wikiCampaign?.role ?? campaign?.role ?? undefined}
        allowPlayerChronologyManagement={
          wikiCampaign?.allowPlayerChronologyManagement ??
          campaign?.allowPlayerChronologyManagement ??
          false
        }
        isDirty={isDirty}
        isSaving={isSaving}
        isEventLorePage={isEventLorePageId(pageId)}
        readerFirstLayout={
          readerFirstLayout &&
          entityDetailTab === 'lore' &&
          isEntityWorkspacePage(entitySurfaceProfile.key)
        }
        pageMetadata={pageData.metadata}
        surfaceProfileKey={entitySurfaceProfile.key}
        appearanceCapabilities={entitySurfaceProfile.appearanceCapabilities}
        workspaceMode={workspaceMode}
        campaignHandle={campaignHandle}
        pageId={pageId}
        flatPages={flatPages}
        onMetadataSaved={(next) =>
          setPageData((prev) =>
            prev ? { ...prev, metadata: next as typeof prev.metadata } : prev,
          )
        }
        inspectorFocusField={inspectorFocusField}
        characterIdentityProjection={characterIdentityProjection}
        organizationIdentityProjection={organizationIdentityProjection}
        familyIdentityProjection={familyIdentityProjection}
        bestiaryIdentityProjection={bestiaryIdentityProjection}
        ancestryIdentityProjection={ancestryIdentityProjection}
        headquartersId={parseOrganizationMetadata(pageData.metadata).headquartersId}
        seatLocationId={parseFamilyMetadata(pageData.metadata).seatLocationId}
        pageVisibility={pageVisibility}
        pageTags={pageTags}
        allCampaignTags={allCampaignTags}
        parentId={pageData.parentId}
        parentChain={pageData.parent}
        onVisibilityChange={handleVisibilityChange}
        onParentChange={(next) => {
          setPageData((prev) =>
            prev
              ? {
                  ...prev,
                  parentId: next.parentId,
                  parent: next.parent ?? null,
                }
              : prev,
          );
        }}
        onTreeRefresh={refresh}
        onPageTagsChange={setPageTags}
        onJumpToContinuity={isDMUser ? handleJumpToContinuity : undefined}
        entityPageShell={entityPageShell}
      />
    );
  }, [
    pageData,
    displayBlocks,
    templateType,
    isEditingPage,
    showGridLines,
    blockDisplayState,
    isDirty,
    isSaving,
    pageId,
    readerFirstLayout,
    entityDetailTab,
    entitySurfaceProfile,
    workspaceMode,
    campaignHandle,
    flatPages,
    inspectorFocusField,
    characterIdentityProjection,
    organizationIdentityProjection,
    familyIdentityProjection,
    bestiaryIdentityProjection,
    ancestryIdentityProjection,
    pageVisibility,
    pageTags,
    allCampaignTags,
    isDMUser,
    entityPageShell,
    wikiCampaign?.role,
    wikiCampaign?.allowPlayerChronologyManagement,
    campaign?.role,
    campaign?.allowPlayerChronologyManagement,
    refresh,
  ]);

  const shellViewCommonProps = useMemo(
    () => ({
      campaignHandle,
      pageId,
      displayTitle,
      templateType,
      pageData: pageData!,
      blocks,
      displayBlocks,
      pageSubview,
      onSubviewChange: setPageSubview,
      isDMUser,
      isEditingPage,
      showGridLines,
      pageVisibility,
      onVisibilityChange: handleVisibilityChange,
      characterIdentityProjection,
      discovery: pageCodexDiagnostics.discovery,
      flatPages,
      onEditFromStrip: openEditFromStrip,
      onJumpToTab: handleJumpToTab,
      onBlocksChange: applyBlocksUpdate,
      continuityPanel,
      wikiPageRenderer: wikiPageRendererSlot,
      loreSemanticPanel,
    }),
    [
      campaignHandle,
      pageId,
      displayTitle,
      templateType,
      pageData,
      blocks,
      displayBlocks,
      pageSubview,
      isDMUser,
      isEditingPage,
      showGridLines,
      pageVisibility,
      characterIdentityProjection,
      pageCodexDiagnostics.discovery,
      flatPages,
      continuityPanel,
      wikiPageRendererSlot,
      loreSemanticPanel,
    ],
  );

  function renderWikiPageBody() {
    if (!pageData || !wikiPageRendererSlot) {
      return <LoadingSpinner label="Loading page…" />;
    }

    const metadataSaved = (next: Record<string, unknown>) =>
      setPageData((prev) =>
        prev ? { ...prev, metadata: next as typeof prev.metadata } : prev,
      );

    const shellBase = {
      ...shellViewCommonProps,
      pageData,
      inspectorFocusField,
      onMetadataSaved: metadataSaved,
    };

    if (
      entitySurfaceProfile.key === 'bestiary' &&
      bestiaryIntelProjection
    ) {
      return (
        <BestiaryPageShellView
          {...shellBase}
          characterIdentityProjection={null}
          bestiaryIdentityProjection={bestiaryIdentityProjection}
          bestiaryIntelProjection={bestiaryIntelProjection}
          onMetadataSaved={metadataSaved}
          inspectorFocusField={inspectorFocusField}
        />
      );
    }

    if (entitySurfaceProfile.key === 'character') {
      return (
        <CharacterPageShellView
          {...shellBase}
          onMetadataSaved={metadataSaved}
        />
      );
    }

    if (entitySurfaceProfile.key === 'ancestry') {
      return (
        <AncestryPageShellView
          {...shellBase}
          characterIdentityProjection={null}
          ancestryIdentityProjection={ancestryIdentityProjection}
          onMetadataSaved={metadataSaved}
        />
      );
    }

    if (entitySurfaceProfile.key === 'organization') {
      return (
        <OrganizationPageShellView
          {...shellBase}
          characterIdentityProjection={null}
          organizationIdentityProjection={organizationIdentityProjection}
          onMetadataSaved={metadataSaved}
        />
      );
    }

    if (isEntityWorkspacePage(entitySurfaceProfile.key)) {
      return (
        <EntityWorkspaceSurface
          campaignHandle={campaignHandle}
          pageId={pageId}
          displayTitle={displayTitle}
          templateType={templateType}
          entitySurfaceProfile={entitySurfaceProfile}
          entityDetailTab={entityDetailTab}
          onEntityDetailTabChange={setEntityDetailTab}
          codexCognitiveMode="reading"
          hasHeroBlock={hasHeroBlock}
          characterIdentityProjection={characterIdentityProjection}
          organizationIdentityProjection={organizationIdentityProjection}
          familyIdentityProjection={familyIdentityProjection}
          bestiaryIdentityProjection={bestiaryIdentityProjection}
          pass2IdentityProjection={pass2IdentityProjection}
          interpretiveSummary={interpretiveSummary}
          professionSubtitle={professionSubtitle}
          knownForSubtitle={knownForSubtitle}
          players={players}
          flatPages={flatPages}
          onEditFromStrip={openEditFromStrip}
          headquartersId={parseOrganizationMetadata(pageData.metadata).headquartersId}
          seatLocationId={parseFamilyMetadata(pageData.metadata).seatLocationId}
          canTrackNarrativeThread={canTrackNarrativeThread}
          onTrackNarrativeThread={() => setIsThreadCreateOpen(true)}
          embeddedMap={embeddedMap}
          embeddedCampaignMaps={embeddedCampaignMaps}
          pageData={pageData}
          readerFirstLayout={readerFirstLayout}
          memberRole={wikiCampaign?.role ?? campaign?.role ?? undefined}
          allowPlayerChronologyManagement={
            wikiCampaign?.allowPlayerChronologyManagement ??
            campaign?.allowPlayerChronologyManagement ??
            false
          }
          hasEditorSlot={hasEditorSlot && Boolean(wikiCampaign)}
          editorSlot={
            wikiCampaign ? (
              <PluginSlotHost
                slot={PluginUiSlots.EDITOR}
                context={{
                  campaignId: wikiCampaign.id,
                  campaignHandle: wikiCampaign.handle,
                  config: {},
                }}
                className="mb-4"
              />
            ) : null
          }
          continuityPanel={continuityPanel}
          loreSemanticPanel={loreSemanticPanel}
          wikiPageRenderer={wikiPageRendererSlot}
          loadingFallback={<LoadingSpinner label="Loading page…" />}
        />
      );
    }

    return (
      <GenericWikiPageShellView
        {...shellBase}
        profileKey={entitySurfaceProfile.key}
        narrativeStatus={pageData.narrativeStatus}
        interpretiveSummary={interpretiveSummary}
        professionSubtitle={professionSubtitle}
        knownForSubtitle={knownForSubtitle}
        players={players}
        eventConsequencesPanel={
          isEventLorePageId(pageId) && canInitializeEventLore ? (
            <EventConsequencesEditor
              campaignHandle={campaignHandle}
              calendarEventId={pageId.slice('event-'.length)}
              flatPages={flatPages}
              loreBlocks={displayBlocks}
            />
          ) : null
        }
      />
    );
  }

  const isHavenOverviewView =
    pageData?.templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE &&
    searchParams.get('view') !== 'lore';

  const isProjectOverviewView =
    pageData?.templateType === DOWNTIME_PROJECT_TEMPLATE_TYPE &&
    searchParams.get('view') !== 'lore';

  if (!loading && pageId && pageData && isHavenOverviewView) {
    return (
      <HavenWikiPageView
        campaignHandle={campaignHandle}
        wikiPageId={pageId}
        pageTitle={pageData.title}
        flatPages={flatPages}
      />
    );
  }

  if (!loading && pageId && pageData && isProjectOverviewView) {
    return (
      <ProjectWikiPageView
        campaignHandle={campaignHandle}
        wikiPageId={pageId}
        pageTitle={pageData.title}
        flatPages={flatPages}
      />
    );
  }

  const routeTreePage = flatPages.find((entry) => entry.id === pageId);

  if (
    !loading &&
    routeTreePage &&
    shouldBlockFreeformRoute(location.pathname, campaignHandle, routeTreePage)
  ) {
    return (
      <MascotErrorPanel
        code={404}
        title="Page not found"
        description="This page belongs to a structured workspace, not freeform pages."
        action={
          <button
            type="button"
            onClick={() => navigate(campaignDashboardPath(campaignHandle))}
            className="text-sm text-primary hover:underline"
          >
            Back to campaign home
          </button>
        }
      />
    );
  }

  if (
    ((!pageId && loading) ||
      pageFetchState === 'loading' ||
      pageFetchState === 'creating') &&
    !pageData
  ) {
    return (
      <LoadingSpinner
        label={pageFetchState === 'creating' ? 'Initializing lore page…' : 'Loading page…'}
      />
    );
  }

  if (pageFetchState === 'error' || !pageData) {
    return (
      <MascotErrorPanel
        code={404}
        title="Page not found"
        description="This wiki page may have been removed or you may not have access."
        action={
          <button
            type="button"
            onClick={() => navigate(campaignDashboardPath(campaignHandle))}
            className="text-sm text-primary hover:underline"
          >
            Back to campaign home
          </button>
        }
      />
    );
  }

  if (pageData.title === 'Dashboard') {
    return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
  }

  if (!isWikiVisibilityVisibleToViewer(resolvedVisibility, viewerContext)) {
    return (
      <MascotErrorPanel
        code={403}
        title="Blåhaj says no."
        description="This wiki page is restricted to DM/Co-DM only."
      />
    );
  }

  if (isTagsHub) {
    const tagId = searchParams.get('tagId');
    return (
      <Navigate
        to={
          tagId
            ? campaignWikiTagsPath(campaignHandle, undefined, tagId)
            : campaignWikiTagsPath(campaignHandle)
        }
        replace
      />
    );
  }

  if (pageData?.templateType === 'SESSION_NOTE') {
    if (sessionTimelineRedirectId) {
      return (
        <Navigate
          to={campaignNotePath(campaignHandle, sessionTimelineRedirectId)}
          replace
        />
      );
    }

    return (
      <SessionNoteEditor
        campaignHandle={campaignHandle}
        pageId={pageId}
        pageData={pageData}
        combined={sessionCombined}
        combinedLoading={sessionCombinedLoading}
        onCombinedRefresh={() => void refetchSessionCombined()}
        timelinePointId={null}
        onPageUpdated={(patch) => {
          setPageData((prev) => (prev ? { ...prev, ...patch } : prev));
        }}
      />
    );
  }

  return (
    <PageBlockDraftRegistryProvider
      enabled={isDMUser && isEditingPage && !isTagsHub}
    >
      <PageBlockDraftRegistryBridge onRegistry={bindDraftRegistry} />
      <WikiWorkspaceShell
        composition={wikiComposition}
        articleClassName="wiki-page-article"
        articleProps={{ 'data-workspace-mode': workspaceMode }}
        style={workspaceModeCssVars(
          workspaceMode,
          resolveReadableMeasureCh(
            'reading',
            codexLayout,
            resolvePageMeasureTier(entitySurfaceProfile.key, templateType),
          ),
        )}
        header={
          <WikiPageEditorHeader
            campaignHandle={campaignHandle}
            crumbs={wikiBreadcrumbs}
            displayTitle={displayTitle}
            profileKey={entitySurfaceProfile.key}
            templateType={templateType}
            showSectionSubviews={showSectionSubviews}
            subviews={entityPageShell.subviews}
            activeSubview={pageSubview}
            onSubviewChange={setPageSubview}
            isDMUser={isDMUser}
            isTagsHub={isTagsHub}
            isLayoutDirty={isDirty}
            isSaving={isSaving}
            onSavePage={handleSavePage}
            isPinned={isPinned}
            isSearchOpen={isSearchOpen}
            isEditingPage={isEditingPage}
            showGridLines={showGridLines}
            canDeleteWikiPage={canDeleteWikiPage}
            widgetOptions={widgetOptions}
            onTogglePin={handleTogglePin}
            onToggleSearch={handleToggleSearch}
            onToggleEditPage={handleToggleEditPage}
            onToggleGridLines={() => setShowGridLines((prev) => !prev)}
            onOpenPageSettings={() => setPageSettingsOpen(true)}
            onAddWidget={handleAddWidget}
            onDeletePage={() => setIsDeleteDialogOpen(true)}
            havenBackLink={
              templateType === DOWNTIME_HAVEN_TEMPLATE_TYPE &&
              searchParams.get('view') === 'lore'
                ? {
                    to: resolveCanonicalPagePath(
                      campaignHandle,
                      flatPages.find((entry) => entry.id === pageId) ?? {
                        id: pageId,
                        title: displayTitle,
                        parentId: pageData?.parentId ?? null,
                        templateType,
                        metadata: pageData?.metadata,
                      },
                      flatPages,
                    ),
                    label: '← Back to haven overview',
                  }
                : null
            }
          />
        }
      >
        {renderWikiPageBody()}
        {isThreadDetailPage && pageId ? (
          <ThreadHistoryPanel
            campaignHandle={campaignHandle}
            threadPageId={pageId}
          />
        ) : null}
      </WikiWorkspaceShell>

      {isDeleteDialogOpen && (
        <WikiPageDeleteDialog
          open={isDeleteDialogOpen}
          campaignHandle={campaignHandle}
          pageId={pageId}
          pageTitle={displayTitle}
          onClose={() => setIsDeleteDialogOpen(false)}
          onDeleted={async () => {
            await refresh();
            const parentId = pageData?.parentId;
            if (parentId) {
              const parentPage = flatPages.find((entry) => entry.id === parentId);
              navigate(
                parentPage
                  ? resolveCanonicalPagePath(campaignHandle, parentPage, flatPages)
                  : campaignDashboardPath(campaignHandle),
              );
            } else {
              navigate(campaignDashboardPath(campaignHandle));
            }
          }}
        />
      )}

      <PageSettingsDrawer
        open={pageSettingsOpen}
        onClose={() => setPageSettingsOpen(false)}
        campaignHandle={campaignHandle}
        pageId={pageId}
        pageTitle={displayTitle}
        parentId={pageData.parentId}
        parentChain={pageData.parent}
        flatPages={flatPages}
        pageMetadata={pageData.metadata}
        pageVisibility={pageVisibility}
        onVisibilityChange={handleVisibilityChange}
        onParentChange={(next) => {
          setPageData((prev) =>
            prev
              ? {
                  ...prev,
                  parentId: next.parentId,
                  parent: next.parent ?? null,
                }
              : prev,
          );
        }}
        onTreeRefresh={refresh}
        pageTags={pageTags}
        allCampaignTags={allCampaignTags}
        onPageTagsChange={setPageTags}
        onPageTransformed={async (result) => {
          await refresh();
          setPageSettingsOpen(false);
          if (result.workspace && result.pathKey) {
            const segment = workspaceToSegment(
              result.workspace as import('@shared/campaignWorkspace').CampaignWorkspace,
            );
            if (segment) {
              navigate(
                campaignWorkspaceEntityPath(
                  campaignHandle,
                  segment,
                  result.pathKey,
                ),
              );
              return;
            }
          }
          const targetPageId = result.promotedQuestPageId ?? result.pageId;
          navigate(campaignWikiPath(campaignHandle, targetPageId));
        }}
      />

      {canTrackNarrativeThread ? (
        <CreateThreadModal
          open={isThreadCreateOpen}
          campaignHandle={campaignHandle}
          flatPages={flatPages}
          context={{
            launchSurface: 'wiki_page',
            sourcePageId: pageId,
            entityCategoryKey,
            relatedPageIds: [pageId],
          }}
          onClose={() => setIsThreadCreateOpen(false)}
          onCreated={() => {
            setIsThreadCreateOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </PageBlockDraftRegistryProvider>
  );
}

