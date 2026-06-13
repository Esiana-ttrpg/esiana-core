import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import { campaignPath } from '@/lib/campaignPaths';
import {
  readScenesViewFromSearch,
  scenesViewHref,
} from '@/lib/progressionLayout';
import { patchProgressionScenesView } from '@/lib/workspacePersistence';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScenesViewTabs } from '@/components/progression/ScenesViewTabs';
import { SceneEditorCard } from '@/components/progression/SceneEditorCard';
import { StoryboardSection } from '@/components/adventure/StoryboardSection';
import { SceneTimelineSection } from '@/components/adventure/SceneTimelineSection';

interface ScenesSectionProps {
  campaignHandle: string;
  questsCategoryId: string;
  onCreateScene: () => void;
  refreshToken?: number;
}

export function ScenesSection({
  campaignHandle,
  questsCategoryId,
  onCreateScene,
  refreshToken = 0,
}: ScenesSectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = campaignPath(campaignHandle, 'progression');
  const activeView = readScenesViewFromSearch(location.search, campaignHandle);

  const [scenesData, setScenesData] = useState<AdventureHubPayload['scenes'] | null>(null);
  const [timelineData, setTimelineData] = useState<AdventureHubPayload['sceneTimeline'] | null>(
    null,
  );
  const [dramaticTopology, setDramaticTopology] = useState<
    import('@shared/dramaticTopology').DramaticTopologyFinding[] | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    patchProgressionScenesView(campaignHandle, activeView);
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'scenes' && params.get('view') !== activeView) {
      navigate(scenesViewHref(basePath, activeView), { replace: true });
    }
  }, [activeView, basePath, campaignHandle, location.search, navigate]);

  const loadViewData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeView === 'sequence') {
        const [timelinePayload, scenesPayload] = await Promise.all([
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'scene-timeline',
          }),
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'scenes',
          }),
        ]);
        setTimelineData(timelinePayload.sceneTimeline ?? null);
        setScenesData(scenesPayload.scenes ?? null);
        setDramaticTopology(undefined);
      } else {
        const payload = await fetchAdventureHub(campaignHandle, {
          pageId: questsCategoryId,
          section: 'scenes',
        });
        setScenesData(payload.scenes ?? null);
        setDramaticTopology(
          (payload.dramaticTopology as import('@shared/dramaticTopology').DramaticTopologyFinding[]) ??
            undefined,
        );
        setTimelineData(null);
      }
    } catch {
      setScenesData(null);
      setTimelineData(null);
      setDramaticTopology(undefined);
    } finally {
      setLoading(false);
    }
  }, [activeView, campaignHandle, questsCategoryId]);

  useEffect(() => {
    void loadViewData();
  }, [loadViewData, refreshToken]);

  const scenes = scenesData?.scenes ?? [];
  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);

  const outlineScenes = useMemo(
    () =>
      [...scenes].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [scenes],
  );

  const editorScene = selectedSceneId ? sceneById.get(selectedSceneId) ?? null : null;

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
        <ScenesViewTabs basePath={basePath} activeView={activeView} />
        <button
          type="button"
          onClick={onCreateScene}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover sm:self-auto"
        >
          <Plus className="size-4" />
          New Scene
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading scenes…" />
      ) : activeView === 'outline' ? (
        outlineScenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scenes yet. Create one to start shaping the story inline.
          </p>
        ) : (
          <div className="space-y-3">
            {outlineScenes.map((scene) => (
              <SceneEditorCard
                key={scene.id}
                scene={scene}
                campaignHandle={campaignHandle}
                onSaved={() => void loadViewData()}
              />
            ))}
          </div>
        )
      ) : activeView === 'board' && scenesData ? (
        <>
          <StoryboardSection
            campaignHandle={campaignHandle}
            scenes={scenesData.scenes}
            storyboard={scenesData.storyboard}
            palette={scenesData.palette}
            arcFilterOptions={scenesData.arcFilterOptions ?? []}
            canManage
            dramaticTopology={dramaticTopology ?? []}
            onCreateScene={onCreateScene}
            onStoryboardLayoutSaved={() => void loadViewData()}
            embeddedInProgression
            onSelectScene={setSelectedSceneId}
            selectedSceneId={selectedSceneId}
          />
          {editorPanel}
        </>
      ) : activeView === 'sequence' ? (
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
    </div>
  );
}
