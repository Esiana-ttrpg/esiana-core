# World Development (Optional)

**Layer:** 3 — Living World Systems  
**Status:** v2 — trajectory-driven suggestion pool + plugin definitions  
**Modules:** [`shared/worldDevelopmentMetadata.ts`](../../shared/worldDevelopmentMetadata.ts), [`shared/developmentProvider.ts`](../../shared/developmentProvider.ts), [`shared/coreDevelopmentDefinitions.ts`](../../shared/coreDevelopmentDefinitions.ts), [`backend/src/lib/worldDevelopmentEngine.ts`](../../backend/src/lib/worldDevelopmentEngine.ts), [`backend/src/lib/developmentRegistry.ts`](../../backend/src/lib/developmentRegistry.ts)

## Philosophy

> The GM explicitly enables living-world behavior.

World Development is **not** autonomous simulation. It is a **suggestion-first pipeline**:

```text
Faction trajectory (signals)
    → Development registry (core + plugins)
    → Candidate events (unified pool)
    → GM approve / reject (or auto-apply per mode)
    → Canon via acceptTarget (calendar event, rumor, quest, …)
```

Core owns **signal generation** (`WorldDevelopmentContext.projectedFactionStates`). Providers own **candidate generation**. The GM sees one inbox — no distinction between core and plugin sources.

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

- Advance Time (resolution wizard)
- Pending Developments
- Scheduled Effects
- Consequences
- History (filtered audit trail)

Settings live in Campaign Settings, not top-level Progression nav.

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

Plugins register via `DevelopmentProvider` (`world-development:provider` permission, `developmentProvider` capability). See [phase-10-ecosystem.md](../plugins/phase-10-ecosystem.md).

| Hook | Role |
|------|------|
| `DevelopmentProvider` | Definitions + `generateCandidates(context)` |
| `EligibilityProvider` | Campaign context filter — candidate *allowed* |
| `RationaleProvider` | Append-only rationale lines |
| `DevelopmentResolveProvider` | Optional custom approve → canon when standard `acceptTarget` is insufficient |

Reference plugin: `settlement-life` in community-plugins.

## Related

- [faction-momentum.md](./faction-momentum.md)
- [scheduled-effects.md](./scheduled-effects.md)
- [global-time-hooks.md](./global-time-hooks.md)
