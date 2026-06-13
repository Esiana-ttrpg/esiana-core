import { useCallback, useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import type { QuestHubNode, QuestHubPayload, QuestMetadataFields } from '@/types/wiki';
import { updateQuestMetadata } from '@/lib/wiki';
import {
  columnQuestsWithoutDragged,
  computeBoardOrderAtIndex,
} from '@/lib/questBoardOrder';
import {
  BOARD_COLUMNS,
  applyQuestPatchInTree,
  findQuestNodeInTree,
  groupQuestNodesByStatus,
  questStatusForColumnDrop,
} from '@/lib/questHubLayout';
import {
  questMatchesTypeFilter,
  type QuestHubTypeFilters,
} from '@/lib/questHubFilters';
import { matchesQuestHubSearch } from '@/lib/questHubBrowse';
import { QuestCard } from '@/components/quest/QuestCard';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface QuestKanbanBoardProps {
  campaignHandle: string;
  tagsPageId: string | null;
  data: QuestHubPayload;
  isDMUser?: boolean;
  playerPreview: boolean;
  onQuestsChange: (quests: QuestHubNode[]) => void;
  calendarLike?: FantasyCalendarLike | null;
  typeFilters: QuestHubTypeFilters;
  searchQuery?: string;
}

export function QuestKanbanBoard({
  campaignHandle,
  tagsPageId,
  data,
  isDMUser: isDMUserProp,
  playerPreview,
  onQuestsChange,
  calendarLike = null,
  typeFilters,
  searchQuery = '',
}: QuestKanbanBoardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [savingQuestId, setSavingQuestId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const canDrag = isDMUser && !playerPreview && !data.previewAsPlayer;

  const boardGroups = useMemo(() => {
    const groups = groupQuestNodesByStatus(data.quests);
    for (const column of BOARD_COLUMNS) {
      const list = groups.get(column.id) ?? [];
      groups.set(
        column.id,
        list.filter(
          (node) =>
            questMatchesTypeFilter(node.quest.questType, typeFilters) &&
            matchesQuestHubSearch(node, searchQuery),
        ),
      );
    }
    return groups;
  }, [data.quests, typeFilters, searchQuery]);

  const commitQuestBoardChange = useCallback(
    async (
      questId: string,
      patch: Partial<QuestMetadataFields>,
    ) => {
      const node = findQuestNodeInTree(data.quests, questId);
      if (!node) return;

      const statusUnchanged =
        patch.questStatus == null || patch.questStatus === node.quest.questStatus;
      const orderUnchanged =
        patch.boardOrder == null || patch.boardOrder === node.quest.boardOrder;
      if (statusUnchanged && orderUnchanged) return;

      const previousQuests = data.quests;
      onQuestsChange(applyQuestPatchInTree(previousQuests, questId, patch));
      setSavingQuestId(questId);
      setStatusError(null);

      try {
        await updateQuestMetadata(campaignHandle, questId, patch);
      } catch (err) {
        onQuestsChange(previousQuests);
        setStatusError(
          err instanceof Error ? err.message : 'Failed to update quest',
        );
      } finally {
        setSavingQuestId(null);
      }
    },
    [campaignHandle, data.quests, onQuestsChange],
  );

  function handleDragEnd(result: DropResult) {
    if (!canDrag || !result.destination) return;

    const { draggableId, destination } = result;
    const destColumnId = destination.droppableId;
    const destIndex = destination.index;

    const node = findQuestNodeInTree(data.quests, draggableId);
    if (!node) return;

    const nextStatus = questStatusForColumnDrop(
      destColumnId,
      node.quest.questStatus,
    );

    const destColumnQuests = boardGroups.get(destColumnId) ?? [];
    const columnWithoutDragged = columnQuestsWithoutDragged(
      destColumnQuests,
      draggableId,
    );
    const nextBoardOrder = computeBoardOrderAtIndex(
      columnWithoutDragged,
      destIndex,
    );

    const sourceColumnId = BOARD_COLUMNS.find((col) =>
      col.statuses.includes(node.quest.questStatus),
    )?.id;
    const statusChanged =
      nextStatus !== node.quest.questStatus ||
      sourceColumnId !== destColumnId;
    const orderChanged = nextBoardOrder !== node.quest.boardOrder;

    if (!statusChanged && !orderChanged) return;

    const patch: Partial<QuestMetadataFields> = { boardOrder: nextBoardOrder };
    if (statusChanged) {
      patch.questStatus = nextStatus;
    }

    void commitQuestBoardChange(draggableId, patch);
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {canDrag ? (
        <p className="text-xs text-muted">
          Drag cards to reorder within a column or change status. Edit type,
          date, and tags on each quest page.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Quest board order and status are read-only in this view.
        </p>
      )}

      {statusError && (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {statusError}
        </p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid w-full min-w-0 gap-4 lg:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
            const quests = boardGroups.get(column.id) ?? [];

            return (
              <section
                key={column.id}
                className="flex min-h-[14rem] flex-col rounded-lg border border-border bg-elevated/30"
              >
                <header className="border-b border-border px-3 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {column.label}
                  </h2>
                  <p className="text-[10px] text-muted">{quests.length} quests</p>
                </header>

                <Droppable
                  droppableId={column.id}
                  isDropDisabled={!canDrag}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                          : ''
                      }`}
                    >
                      {quests.length === 0 ? (
                        <p className="py-6 text-center text-[11px] text-muted">
                          {canDrag ? 'Drop quests here' : 'No quests'}
                        </p>
                      ) : (
                        quests.map((quest, index) => {
                          const isSaving = savingQuestId === quest.id;

                          return (
                            <Draggable
                              key={quest.id}
                              draggableId={quest.id}
                              index={index}
                              isDragDisabled={!canDrag || isSaving}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`relative rounded-lg transition-shadow ${
                                    dragSnapshot.isDragging
                                      ? 'shadow-lg ring-1 ring-primary/40'
                                      : ''
                                  } ${isSaving ? 'pointer-events-none opacity-70' : ''}`}
                                >
                                  {canDrag && (
                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="absolute left-1 top-3 z-10 cursor-grab text-muted active:cursor-grabbing"
                                      aria-label={`Reorder ${quest.title}`}
                                    >
                                      <GripVertical className="size-4" />
                                    </div>
                                  )}
                                  <div className={canDrag ? 'pl-5' : undefined}>
                                    <QuestCard
                                      node={quest}
                                      campaignHandle={campaignHandle}
                                      tagsPageId={tagsPageId}
                                      playerPreview={playerPreview}
                                      boardMode
                                      calendarLike={calendarLike}
                                    />
                                  </div>
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
      </DragDropContext>
    </div>
  );
}
