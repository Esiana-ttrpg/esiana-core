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
| Current trajectory | `momentumState` |

## Purpose

Optional **narrative-pressure forecasting** layer. Tracks broad faction trajectories across GM-authored campaign eras and projects world pressure — without mutating canon.

This is **not** faction AI simulation. The system models **direction**, not **outcomes**.

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

`eraTrajectories[]` on organization pages:

- `eraId` → campaign era
- `momentumState` — `rising`, `stable`, `fragmenting`, `declining`, `dormant`, `expanding`, `desperate`, `resurgent`
- `pressure` — 0–100 internal weighting (GM-only, optional)
- `gmNote` — free text

Distinct from `worldState` (current posture snapshot).

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

- **Progression › Trajectories** (primary) — era editor, **campaign pacing panel** (pause, epoch preview, simulation receipts), world outlook panel, forecasts
- **Progression › Pending Developments** — unified inbox (world + reputation suggestions)
- **Downtime › World Events** — deep link to Progression inbox
- **Organization metadata** — per-era trajectory table
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

Assistive GM pacing on **Progression › Trajectories** — not time travel.

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
