# Scene Sequence (Layer 5)

**Module:** [`shared/sceneTimelineProjection.ts`](../../shared/sceneTimelineProjection.ts)  
**Entry:** Progression › **Scenes › Sequence** (`/c/:slug/progression?section=scenes&view=sequence`)

Authorial session-column planning for narrative scenes — **not** canonical chronology. Distinct from:

| Surface | Role |
|---------|------|
| **Progression › Scenes › Sequence** | Session sequencing planner for scenes (inline editor on card select) |
| **Progression › Scenes › Outline** | Editor-first stack of expandable scene cards (default Scenes lens) |
| **Progression › Scenes › Board** | Spatial storyboard canvas (`followsScenePageIds` graph) |
| **Adventure › Timeline** | World chronology convergence feed (read-only) |
| **Chronology Hub** | Full world-time authoring |

Legacy entries redirect:

- `?section=sceneSequence` → `?section=scenes&view=sequence`
- `?section=scene-timeline` → `?section=scenes&view=sequence`

## Canonical metadata (persisted)

On wiki scene pages (`scene-metadata-v1`):

- `plannedSessionId` — `CampaignSessionTimeline.id` (timeline point)
- `playedSessionId` — session where the scene was played
