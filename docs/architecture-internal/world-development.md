# World Development (Optional)

**Layer:** 3 — Living World Systems  
**Status:** v2 — trajectory-driven suggestion pool + plugin definitions  
**Modules:** [`shared/worldDevelopmentMetadata.ts`](../../shared/worldDevelopmentMetadata.ts), [`shared/developmentProvider.ts`](../../shared/developmentProvider.ts), [`shared/coreDevelopmentDefinitions.ts`](../../shared/coreDevelopmentDefinitions.ts), [`backend/src/lib/worldDevelopmentEngine.ts`](../../backend/src/lib/worldDevelopmentEngine.ts), [`backend/src/lib/developmentRegistry.ts`](../../backend/src/lib/developmentRegistry.ts)

## Philosophy

> The GM explicitly enables living-world behavior.

World Development is **not** autonomous simulation. It is a **suggestion-first pipeline**:

```text
Faction trajectory (signals)
    → NormalizedTrajectoryContext (explicit or worldState fallback)
    → Development registry (core + plugins)
    → Candidate events (unified pool; registry stamps providerId, validates trajectoryRef)
    → GM approve / reject (or auto-apply per mode)
    → Canon via acceptTarget (calendar event, rumor, quest, …)
```

Core owns **signal generation** (`WorldDevelopmentContext.projectedFactionStates`). Providers own **candidate generation**. The GM sees one inbox — no distinction between core and plugin sources. Payload provenance (`providerId`, `trajectoryRef`) is retained for history/debug/future Graph.

Default mode is **Off** — no generation, no queues, no background activity.

## Modes

| Mode | Behavior |
|------|----------|
| **Off (default)** | No generation |
| **Manual** | All suggestions require GM approval |
| **Assisted** | Minor developments auto-apply; significant queue for review |
| **Auto Apply** | All auto-apply within budget and cooldown constraints |

## Campaign-wide activity budget

Primary control — not per-faction caps (does not scale to large worlds).

| Setting | Monthly budget (campaign time) |
|---------|-------------------------------|
| Very Low | 1–3 |
| Low | 3–6 |
| Normal | 6–12 |
| High | 12–20 |

Slots allocate across factions by `activityLevel`, importance, trajectory pressure, and scheduled effects.

## Type lifecycles

Preparation windows and cooldowns are defined together per development type. Major types enqueue precursor suggestions linked via `parentSuggestionId`.

## Rationale

Every suggestion includes frozen `rationale[]` at generation ("Why suggested") — primary inbox UX.

## Terminal statuses

| UI filter | Status | Meaning |
|-----------|--------|---------|
| Accepted | `accepted` | Approved → canon created |
| Rejected | `dismissed` | GM declined |
| Archived | `archived` | Expired without action |
| Obsolete | `obsolete` | Invalidated by world change |

## Progression hub

```
Graph [future] · Trajectories · Developments · History
```

| Section | Job |
|---------|-----|
| **Trajectories** | Where the world is going — opt-in GM planning directions (table + compact eras). Graph owns relationships later. |
| **Developments** | What is happening — pending inbox, Advance Time action, scheduled narrative prompts |
| **History** | What developments happened — development provenance/outcome (not Chronology) |
| **Graph** (future) | Relationships between trajectories, entities, developments, and pressures |

Trajectories are opt-in; absence is not incompleteness. Advance Time, Scheduled Effects, and Consequences are not Progression destinations.
Consequence authoring stays on Chronology / event lore. Settings live in Campaign Settings.

## APIs

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/world-development/settings` | GM/Writer |
| PUT | `/c/:slug/world-development/settings` | GM/Writer |
| GET | `/c/:slug/world-development/pending` | GM/Writer |
| GET | `/c/:slug/world-development/history` | GM/Writer |
| POST | `/c/:slug/world-development/suggestions/:id/resolve` | GM/Writer |
| POST | `/c/:slug/world-development/suggest` | GM/Writer |

Legacy routes under `/downtime/world-events/suggestions` remain aliases.

## Development registry (internal)

Core registers [`CORE_DEVELOPMENT_DEFINITIONS`](../../shared/coreDevelopmentDefinitions.ts) at boot (trade expansion, diplomatic overture, territorial claim, etc.). Each definition includes:

- `applicableMomentumStates` — trajectory says candidate is *possible*
- `acceptTarget` — canon primitive on approve
- `tags[]` — reserved for future filtering (not UI today)

### Provider context + provenance

Providers receive `WorldDevelopmentContext.projectedFactionStates` as **`NormalizedTrajectoryContext`** (aliased as `ProjectedFactionState`): subject identity, From/By eras, `direction` / `outcome`, momentum/pressure, bullets, and `isExplicit`.

- Normalized context does **not** imply an explicit trajectory — worldState fallback rows keep authorial fields null and `isExplicit: false`.
- Deprecated aliases (`orgPageId`, `orgTitle`, `momentum`, `eraId`) mirror canonical fields for a temporary plugin compatibility window.

Providers return `ProviderDevelopmentCandidate` (**no** `providerId`). The registry:

1. Stamps/overwrites **`providerId`** from the registered provider (never trust provider-supplied identity).
2. Validates **`trajectoryRef`** against explicit projected states (`subjectPageId` + `fromEraId`); otherwise forces `null`.

Persisted `DevelopmentPayload` stores `providerId` + `trajectoryRef` for history/debug/future Graph. The Developments inbox does **not** surface provider vs core.

Plugins register via `DevelopmentProvider` (`world-development:provider` permission, `developmentProvider` capability). See [phase-10-ecosystem.md](../plugins/phase-10-ecosystem.md).

| Hook | Role |
|------|------|
| `DevelopmentProvider` | Definitions + `generateCandidates(context)` → `ProviderDevelopmentCandidate[]` |
| `EligibilityProvider` | Campaign context filter — candidate *allowed* |
| `RationaleProvider` | Append-only rationale lines |
| `DevelopmentResolveProvider` | Optional custom approve → canon when standard `acceptTarget` is insufficient |

Reference plugin: `settlement-life` in community-plugins.

## Related

- [faction-momentum.md](./faction-momentum.md)
- [scheduled-effects.md](./scheduled-effects.md)
- [global-time-hooks.md](./global-time-hooks.md)
