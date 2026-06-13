# Quest Hub — Kanban ordering persistence

**Status:** Implemented (2026-05-30)  
**Scope:** Wiki-native quest metadata (`WikiPage.metadata` JSON). No database migration.

## Requirements

### 1. Metadata schema

`QuestMetadataFields` includes:

- `boardOrder: number | null` — fractional index for Kanban sort within a status column. `null` when unset.

Stored alongside existing quest keys (`questStatus`, `questGiverId`, etc.) in page metadata. Round-trips via campaign export/import (`boardOrder` front matter).

### 2. Drag-and-drop engine

Board mode in Quest Hub uses [`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd) (`QuestKanbanBoard.tsx`):

- One `DragDropContext` wrapping all columns
- `Droppable` per status column (`available`, `active`, `completed`, `failed`)
- `Draggable` per quest card (DM only; disabled in player preview)

### 3. Midpoint sorting (fractional indexing)

On drop, compute **one** new `boardOrder` for the dragged page — never bulk-patch the column.

| Drop position | Formula |
|---------------|---------|
| Between two cards | `(orderAbove + orderBelow) / 2` |
| Top of column | `orderTop - BOARD_ORDER_STEP` (1024) |
| Bottom of column | `orderBottom + BOARD_ORDER_STEP` |
| Empty column | `Date.now()` |

Sort key when `boardOrder` is unset: `createdAt` (ISO ms), then `updatedAt`, then title.

Implementation: `frontend/src/lib/questBoardOrder.ts`.

### 4. API patch

Single `PATCH /c/:slug/wiki/:pageId/metadata` per drop via `updateQuestMetadata`. Body must wrap quest fields under `metadata`:

```json
{
  "metadata": {
    "questStatus": "ACTIVE",
    "boardOrder": 2048
  }
}
```

The API also accepts flat quest fields on the body for backward compatibility.

`questStatus` is included only when the card changes columns. `boardOrder` is always included when position changes.

Backend: `mergeQuestMetadata` + `hasQuestMetadataPatch` recognize `boardOrder`.

### 5. Frontend sorting

`groupQuestNodesByStatus` flattens the quest subtree into columns, then sorts each column with `sortQuestHubNodesForBoard` (`compareQuestBoardOrder`).

Quest hub API exposes `createdAt` on each `QuestHubNode` for fallback ordering.

## Security

- DnD and metadata writes: DM / Co-DM only (unchanged).
- Players receive `boardOrder` in hub payloads for consistent read-only board layout.

## Out of scope

- Within-column order in list/tree views (wiki title sort unchanged).
- Rebalancing all `boardOrder` values when fractional precision exhausts (rare; add rebalance job later if needed).
- Shift+drag for `ABANDONED` vs `FAILED` distinction.
