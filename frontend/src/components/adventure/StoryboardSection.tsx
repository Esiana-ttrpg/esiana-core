import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { SceneHubNode } from '@/lib/adventure';
import type { StoryboardProjection, StoryboardViewV1 } from '@/lib/sceneMetadata';
import { patchStoryboardLayout } from '@/lib/adventure';
import { StoryboardCanvas } from '@/components/adventure/StoryboardCanvas';
import {
  StoryboardPalette,
  type StoryboardPaletteData,
  type StoryboardPaletteEntry,
} from '@/components/adventure/storyboard/StoryboardPalette';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { DramaticTopologyFinding } from '@shared/dramaticTopology';

interface StoryboardSectionProps {
  campaignHandle: string;
  scenes: SceneHubNode[];
  storyboard: StoryboardProjection;
  palette?: StoryboardPaletteData;
  arcFilterOptions?: Array<{ id: string; title: string }>;
  canManage: boolean;
  dramaticTopology?: DramaticTopologyFinding[];
  onCreateScene: () => void;
  onStoryboardLayoutSaved?: () => void;
  embeddedInProgression?: boolean;
  onSelectScene?: (sceneId: string) => void;
  selectedSceneId?: string | null;
}

export function StoryboardSection({
  campaignHandle,
  scenes,
  storyboard,
  palette,
  arcFilterOptions = [],
  canManage,
  dramaticTopology = [],
  onCreateScene,
  onStoryboardLayoutSaved,
  embeddedInProgression = false,
  onSelectScene,
  selectedSceneId,
}: StoryboardSectionProps) {
  const navigate = useNavigate();
  const { flatPages } = useWiki();

  const placedIds = useMemo(
    () => new Set(storyboard.layout.nodes.map((n) => n.entityId)),
    [storyboard.layout.nodes],
  );

  const defaultPalette: StoryboardPaletteData = useMemo(
    () => ({
      scenes: scenes.map((s) => ({ id: s.id, title: s.title, entityType: 'scene' })),
      quests: [],
      threads: [],
      characters: [],
      locations: [],
      events: [],
    }),
    [scenes],
  );

  const handleAddToBoard = useCallback(
    async (entry: StoryboardPaletteEntry) => {
      if (!canManage) return;
      const layout: StoryboardViewV1 = storyboard.layout;
      const index = layout.nodes.length;
      const nextLayout: StoryboardViewV1 = {
        ...layout,
        nodes: [
          ...layout.nodes,
          {
            entityType: entry.entityType,
            entityId: entry.id,
            x: (index % 4) * 220,
            y: Math.floor(index / 4) * 140,
          },
        ],
      };
      await patchStoryboardLayout(campaignHandle, nextLayout);
      onStoryboardLayoutSaved?.();
    },
    [campaignHandle, canManage, onStoryboardLayoutSaved, storyboard.layout],
  );

  const handleRemoveMissing = useCallback(
    async (entityId: string) => {
      if (!canManage) return;
      const nextLayout: StoryboardViewV1 = {
        ...storyboard.layout,
        nodes: storyboard.layout.nodes.filter((n) => n.entityId !== entityId),
      };
      await patchStoryboardLayout(campaignHandle, nextLayout);
      onStoryboardLayoutSaved?.();
    },
    [campaignHandle, canManage, onStoryboardLayoutSaved, storyboard.layout],
  );

  const missingNodes = storyboard.nodes.filter((n) => n.missing);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {!embeddedInProgression ? (
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Storyboard</h2>
            <p className="text-sm text-muted-foreground">
              Visual narrative workspace — layout overlays wiki entities
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={onCreateScene}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New scene
            </button>
          ) : null}
        </div>
      ) : null}

      {missingNodes.length > 0 && canManage ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
          <p className="font-medium text-amber-200/90">Stale board references</p>
          <ul className="mt-1 space-y-1">
            {missingNodes.map((node) => (
              <li key={node.entityId} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{node.entityId}</span>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => void handleRemoveMissing(node.entityId)}
                >
                  Remove from board
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[200px_1fr]">
        <StoryboardPalette
          palette={palette ?? defaultPalette}
          placedIds={placedIds}
          readOnly={!canManage}
          onAdd={(entry) => void handleAddToBoard(entry)}
        />
        <StoryboardCanvas
          campaignHandle={campaignHandle}
          scenes={scenes}
          storyboard={storyboard}
          arcFilterOptions={arcFilterOptions}
          readOnly={!canManage}
          dramaticTopology={dramaticTopology}
          onLayoutSaved={onStoryboardLayoutSaved}
          onSelectScene={onSelectScene}
          selectedSceneId={selectedSceneId}
        />
      </div>
      {!embeddedInProgression ? (
        <p className="text-[10px] text-muted-foreground">
          Open a scene wiki page:{' '}
          {scenes.slice(0, 3).map((scene, i) => (
            <span key={scene.id}>
              {i > 0 ? ', ' : ''}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  navigate(campaignWikiPath(campaignHandle, scene.id, flatPages))
                }
              >
                {scene.title}
              </button>
            </span>
          ))}
          {scenes.length > 3 ? ` +${scenes.length - 3} more` : null}
        </p>
      ) : null}
    </div>
  );
}
