import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import type { SceneTimelineEntry, SceneTimelineProjection } from '@shared/sceneTimelineProjection';
import { SceneTimelineCard } from '@/components/adventure/SceneTimelineCard';
import {
  columnScenesWithoutDragged,
  compareSceneTimelineEntries,
  computeSceneTimelineOrderAtIndex,
  parseSessionColumnId,
  sessionColumnId,
} from '@/lib/sceneTimelineOrder';
import { updateSceneMetadata } from '@/lib/wiki';

type TimelineViewMode = 'sessions' | 'sequence';

interface SceneTimelineSectionProps {
  campaignHandle: string;
  data?: SceneTimelineProjection;
  canManage?: boolean;
  onScenesChanged?: () => void;
  embeddedInProgression?: boolean;
  selectedSceneId?: string | null;
  onSelectScene?: (sceneId: string) => void;
}

function formatSessionDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sceneMatchesArcFilter(
  entry: SceneTimelineEntry,
  arcFilterId: string | null,
  ancestryByQuest: Map<string, string[]>,
): boolean {
  if (!arcFilterId) return true;
  return entry.linkedQuestPageIds.some((questId) =>
    (ancestryByQuest.get(questId) ?? []).includes(arcFilterId),
  );
}

export function SceneTimelineSection({
  campaignHandle,
  data,
  canManage = false,
  onScenesChanged,
  embeddedInProgression = false,
  selectedSceneId,
  onSelectScene,
}: SceneTimelineSectionProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>('sessions');
  const [arcFilterId, setArcFilterId] = useState<string | null>(null);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localColumns, setLocalColumns] = useState<SceneTimelineProjection['columns'] | null>(
    null,
  );

  const projection = data ?? {
    anchorSessionId: null,
    sessions: [],
    columns: [],
    sequenceList: [],
    arcFilterOptions: [],
  };

  const columns = localColumns ?? projection.columns;

  const ancestryByQuest = useMemo(
    () => new Map(Object.entries(projection.questArcAncestry ?? {})),
    [projection.questArcAncestry],
  );

  const sessionTitleById = useMemo(
    () => new Map(projection.sessions.map((session) => [session.id, session.title])),
    [projection.sessions],
  );

  const filteredColumns = useMemo(() => {
    if (!arcFilterId) return columns;
    return columns.map((column) => ({
      ...column,
      scenes: column.scenes.filter((scene) =>
        sceneMatchesArcFilter(scene, arcFilterId, ancestryByQuest),
      ),
    }));
  }, [arcFilterId, ancestryByQuest, columns]);

  const filteredSequenceList = useMemo(() => {
    if (!arcFilterId) return projection.sequenceList;
    return projection.sequenceList.filter((scene) =>
      sceneMatchesArcFilter(scene, arcFilterId, ancestryByQuest),
    );
  }, [arcFilterId, ancestryByQuest, projection.sequenceList]);

  const commitSceneTimelineChange = useCallback(
    async (
      sceneId: string,
      patch: {
        plannedSessionId?: string | null;
        sortOrder?: number | null;
        sceneStatus?: SceneTimelineEntry['sceneStatus'];
        playedSessionId?: string | null;
      },
    ) => {
      setSavingSceneId(sceneId);
      setError(null);
      try {
        await updateSceneMetadata(campaignHandle, sceneId, patch);
        setLocalColumns(null);
        onScenesChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update scene');
      } finally {
        setSavingSceneId(null);
      }
    },
    [campaignHandle, onScenesChanged],
  );

  function findSceneInColumns(sceneId: string): {
    columnIndex: number;
    sceneIndex: number;
    scene: SceneTimelineEntry;
  } | null {
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const sceneIndex = columns[columnIndex]!.scenes.findIndex((scene) => scene.id === sceneId);
      if (sceneIndex >= 0) {
        return {
          columnIndex,
          sceneIndex,
          scene: columns[columnIndex]!.scenes[sceneIndex]!,
        };
      }
    }
    return null;
  }

  function handleDragEnd(result: DropResult) {
    if (!canManage || !result.destination) return;

    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const located = findSceneInColumns(draggableId);
    if (!located) return;

    const sourceSessionId = parseSessionColumnId(source.droppableId);
    const destSessionId = parseSessionColumnId(destination.droppableId);
    const destColumn = columns.find(
      (column) => sessionColumnId(column.sessionId) === destination.droppableId,
    );
    if (!destColumn) return;

    const destWithoutDragged = columnScenesWithoutDragged(destColumn.scenes, draggableId);
    const nextSortOrder = computeSceneTimelineOrderAtIndex(
      destWithoutDragged,
      destination.index,
    );

    const patch: {
      plannedSessionId?: string | null;
      sortOrder?: number;
    } = { sortOrder: nextSortOrder };

    if (sourceSessionId !== destSessionId) {
      patch.plannedSessionId = destSessionId;
    }

    const nextColumns = columns.map((column) => {
      const columnKey = sessionColumnId(column.sessionId);
      if (columnKey === source.droppableId) {
        return {
          ...column,
          scenes: column.scenes.filter((scene) => scene.id !== draggableId),
        };
      }
      if (columnKey === destination.droppableId) {
        const movedScene: SceneTimelineEntry = {
          ...located.scene,
          plannedSessionId: destSessionId,
          sortOrder: nextSortOrder,
        };
        const nextScenes = [...destWithoutDragged];
        nextScenes.splice(destination.index, 0, movedScene);
        return { ...column, scenes: nextScenes };
      }
      return column;
    });

    setLocalColumns(nextColumns);
    void commitSceneTimelineChange(draggableId, patch);
  }

  function renderSessionBoard() {
    if (filteredColumns.every((column) => column.scenes.length === 0)) {
      return (
        <p className="text-sm text-muted-foreground">
          No scenes match this filter. Assign scenes to sessions from scene pages or drag them here
          once created.
        </p>
      );
    }

    const board = (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {filteredColumns.map((column) => {
          const columnKey = sessionColumnId(column.sessionId);
          const session = column.sessionId
            ? projection.sessions.find((entry) => entry.id === column.sessionId)
            : null;
          const label = session?.title ?? 'Unscheduled';
          const dateLabel = session ? formatSessionDate(session.plannedStartAt) : null;
          const isAnchor = column.sessionId === projection.anchorSessionId;

          return (
            <section
              key={columnKey}
              className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-elevated/30"
            >
              <header className="border-b border-border px-3 py-2">
                <h3 className={META_SECTION_LABEL_CLASS}>
                  {label}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {column.scenes.length} scene{column.scenes.length === 1 ? '' : 's'}
                  {dateLabel ? ` · ${dateLabel}` : ''}
                  {isAnchor ? ' · Next anchor' : ''}
                </p>
              </header>

              <Droppable droppableId={columnKey} isDropDisabled={!canManage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-[12rem] flex-1 flex-col gap-2 p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                        : ''
                    }`}
                  >
                    {column.scenes.length === 0 ? (
                      <p className="py-8 text-center text-[11px] text-muted-foreground">
                        {canManage ? 'Drop scenes here' : 'No scenes'}
                      </p>
                    ) : (
                      column.scenes.map((scene, index) => {
                        const isSaving = savingSceneId === scene.id;
                        return (
                          <Draggable
                            key={scene.id}
                            draggableId={scene.id}
                            index={index}
                            isDragDisabled={!canManage || isSaving}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`relative ${
                                  dragSnapshot.isDragging
                                    ? 'shadow-lg ring-1 ring-primary/40'
                                    : ''
                                } ${isSaving ? 'pointer-events-none opacity-70' : ''}`}
                              >
                                <SceneTimelineCard
                                  campaignHandle={campaignHandle}
                                  entry={scene}
                                  highlighted={arcFilterId != null}
                                  selected={selectedSceneId === scene.id}
                                  progressionContext={embeddedInProgression}
                                  onSelect={
                                    onSelectScene
                                      ? () => onSelectScene(scene.id)
                                      : undefined
                                  }
                                  dragHandle={
                                    canManage ? (
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="cursor-grab pt-1 text-muted active:cursor-grabbing"
                                        aria-label={`Reorder ${scene.title}`}
                                      >
                                        <GripVertical className="size-4" />
                                      </div>
                                    ) : undefined
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          );
        })}
      </div>
    );

    return canManage ? (
      <DragDropContext onDragEnd={handleDragEnd}>{board}</DragDropContext>
    ) : (
      board
    );
  }

  function renderSequenceList() {
    const list = [...filteredSequenceList].sort(compareSceneTimelineEntries);
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground">No scenes in sequence yet.</p>;
    }

    return (
      <ol className="space-y-2">
        {list.map((scene, index) => (
          <li key={scene.id} className="flex gap-3">
            <span className="w-6 shrink-0 pt-3 text-right text-[10px] text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <SceneTimelineCard
                campaignHandle={campaignHandle}
                entry={scene}
                selected={selectedSceneId === scene.id}
                progressionContext={embeddedInProgression}
                onSelect={
                  onSelectScene ? () => onSelectScene(scene.id) : undefined
                }
              />
              {scene.plannedSessionId ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Planned for {sessionTitleById.get(scene.plannedSessionId) ?? 'session'}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-4">
      {!embeddedInProgression ? (
        <div>
          <h2 className="text-lg font-semibold">Scene Sequence</h2>
          <p className="text-sm text-muted-foreground">
            Chronological session planning — drag scenes between sessions. Confidence and blocking are
            derived from status, schedule proximity, and sequence dependencies.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${
              viewMode === 'sessions'
                ? 'bg-primary/15 font-medium text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('sessions')}
          >
            Session columns
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${
              viewMode === 'sequence'
                ? 'bg-primary/15 font-medium text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode('sequence')}
          >
            Sequence list
          </button>
        </div>

        {projection.arcFilterOptions.length > 0 ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Arc filter</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              value={arcFilterId ?? ''}
              onChange={(event) => setArcFilterId(event.target.value || null)}
            >
              <option value="">All arcs</option>
              {projection.arcFilterOptions.map((arc) => (
                <option key={arc.id} value={arc.id}>
                  {arc.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {canManage ? (
        <p className="text-xs text-muted-foreground">
          Drag cards between session columns to plan sequencing. Storyboard canvas still owns{' '}
          <code className="text-[10px]">followsScenePageIds</code> graph edges.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      {viewMode === 'sessions' ? renderSessionBoard() : renderSequenceList()}
    </div>
  );
}
