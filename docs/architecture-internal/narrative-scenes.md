# Narrative scenes (Layer 5)

**Module:** [`shared/sceneMetadata.ts`](../../shared/sceneMetadata.ts)

Scenes are wiki-canonical narrative orchestration units — independent of quests.

## Schema highlights

- `sceneStatus`: PLANNED | READY | PLAYED | SKIPPED
- `narrativeWeight`: minor | major | critical
- `beatType`, `sceneKind`, `tone`, `pacingTags[]`, `outcomes[]` with typed `SceneOutcome`
- `entryConditions[]`, `exitConditions[]` (branch condition shapes from `narrativeBranch`)
- Optional links: quests, clues, threads, participants, location
- `followsScenePageIds[]` → synced as `SCENE_FOLLOWS` graph edges

## Lifecycle

`NarrativeLifecycleState.subjectKind: scene` — party sees played/published scenes only.

## Authoring

- Create via Adventure › Scenes › New scene, or explicit wiki create with scene metadata
- `entity-scene-properties` block on scene pages
- GM notes stripped for party projection

## Dramatic beat annotations

**Module:** [`shared/narrativeBeatTypes.ts`](../../shared/narrativeBeatTypes.ts)

`beatType` encodes **structural dramatic role** (what the scene does in the sequence), not emotional valence. Use `tone` separately for expressive color (hopeful, grim, comic, etc.).

### Beat catalog

| Slug | Label | Dramatic group |
|------|-------|----------------|
| `setup` | Setup | setup |
| `complication`, `escalation`, `loss`, `fallout` | Complication, Escalation, Loss, Fallout | escalation |
| `reveal`, `twist`, `reversal`, `choice` | Reveal, Twist, Reversal, Choice | pivot |
| `resolution` | Resolution | resolution |

Each beat has a one-line **structural** GM hint in `NARRATIVE_BEAT_HINTS` (function, not feeling).

### Visual rules

- Chip colors derive from **dramatic group only** (setup = cool neutral, escalation = warm, pivot = contrasting, resolution = calmer)
- No success/failure or good/bad semantics — `loss` and `resolution` are structural roles, not judgments
- **Beat-first scan layout** on lists and storyboard nodes: beat chip above title (`[Reveal]` then scene name)

### Surfaces

- Scene create/edit: labeled beat dropdown + structural hint; tone field independent
- Adventure › Scenes list and wiki read-only strip: `SceneBeatHeading` (beat-first)
- Storyboard: custom scene nodes with primary beat chip; group-sectioned beat filter in toolbar (persists in `storyboard-view-v1` layout `visibility.beatTypes`)
- GM-only **Dramatic pacing** panel: `analyzeDramaticTopology` findings when scenes section loads
