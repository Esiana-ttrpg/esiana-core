# Global time hooks (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** Implemented (Phase 1 spine; `cooldown_expiry` quest-time v1; `project_progression` Phase 2; `haven_updates` Phase 3b; `upkeep` scheduled treasury v1; `reputation_shifts` Phase 5; `event_generation` Phase 6 advisory)  
**Modules:** [`shared/globalTimeHooks.ts`](../../shared/globalTimeHooks.ts), [`backend/src/lib/globalTimeHooks/`](../../backend/src/lib/globalTimeHooks/)

## Philosophy

Time advancement is a **first-class engine primitive**. When the campaign clock steps, a deterministic orchestrator runs an ordered fan-out of simulation hooks. Phase 2–6 gameplay systems (projects, havens, ledger, reputation, passive events) plug into this spine without changing entry points.

```text
epoch update → orchestrator → receipt persisted → commit → async CALENDAR_ADVANCED
```

Canonical mutations are **synchronous** inside the clock-update transaction. The domain event bus remains **observational** only.

## Entry points

| Path | When hooks run |
|------|----------------|
| `PATCH /c/:slug/time-tracking/advance` | After `currentEpochMinute` update |
| `POST /c/:slug/world-state/apply` | When batch includes `advanceTime` and epoch changes |

Skipped when `previousEpochMinute === nextEpochMinute`.

## Hook order (invariant)

Do not reorder casually. `event_generation` is **always last** — it observes finalized upstream state and must not mutate earlier systems.

1. `cooldown_expiry` (canonical) — **`quest-time-cooldown-v1`** handler; quest deadlines, offscreen clocks, ignored escalation tiers — see [quest-time-simulation.md](./quest-time-simulation.md)
2. `project_progression` (canonical) — **`project-progression-v1`** handler; advances elapsed/stall minutes, auto-completes projects, applies outcomes
3. `haven_updates` (canonical) — **`haven-simulation-v2`** handler; threat severity maturation (all havens with threats) then opt-in per-haven ambient axis drift, band-crossing activity entries — see [downtime-havens.md](./downtime-havens.md) § Threat escalation
4. `upkeep` (canonical) — **`upkeep-v1`** handler; fires due `CampaignScheduledEffect` treasury schedules as ledger suggestions (`scheduled_effect` source) — see [scheduled-effects.md](./scheduled-effects.md)
5. `reputation_shifts` (canonical) — **`reputation-simulation-v1`** handler; party-to-faction drift, band-crossing suggestions, investigation queue
6. `event_generation` (advisory) — **`world-event-prompts-v1`** handler; queues world event prompts from pressure projection (no silent calendar events). When `CampaignMomentum.worldPressurePaused` is true, returns `noop` with summary *World pressure forecasting paused* — see [faction-momentum.md](./faction-momentum.md) (Phase 4).

## Status semantics

| Status | Meaning |
|--------|---------|
| `skipped` | Handler unavailable (Phase 1 stubs for hooks not yet shipped) |
| `noop` | Ran successfully; nothing to do |
| `applied` | Canonical mutations occurred |
| `partial` | Capped or interrupted processing |
| `failed` | Unrecoverable error |

## Failure policy

- **Canonical hooks:** `failed` aborts the entire transaction (epoch + simulation). Partial committed state is not allowed.
- **Advisory hooks (future):** may degrade gracefully and continue.

## Recursion guard

Nested orchestration is rejected (`NESTED_GLOBAL_TIME_HOOKS`). Advance endpoints return `409` if hooks are already running.

## Advance magnitude

`computeAdvanceMagnitude(elapsedMinutes)` buckets advances for future throttling:

| Magnitude | Elapsed minutes |
|-----------|-----------------|
| `tiny` | &lt; 1 hour |
| `small` | &lt; 1 day |
| `medium` | &lt; 1 week |
| `large` | &lt; 30 days |
| `massive` | ≥ 30 days |

## Audit

`TimeAdvanceSimulationRun` stores a compact `GlobalTimeSimulationReceipt` (operational/diagnostic only — no narrative prose). World-advance batches dedupe via `(campaignId, source, sourceRef, nextEpochMinute)`.

## Replay philosophy (future)

Handlers should be deterministic from `GlobalTimeAdvanceContext`, idempotent, and free of hidden wall-clock dependencies. Future API: `replayGlobalTimeHooks(runId)`. Per-hook `handlerVersion` supports replay mismatch diagnosis.

## Extension (Phase 2+)

Replace stub handlers via `registerGlobalTimeHook()` — see [`handlers/projectProgression.ts`](../../backend/src/lib/globalTimeHooks/handlers/projectProgression.ts), [`handlers/havenUpdates.ts`](../../backend/src/lib/globalTimeHooks/handlers/havenUpdates.ts), and [`handlers/eventGeneration.ts`](../../backend/src/lib/globalTimeHooks/handlers/eventGeneration.ts). Keep hook IDs and order stable.

One-shot treasury suggestions still emit from domain services (project completion, trade signals, quest lifecycle, opt-in haven transitions). **Recurring** treasury uses `CampaignScheduledEffect` + the `upkeep` hook. All suggestions require human approval in the ledger UI — see [downtime-ledger.md](./downtime-ledger.md).

## Related

- [time-advancement.md](./time-advancement.md) — duration vs calendar units, `actualMinuteDelta`, month shift invariants
- [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md) — downtime simulation layer
- [domain-events.md](../plugins/domain-events.md) — async observability bus
- [world-advance.md](./world-advance.md) — Layer 3 world advance batches
