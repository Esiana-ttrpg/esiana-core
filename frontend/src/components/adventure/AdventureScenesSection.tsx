import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { WorkspaceActionBar } from '@/components/layout/WorkspaceActionBar';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SceneEditorCard } from '@/components/progression/SceneEditorCard';
import { CreateSceneModal } from '@/components/adventure/CreateSceneModal';
import { useWiki } from '@/contexts/WikiContext';
import { useAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';

interface AdventureScenesSectionProps {
  campaignHandle: string;
  questsCategoryId: string;
  onHeaderActionsChange?: (actions: ReactNode | null) => void;
}

/** Adventure › Scenes [GM] — collection of actual scene content. */
export function AdventureScenesSection({
  campaignHandle,
  questsCategoryId,
  onHeaderActionsChange,
}: AdventureScenesSectionProps) {
  const { flatPages, refresh } = useWiki();
  const { playerPreview, isDMUser } = useAdventureWorkspace();
  const canManage = isDMUser && !playerPreview;
  const loadGeneration = useRef(0);
  const [scenesData, setScenesData] = useState<AdventureHubPayload['scenes'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadViewData = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setScenesData(null);
    try {
      const payload = await fetchAdventureHub(campaignHandle, {
        pageId: questsCategoryId,
        section: 'scenes',
        previewAsPlayer: isDMUser && playerPreview,
      });
      if (generation === loadGeneration.current) setScenesData(payload.scenes ?? null);
    } catch {
      if (generation === loadGeneration.current) setScenesData(null);
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [campaignHandle, questsCategoryId, isDMUser, playerPreview]);

  useEffect(() => {
    void loadViewData();
    return () => { loadGeneration.current += 1; };
  }, [loadViewData, refreshToken]);

  const createButton = useMemo(
    () => canManage ? (
      <WorkspaceActionBar create={{ label: 'New Scene', onClick: () => setIsCreateSceneOpen(true) }} />
    ) : null,
    [canManage],
  );

  useEffect(() => {
    if (!onHeaderActionsChange) return;
    onHeaderActionsChange(createButton);
    return () => onHeaderActionsChange(null);
  }, [createButton, onHeaderActionsChange]);

  const outlineScenes = useMemo(() => {
    const scenes = scenesData?.scenes ?? [];
    return [...scenes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [scenesData]);

  return (
    <div className="space-y-4">
      {!onHeaderActionsChange ? createButton : null}

      {loading ? (
        <LoadingSpinner label="Loading scenes…" />
      ) : outlineScenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No scenes yet. Create one to start shaping the story inline.
        </p>
      ) : (
        <div className="space-y-3">
          {outlineScenes.map((scene) => (
            <SceneEditorCard
              readOnly={!canManage}
              key={scene.id}
              scene={scene}
              campaignHandle={campaignHandle}
              onSaved={() => void loadViewData()}
            />
          ))}
        </div>
      )}

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
