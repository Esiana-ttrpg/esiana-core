import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { STORYBOARD_PRESETS } from '@shared/storyboardProjection';
import {
  fetchAdventureHub,
  patchStoryboardLayout,
  type AdventureHubPayload,
} from '@/lib/adventure';
import {
  STORYBOARD_LENSES,
  adventureViewHref,
  readStoryboardLensFromSearch,
  type StoryboardLensId,
} from '@/lib/adventureLayout';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import { patchAdventureStoryboardLens } from '@/lib/workspacePersistence';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SceneEditorCard } from '@/components/progression/SceneEditorCard';
import { StoryboardSection } from '@/components/adventure/StoryboardSection';
import { SceneTimelineSection } from '@/components/adventure/SceneTimelineSection';
import { CreateSceneModal } from '@/components/adventure/CreateSceneModal';
import { useWiki } from '@/contexts/WikiContext';
import type { StoryboardViewV1 } from '@/lib/sceneMetadata';

interface AdventureStoryboardSectionProps {
  campaignHandle: string;
  questsCategoryId: string;
  onHeaderActionsChange?: (actions: ReactNode | null) => void;
}

/** Adventure › Storyboard [GM] — arrange and rapidly create scenes for intended play. */
export function AdventureStoryboardSection({
  campaignHandle,
  questsCategoryId,
  onHeaderActionsChange,
}: AdventureStoryboardSectionProps) {
  const { flatPages, refresh } = useWiki();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = campaignAdventureHubPath(campaignHandle);
  const activeLens = readStoryboardLensFromSearch(location.search, campaignHandle);
  const loadRequestIdRef = useRef(0);

  const [scenesData, setScenesData] = useState<AdventureHubPayload['scenes'] | null>(null);
  const [timelineData, setTimelineData] = useState<AdventureHubPayload['sceneTimeline'] | null>(
    null,
  );
  const [sessionsData, setSessionsData] = useState<AdventureHubPayload['sessions'] | null>(null);
  const [dramaticTopology, setDramaticTopology] = useState<
    import('@shared/dramaticTopology').DramaticTopologyFinding[] | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    patchAdventureStoryboardLens(campaignHandle, activeLens);
  }, [activeLens, campaignHandle]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('view') !== 'storyboard') return;
    const expected = adventureViewHref(basePath, 'storyboard', {
      storyboardLens: activeLens,
    });
    const current = `${basePath}${location.search}`;
    if (current !== expected) {
      navigate(expected, { replace: true });
    }
  }, [activeLens, basePath, location.search, navigate]);

  const loadViewData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      if (activeLens === 'sequence') {
        const [timelinePayload, scenesPayload, sessionsPayload] = await Promise.all([
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'scene-timeline',
          }),
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'scenes',
          }),
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'sessions',
          }),
        ]);
        if (requestId !== loadRequestIdRef.current) return;
        setTimelineData(timelinePayload.sceneTimeline ?? null);
        setScenesData(scenesPayload.scenes ?? null);
        setSessionsData(sessionsPayload.sessions ?? null);
        setDramaticTopology(undefined);
      } else {
        const [scenesPayload, sessionsPayload] = await Promise.all([
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'scenes',
          }),
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'sessions',
          }),
        ]);
        if (requestId !== loadRequestIdRef.current) return;
        setScenesData(scenesPayload.scenes ?? null);
        setSessionsData(sessionsPayload.sessions ?? null);
        setDramaticTopology(
          (scenesPayload.dramaticTopology as import('@shared/dramaticTopology').DramaticTopologyFinding[]) ??
            undefined,
        );
        setTimelineData(null);
      }
    } catch {
      if (requestId !== loadRequestIdRef.current) return;
      setScenesData(null);
      setTimelineData(null);
      setSessionsData(null);
      setDramaticTopology(undefined);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeLens, campaignHandle, questsCategoryId]);

  useEffect(() => {
    void loadViewData();
    return () => {
      // Invalidate in-flight loads when lens/deps change or the section unmounts.
      loadRequestIdRef.current += 1;
    };
  }, [loadViewData, refreshToken]);

  const createButton = useMemo(
    () => (
      <button
        type="button"
        onClick={() => setIsCreateSceneOpen(true)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        <Plus className="size-4" />
        New Scene
      </button>
    ),
    [],
  );

  useEffect(() => {
    if (!onHeaderActionsChange) return;
    onHeaderActionsChange(createButton);
    return () => onHeaderActionsChange(null);
  }, [createButton, onHeaderActionsChange]);

  const scenes = scenesData?.scenes ?? [];
  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const editorScene = selectedSceneId ? sceneById.get(selectedSceneId) ?? null : null;

  const readyScenes =
    (sessionsData?.readyScenes as Array<{ id: string; title: string; sceneStatus?: string }>) ??
    [];

  const currentLayout: StoryboardViewV1 | undefined =
    scenesData?.storyboard?.layout ??
    (sessionsData as { storyboardLayout?: StoryboardViewV1 } | null)?.storyboardLayout;

  async function applyPreset(presetId: string) {
    const preset = STORYBOARD_PRESETS.find((p) => p.id === presetId);
    if (!preset || !currentLayout) return;
    await patchStoryboardLayout(campaignHandle, {
      ...currentLayout,
      lanes: preset.lanes,
      activeMode: preset.activeMode ?? 'session_prep',
    });
    setRefreshToken((token) => token + 1);
  }

  const lensTabs = (
    <div
      className="inline-flex rounded-lg border border-border bg-elevated/40 p-0.5"
      role="tablist"
      aria-label="Storyboard views"
    >
      {STORYBOARD_LENSES.map((lens) => (
        <NavLink
          key={lens.id}
          to={adventureViewHref(basePath, 'storyboard', { storyboardLens: lens.id })}
          role="tab"
          aria-selected={activeLens === lens.id}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          {lens.label}
        </NavLink>
      ))}
    </div>
  );

  const editorPanel =
    editorScene && selectedSceneId ? (
      <div className="mt-4">
        <SceneEditorCard
          key={editorScene.id}
          scene={editorScene}
          campaignHandle={campaignHandle}
          defaultExpanded
          onSaved={() => void loadViewData()}
        />
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {lensTabs}
        {!onHeaderActionsChange ? createButton : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Ready scenes</h3>
        <ul className="flex flex-wrap gap-2">
          {readyScenes.map((scene) => (
            <li key={scene.id}>
              <button
                type="button"
                onClick={() => setSelectedSceneId(scene.id)}
                className="rounded border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-foreground"
              >
                {scene.title}
                {scene.sceneStatus ? (
                  <span className="ml-2 text-xs text-muted-foreground">{scene.sceneStatus}</span>
                ) : null}
              </button>
            </li>
          ))}
          {readyScenes.length === 0 ? (
            <li className="text-sm text-muted-foreground">No scenes marked READY yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Lane presets</h3>
        <p className="text-xs text-muted-foreground">
          Apply act lanes to the storyboard layout — non-destructive scaffolding for arranging
          scenes.
        </p>
        <ul className="flex flex-wrap gap-2">
          {STORYBOARD_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-xs hover:border-primary/40 disabled:opacity-50"
                disabled={!currentLayout}
                title={preset.description}
                onClick={() => void applyPreset(preset.id)}
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {loading ? (
        <LoadingSpinner label="Loading storyboard…" />
      ) : activeLens === 'board' && scenesData ? (
        <>
          <StoryboardSection
            campaignHandle={campaignHandle}
            scenes={scenesData.scenes}
            storyboard={scenesData.storyboard}
            palette={scenesData.palette}
            arcFilterOptions={scenesData.arcFilterOptions ?? []}
            canManage
            dramaticTopology={dramaticTopology ?? []}
            onCreateScene={() => setIsCreateSceneOpen(true)}
            onStoryboardLayoutSaved={() => void loadViewData()}
            embeddedInProgression
            onSelectScene={setSelectedSceneId}
            selectedSceneId={selectedSceneId}
          />
          {editorPanel}
        </>
      ) : activeLens === 'sequence' ? (
        <>
          <SceneTimelineSection
            campaignHandle={campaignHandle}
            data={timelineData ?? undefined}
            canManage
            onScenesChanged={() => void loadViewData()}
            embeddedInProgression
            selectedSceneId={selectedSceneId}
            onSelectScene={setSelectedSceneId}
          />
          {editorPanel}
        </>
      ) : null}

      <CreateSceneModal
        open={isCreateSceneOpen}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
        onClose={() => setIsCreateSceneOpen(false)}
        onCreated={() => {
          void refresh();
          setRefreshToken((token) => token + 1);
        }}
      />
    </div>
  );
}
