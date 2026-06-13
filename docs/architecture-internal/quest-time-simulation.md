# Quest time simulation (Phase 7 Adventure integration)

**Layer:** 2 — Narrative State Engine  
**Status:** Implemented  
**Modules:** [`shared/questTimeSimulation.ts`](../../shared/questTimeSimulation.ts), [`backend/src/lib/questTimeSimulationService.ts`](../../backend/src/lib/questTimeSimulationService.ts), [`backend/src/lib/touchQuestTimeline.ts`](../../backend/src/lib/touchQuestTimeline.ts)

## Architecture invariant

> Quest-time simulation **never invents new narrative branches**.
>
> It only:
>
> - advances authored clocks
> - applies authored escalation tiers
> - fires authored consequences
> - transitions authored lifecycle states

Quest-time pressure is **canonical only when explicitly authored**. Creative drift remains advisory.

## Layer separation

| Concern | Owner |
|---------|-------|
| Authored intent | `questTime.rules` (wiki metadata) |
| Runtime state | `questTime.state` (wiki metadata, GM-hidden) |
| Consequence application | `narrativeConsequenceService` |
| Advisory inactivity | `creativeDrift` |

## Metadata shape

```text
questTime: {
  version: 'quest-time-simulation-v1',
  rules: { ... },   // authored — safe for clone/export
  state: { ... },   // runtime — strip on clone by default
}
```

### Rules (authored)

| Field | Purpose |
|-------|---------|
| `expiresAtEpochMinute` | Optional hard deadline |
| `autoFailOnExpiry` | Hybrid expiry: auto `FAILED` when true; feed card when false |
| `offscreenProgress` | `{ totalMinutes, posture }` — `PASSIVE` \| `STEADY` \| `AGGRESSIVE` |
| `ignoredEscalation.tiers[]` | `{ id, afterDays, title, summary, effects?, autoFail? }` |
| `isTimePressurePaused` | Suppress simulation during hiatus / stasis arcs |
| `pausedReason` | Optional GM note |

### State (runtime)

Updated only via simulation service or `touchQuestTimeline()` — never direct PATCH from clients.

| Field | Purpose |
|-------|---------|
| `partyTouchEpochMinute` | Last party engagement |
| `elapsedOffscreenMinutes` | Offscreen clock progress |
| `currentEscalationTierId` | Last applied tier |
| `offscreenComplete` | Terminal offscreen flag |
| `appliedSignalReceipts` | Idempotency keys |

## Party touch

All updates through:

```text
touchQuestTimeline(tx, { questPageId, epochMinute, reason, actorUserId? })
```

Reasons: `SCENE_LINK`, `QUEST_STATUS_CHANGE`, `OBJECTIVE_PROGRESS`, `LIFECYCLE_TRANSITION`, `MANUAL`.

## Time advance

Runs in the **`cooldown_expiry`** global time hook (first in hook order):

1. `detectQuestTimeSignals()` — pure scan
2. `applyQuestTimeSignals()` — lifecycle, consequences, state persistence

Signal kinds: `QUEST_EXPIRED`, `QUEST_ESCALATION_TIER_REACHED`, `QUEST_OFFSCREEN_PROGRESS_COMPLETE`.

## Hybrid expiry dismiss

Dismiss receipt key (deadline-versioned):

```text
quest-expiry-dismissed:{questPageId}:{expiresAtEpochMinute}
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/wiki/:pageId/metadata` | Merge `metadata.questTime.rules` (GM) |
| POST | `/quests/:pageId/time-pressure/resolve` | `fail` \| `extend` \| `dismiss` |
| POST | `/quests/:pageId/time-pressure/touch` | Manual party-touch reset |

## UI

- **Quest metadata editor** — Time & pressure section (GM-only)
- **Adventure › Quests** — badges: Expiring, Offscreen, Escalating, Paused
- **Downtime overview** — `quest_time` feed cards via `buildQuestTimeFeedItems()`

No player-visible countdown timers.

## Related

- [narrative-lifecycle.md](./narrative-lifecycle.md)
- [global-time-hooks.md](./global-time-hooks.md)
- [creative-drift.md](./creative-drift.md)
- [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md) — Phase 7
