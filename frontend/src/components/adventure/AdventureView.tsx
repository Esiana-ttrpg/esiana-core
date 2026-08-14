import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';

import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';

import {

  adventureViewHref,

  needsLegacyAdventureRedirect,

  readStoryViewFromSearch,

  readThreadsLensFromSearch,

  type ThreadsLensId,

} from '@/lib/adventureLayout';

import { campaignAdventureHubPath, campaignPath } from '@/lib/campaignPaths';

import { progressionSectionHref } from '@/lib/progressionLayout';

import {

  patchStoryFilters,

  patchStoryView,

  patchThreadsLens,

  readCampaignWorkspaceState,

  type StoryFilterState,

} from '@/lib/workspacePersistence';

import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';

import { WorkspaceActionBar } from '@/components/layout/WorkspaceActionBar';

import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';

import { AdventurePlayerPreviewToggle } from '@/components/adventure/AdventurePlayerPreviewToggle';

import { StoryNarrativeFilterPanel } from '@/components/adventure/StoryNarrativeFilterPanel';

import { StoryViewTabs } from '@/components/adventure/StoryViewTabs';

import { StorySection } from '@/components/adventure/StorySection';

import { ContinuityDrawer } from '@/components/adventure/ContinuityDrawer';



interface AdventureViewProps {

  campaignHandle: string;

  categoryPageId: string;

}



export function AdventureView({ campaignHandle, categoryPageId }: AdventureViewProps) {

  const location = useLocation();

  const navigate = useNavigate();

  const { isDMUser, playerPreview } = useAdventureWorkspace();



  const basePath = campaignAdventureHubPath(campaignHandle);

  const activeView = readStoryViewFromSearch(location.search, campaignHandle);

  const threadsLens = readThreadsLensFromSearch(location.search, campaignHandle);



  const redirectTo = useMemo(() => {

    const legacyRedirect = needsLegacyAdventureRedirect(location.search);

    if (legacyRedirect?.kind === 'progression') {

      return progressionSectionHref(

        campaignPath(campaignHandle, 'progression'),

        legacyRedirect.section as import('@shared/progressionHub').ProgressionSectionId,

        legacyRedirect.view ? { view: legacyRedirect.view } : undefined,

      );

    }

    if (legacyRedirect?.kind === 'adventure') {

      return adventureViewHref(

        basePath,

        legacyRedirect.view ?? 'quests',

        legacyRedirect.threadsLens,

      );

    }

    const searchParams = new URLSearchParams(location.search);

    if (!searchParams.has('view') && !searchParams.has('section')) {

      return adventureViewHref(

        basePath,

        readStoryViewFromSearch(location.search, campaignHandle),

        threadsLens !== 'all' ? threadsLens : undefined,

      );

    }

    return null;

  }, [basePath, campaignHandle, location.search, threadsLens]);



  const [filters, setFilters] = useState<StoryFilterState>(() => {

    const sticky = readCampaignWorkspaceState(campaignHandle).storyFilters;

    return sticky ?? {};

  });

  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  const headerActionsRef = useRef<ReactNode>(null);

  const [sectionData, setSectionData] = useState<AdventureHubPayload | null>(null);

  const [continuityOpen, setContinuityOpen] = useState(false);



  const handleHeaderActionsChange = useCallback((actions: ReactNode | null) => {

    if (Object.is(headerActionsRef.current, actions)) return;

    headerActionsRef.current = actions;

    setHeaderActions(actions);

  }, []);



  useEffect(() => {

    headerActionsRef.current = null;

    setHeaderActions(null);

  }, [activeView, threadsLens]);



  const showRefineToolbar = activeView === 'unresolved';

  const storyRefineActive =

    Boolean(filters.recent) || Boolean((filters.search ?? '').trim().length > 0);



  useEffect(() => {

    patchStoryView(campaignHandle, activeView);

  }, [activeView, campaignHandle]);



  useEffect(() => {

    if (showRefineToolbar) {

      patchStoryFilters(campaignHandle, filters);

    }

  }, [campaignHandle, filters, showRefineToolbar]);



  const loadContinuity = useCallback(async () => {

    if (!isDMUser || playerPreview) {

      setSectionData(null);

      return;

    }

    try {

      const continuityPayload = await fetchAdventureHub(campaignHandle, {

        pageId: categoryPageId,

        section: 'continuity',

      });

      setSectionData({ continuity: continuityPayload.continuity } as AdventureHubPayload);

    } catch {

      setSectionData(null);

    }

  }, [campaignHandle, categoryPageId, isDMUser, playerPreview]);



  useEffect(() => {

    void loadContinuity();

  }, [loadContinuity]);



  const handleFiltersChange = useCallback((patch: Partial<StoryFilterState>) => {

    setFilters((prev) => ({ ...prev, ...patch }));

  }, []);



  const setThreadsLens = useCallback(

    (lens: ThreadsLensId) => {

      patchThreadsLens(campaignHandle, lens);

      navigate(

        adventureViewHref(basePath, 'threads', lens === 'activity' ? 'activity' : undefined),

        { replace: true },

      );

    },

    [basePath, campaignHandle, navigate],

  );



  if (redirectTo) {

    return <Navigate to={redirectTo} replace />;

  }



  const pressureFeed = sectionData?.continuity?.pressureFeed ?? [];

  const issueCount = sectionData?.continuity?.issues?.length ?? 0;

  const pressureCount = pressureFeed.length || issueCount;

  const showContextualRail = isDMUser && !playerPreview;



  const contextualRail = showContextualRail ? (

    <div className="rounded border border-border p-3 text-sm">

      <p className="mb-2 font-medium">Narrative pressure</p>

      <ul className="space-y-1 text-xs text-muted-foreground">

        {pressureFeed.slice(0, 5).map((item) => (

          <li key={item.id}>{item.message}</li>

        ))}

        {pressureCount === 0 ? <li>No active pressure signals.</li> : null}

      </ul>

      <button

        type="button"

        onClick={() => setContinuityOpen(true)}

        className="mt-3 w-full rounded border border-border px-2 py-1 text-xs text-muted hover:border-primary/40 hover:text-foreground"

      >

        View continuity

        {pressureCount > 0 ? ` (${pressureCount})` : ''}

      </button>

    </div>

  ) : undefined;



  return (

    <>

      <CategoryHubShell

        composition="hub"

        title="Adventure Board"

        beforeActions={isDMUser ? <AdventurePlayerPreviewToggle /> : null}

        belowToolbar={

          <StoryViewTabs basePath={basePath} activeView={activeView} isDMUser={isDMUser} />

        }

        actions={

          <>

            {headerActions}

            {showRefineToolbar ? (

              <WorkspaceActionBar

                refine={

                  <CategoryIndexRefinePopover

                    facetDefs={[]}

                    refineState={{}}

                    children={[]}

                    categoryTitle="Adventure"

                    onRefineChange={() => {}}

                    activeCount={storyRefineActive ? 1 : undefined}

                    onResetRefine={() => handleFiltersChange({ search: '', recent: false })}

                    searchQuery={filters.search ?? ''}

                    onSearchChange={(value) => handleFiltersChange({ search: value })}

                    searchPlaceholder="Filter narrative state…"

                    customBody={

                      <StoryNarrativeFilterPanel

                        filters={filters}

                        onFiltersChange={handleFiltersChange}

                      />

                    }

                  />

                }

              />

            ) : null}

          </>

        }

        contextual={contextualRail}

        inlineContextual={showContextualRail}

        catalogGridClass="adventure-shell-body min-h-[560px] w-full min-w-0"

      >

        <StorySection

          campaignHandle={campaignHandle}

          categoryPageId={categoryPageId}

          activeView={activeView}

          threadsLens={threadsLens}

          filters={filters}

          onThreadsLensChange={setThreadsLens}

          onHeaderActionsChange={handleHeaderActionsChange}

        />



        {showContextualRail ? (

          <footer className="mt-4 border-t border-border pt-2 text-xs text-muted-foreground lg:hidden">

            {pressureCount > 0

              ? `${pressureCount} continuity / narrative pressure signal${pressureCount === 1 ? '' : 's'}`

              : 'No unresolved continuity issues detected'}

            <button

              type="button"

              className="ml-2 text-primary hover:underline"

              onClick={() => setContinuityOpen(true)}

            >

              View continuity

            </button>

          </footer>

        ) : null}

      </CategoryHubShell>



      <ContinuityDrawer

        open={continuityOpen}

        onClose={() => setContinuityOpen(false)}

        pressureFeed={pressureFeed}

        issueCount={issueCount}

      />

    </>

  );

}

