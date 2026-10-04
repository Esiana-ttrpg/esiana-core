# Scene Sequence (Layer 5)

**Module:** [`shared/sceneTimelineProjection.ts`](../../shared/sceneTimelineProjection.ts)  
**Entry:** Adventure › **Storyboard › Sequence** (`/c/:slug/adventures?view=storyboard&storyboardLens=sequence`)

Authorial session-column planning for narrative scenes — **not** canonical chronology. Distinct from:

| Surface | Role |
|---------|------|
| **Adventure › Storyboard › Sequence** | Session sequencing planner for scenes (inline editor on card select) |
| **Adventure › Scenes** | Editor-first stack of expandable scene cards |
| **Adventure › Storyboard › Board** | Spatial storyboard canvas (`followsScenePageIds` graph) |
| **Chronology Hub** | Full world-time authoring |

Legacy Progression scenes URLs are not redirected. Use Adventure › Storyboard › Sequence.

## Canonical metadata (persisted)

On wiki scene pages (`scene-metadata-v1`):

- `plannedSessionId` — `CampaignSessionTimeline.id` (timeline point)
- `playedSessionId` — session where the scene was played
