# Faction momentum & era trajectories

**Status:** Phase 6 — foundation + world event prompts (Phase 2) + dashboard forecast (Phase 3) + pacing controls (Phase 4)  
**Modules:** [`shared/factionMomentumMetadata.ts`](../../shared/factionMomentumMetadata.ts), [`shared/worldPressureProjection.ts`](../../shared/worldPressureProjection.ts), [`shared/worldEventSuggestionMetadata.ts`](../../shared/worldEventSuggestionMetadata.ts), [`backend/src/lib/campaignMomentumService.ts`](../../backend/src/lib/campaignMomentumService.ts), [`backend/src/lib/worldPressureProjectionService.ts`](../../backend/src/lib/worldPressureProjectionService.ts), [`backend/src/lib/worldEventSuggestionService.ts`](../../backend/src/lib/worldEventSuggestionService.ts)

## GM-facing glossary

| In the app | In code / docs |
|------------|------------------|
| World outlook | `WorldPressureProjection` |
| Brewing conflicts | `risingTensions` |
| Age trends | `eraTrends` |
| Pending developments | `CampaignWorldEventSuggestion` |
| Approve / Reject | accept / dismiss |
| World Development | `WorldDevelopmentSettings` on `CampaignMomentum.state` |
| Trajectory (GM direction) | `direction` (freeform; authorial) |
| Target / Outcome | `outcome` (authorial; not simulated) |
| From / By | `eraId` / `byEraId` (By null = open-ended) |
| Development signal | `momentumState` (engine; default `stable`) |

## Purpose

Optional **narrative-pressure forecasting** layer. Tracks broad faction trajectories across GM-authored campaign eras and projects world pressure — without mutating canon.

This is **not** faction AI simulation. GMs author planning fields (`direction`, `outcome`, From/By). The development engine currently consumes `momentumState` / pressure — not freeform direction or outcome. A later engine pass may map richer intent into generation context.

Trajectories are **opt-in**. An organization with no trajectory is normal; do not treat absence as incompleteness.

## Pressure vs canon

| Layer | Examples | GM authority |
|-------|----------|--------------|
| **Pressure (advisory)** | Rising tensions, era trends, near-future bullets | Suggestions only |
| **Canon** | `CalendarEvent` world events, org relations, territory, consequences | GM-reviewed apply |

Momentum never silently changes faction control, opportunities, or calendar events.

## Data model

### Campaign eras — `CampaignMomentum` (one row per campaign)

JSON state (`campaign-momentum-v1`):

- `eras[]` — named eras (e.g. Present, Ash Winter) with optional epoch bounds
- `worldDevelopment` — optional living-world mode (`off` default), budget, lifecycles — [world-development.md](./world-development.md)
- `worldPressurePaused` — temporary overlay pause when World Development is enabled

Default: single **Present** era.

### Per-faction trajectories — org wiki metadata

`eraTrajectories[]` on organization pages (explicit rows only — opt-in):

| Field | Role |
|-------|------|
| `eraId` | **From** — era when the direction begins (also engine era context) |
| `byEraId` | Optional inclusive **By**; `null` = open-ended from From onward |
| `direction` | GM freeform trajectory text (authorial) |
| `outcome` | GM intended outcome (authorial; not simulated) |
| `momentumState` | Engine development signal — default **`stable`** on create (least directional; not inferred from `direction`) |
| `pressure` | 0–100 internal weighting (GM-only, optional) |
| `gmNote` | Secondary free text |

Resolver: when campaign eras are provided, an explicit row matches eras whose `sortOrder` is ≥ From and ≤ By (open-ended if `byEraId` is null). Legacy `worldState` may still fall back for the engine; UI never lists that fallback as a trajectory.

Distinct from `worldState` (current posture snapshot). Uniqueness: one row per `(org, fromEraId)`.

## APIs

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/momentum` | GM/Writer |
| PUT | `/c/:slug/momentum` | Chronology manager |
| GET | `/c/:slug/world-pressure` | GM/Writer |
| GET | `/c/:slug/world-pressure/preview?targetEpochMinute=` | GM/Writer |
| GET | `/c/:slug/pacing/simulation-runs` | GM/Writer |
| GET | `/c/:slug/downtime/world-events/suggestions` | GM/Writer |
| POST | `/c/:slug/downtime/world-events/suggestions/:id/accept` | GM/Writer |
| POST | `/c/:slug/downtime/world-events/suggestions/:id/dismiss` | GM/Writer |

## World event prompts (Phase 2)

On time advance (`medium` magnitude or larger), the advisory `event_generation` hook may queue `CampaignWorldEventSuggestion` rows — never silent `CalendarEvent` creation.

**Emission rules (v1):**

- `tiny` / `small` advances — never emit (anti-spam)
- Max 2 faction prompts + 1 era prompt per advance (qualitative, not proportional to elapsed duration)
- Era prompt requires ≥2 factions sharing the same `TrendDirection` (`growth`, `decline`, `destabilizing`)
- 14-day similarity cooldown suppresses repeat prompts when projection is stable
- Accepted suggestions are immutable proposal snapshots

**Accept flow:** GM creates `CalendarEvent` (`GM_ONLY`) + `event-{id}` lore stub; provenance in `CalendarEvent.metadata`.

## UI surfaces

Progression IA: **Graph [future] · Trajectories · Developments · History**

- **Progression › Trajectories** — opt-in trajectory table (Entity, Trajectory, From, Target/Outcome, By) with inline edit, create dialog, compact era chrome (`Era: Present` / Manage eras). No missing-trajectory checklist, outlook dashboard, or Graph preview.
- **Progression › Developments** — unified inbox (world + reputation suggestions); Advance Time; scheduled narrative prompts. Trajectories remain optional.
- **Progression › History** — what developments happened (provenance/outcome), not campaign Chronology
- **Graph** (planned) — relationships between trajectories, entities, developments, and pressures. Not implemented on Trajectories.
- **Organization metadata** — aligned hybrid trajectory editor (secondary to the Trajectories hub)
- **Downtime › World Events** — deep link to Progression inbox
- **Downtime overview** — one-line pulse hint + link to Progression
- **Campaign home › Continuity stream** (Phase 3) — GM/Writer next-session or near-future forecast from `worldPressurePreview` on dashboard summary
- **Campaign home › World Pressure Forecast widget** (Phase 3) — optional customize-mode widget (`worldPressureForecast`, disabled by default)

## Dashboard forecast (Phase 3)

Dashboard summary includes `worldPressurePreview` for GM/Writer roles:

- `projectedByNextSession` — narrative bullets when a next session is scheduled
- `nearFutureBullets` / `eraTrends` — fallback when no session date is set
- `risingTensions` — compact brewing-conflict lines for the optional widget
- `paused` — respects `worldPressurePaused` on `CampaignMomentum`

Surfaces are **advisory only** — same boundary as Progression › Trajectories.

## Campaign pacing controls (Phase 4)

Assistive GM pacing APIs remain available — preview/pacing UI is **not** mounted on Trajectories in this pass. Prefer Campaign Settings for pause/forecast controls when those surfaces are rebuilt.

### Pause forecasting

`PUT /c/:slug/momentum` with `{ worldPressurePaused: true }` (chronology manager):

- Stops advisory projection content (`GET /world-pressure` returns empty tensions)
- Blocks new `CampaignWorldEventSuggestion` rows during `event_generation` on time advance
- Existing pending prompts remain reviewable in Downtime › World Events
- Dashboard forecast and continuity stream show the paused message

### Preview at epoch

`GET /c/:slug/world-pressure/preview?targetEpochMinute=` (required non-negative integer string):

- Read-only projection at a target epoch
- Resolves the active era via era `epochStartMinute` / `epochEndMinute` bounds (`resolveCampaignEraAtEpoch`)
- Uses **current** organization trajectories — does not replay historical org metadata
- Skips next-session forecast (preview is not "now")
- Returns `{ projection, targetEpochMinute, resolvedEraId }`

### Simulation receipts ("rewind")

`GET /c/:slug/pacing/simulation-runs` lists recent `TimeAdvanceSimulationRun` rows (newest first, capped):

- Epoch range, source (`time_tracking` / `world_advance`), advance magnitude
- Compact per-hook summaries from the stored receipt
- Link to world-advance batch detail when `source === 'world_advance'`
- Nearby `NarrativeStateSnapshot` count (lightweight; no payload fetch)

Browse-only — **no epoch rollback** and no canon mutation from preview.

See also [global-time-hooks.md](./global-time-hooks.md) for `event_generation` pause behavior.
