# Narrative objectives (Layer 5)

**Module:** [`shared/objectiveMetadata.ts`](../../shared/objectiveMetadata.ts)

Objectives are wiki child pages under quest pages — structural steps within a quest, not a separate category tree.

## Schema (`objective-metadata-v1`)

| Field | Purpose |
|-------|---------|
| `objectiveStatus` | `PLANNED` \| `ACTIVE` \| `COMPLETED` \| `SKIPPED` |
| `summary` | One-line GM-facing description |
| `sortOrder` | Optional ordering hint among sibling objectives |

**Not stored:** `parentQuestPageId`, scene association lists. Parent quest is wiki `parentId` only. Scene associations are declared on scene metadata.

## Scene associations

Scenes declare which objectives they **advance** via `linkedObjectivePageIds[]` on [`scene-metadata-v1`](../../shared/sceneMetadata.ts). A single scene may associate with multiple objectives (including across questlines). This is a projection, not exclusive ownership.

Graph edges: `QUEST_OBJECTIVE` (wiki parent), `OBJECTIVE_SCENE` (from scene metadata).

## Authoring

- Create objective: child page under quest with `templateType: OBJECTIVE`
- Edit: `entity-objective-properties` wiki block
- Arc hierarchy tree: Adventure › Arcs (server-built projection)
