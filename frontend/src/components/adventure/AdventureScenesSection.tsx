import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SceneEditorCard } from '@/components/progression/SceneEditorCard';
import { CreateSceneModal } from '@/components/adventure/CreateSceneModal';
import { useWiki } from '@/contexts/WikiContext';

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
  const [scenesData, setScenesData] = useState<AdventureHubPayload['scenes'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadViewData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchAdventureHub(campaignHandle, {
        pageId: questsCategoryId,
        section: 'scenes',
      });
      setScenesData(payload.scenes ?? null);
    } catch {
      setScenesData(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, questsCategoryId]);

  useEffect(() => {
    void loadViewData();
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
