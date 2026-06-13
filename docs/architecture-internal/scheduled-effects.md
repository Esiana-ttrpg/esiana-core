# Scheduled effects (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** v1.1 shipped — treasury + narrative scheduled prompts  
**Modules:** [`shared/scheduledEffectMetadata.ts`](../../shared/scheduledEffectMetadata.ts), [`backend/src/lib/scheduledEffectService.ts`](../../backend/src/lib/scheduledEffectService.ts), [`backend/src/lib/scheduledEffectFireService.ts`](../../backend/src/lib/scheduledEffectFireService.ts), [`backend/src/lib/scheduledEffectOccurrenceService.ts`](../../backend/src/lib/scheduledEffectOccurrenceService.ts)

## Philosophy

Campaign administration schedules are **not** chronology events.

| Domain | Example | Model |
|--------|---------|-------|
| Chronology | Harvest Festival | `CalendarEvent` |
| Administration | Collect guild dues every month | `CampaignScheduledEffect` |

Schedules fire only when **campaign time advances** (time-tracking or world-advance with `advanceTime`). There is no wall-clock cron.

## Invariant: Schedule → Suggestion → Human approval

Treasury schedules emit **`CampaignLedgerSuggestion`** rows (`sourceType: scheduled_effect`). The shared treasury balance does not change until a GM/Writer accepts the suggestion in Downtime › Ledger.

Narrative schedules emit **`CampaignWorldEventSuggestion`** rows when World Development is enabled. Each fire epoch is recorded in **`CampaignScheduledEffectOccurrence`** (`fired` or `suppressed`).

## Data model — `CampaignScheduledEffect`

| Field | Role |
|-------|------|
| `anchorEpochMinute` | Original anchor when the schedule was created |
| `nextFireEpochMinute` / `lastFiredEpochMinute` | Fire cursors (survive large time jumps) |
| `recurrenceRule` | Normalized JSON — `duration` or `calendar_month` |
| `effectKind` | `ledger_upkeep`, `ledger_income`, `world_development_prompt`, `haven_threat_prompt` |
| `effectPayload` | Narrative: optional `{ primaryOrgPageId }` for world-development prompts |
| Treasury fields | `ledgerEntryKind`, `ledgerCategory`, `amount`, optional `havenWikiPageId` |

### Cross-field rules (create)

| Kind | Amount | Scope |
|------|--------|-------|
| `ledger_*` | Required | Optional `havenWikiPageId` |
| `world_development_prompt` | Omit | Optional `primaryOrgPageId` (organization wiki page) — **no** `havenWikiPageId` |
| `haven_threat_prompt` | Omit | Required `havenWikiPageId` — **no** `primaryOrgPageId` |

## Occurrence audit — `CampaignScheduledEffectOccurrence`

Narrative fire epochs always write an occurrence row (self-describing via duplicated `effectKind`):

| Field | Role |
|-------|------|
| `effectKind` | Snapshot at fire time |
| `fireAtEpochMinute` | Scheduled epoch |
| `status` | `fired` \| `suppressed` |
| `suppressionReason` | Shared union when suppressed (e.g. `WORLD_DEVELOPMENT_DISABLED`, `GENERATION_FAILED`) |
| `worldEventSuggestionId` | Set when `fired` |

**Retention:** Occurrences are retained indefinitely as campaign audit history. No cleanup/TTL system.

When World Development is disabled at fire time, the schedule cursor **still advances**; the occurrence is `suppressed`. Missed prompts are never auto-replayed.

## Recurrence

**Duration** — stored as `{ kind: 'duration', intervalMinutes }` only (UI may author days/weeks).

**Calendar month** — `{ kind: 'calendar_month', dayOfMonth, monthInterval? }` uses master fantasy calendar projection (never `months × 30 days`).

## Global time hook

The `upkeep` hook (`upkeep-v1`) scans due schedules. Receipt diagnostics:

- `schedulesScanned`, `schedulesTriggered`, `cappedSchedules`, `remaining`
- `treasuryApplied`, `narrativeGenerated`, `narrativeSuppressed`

Cap: `MAX_SCHEDULED_EFFECT_FIRES_PER_ADVANCE = 24` per advance (partial status when more fires remain).

## API

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/c/:slug/downtime/scheduled-effects?scope=treasury\|narrative\|all` | PARTICIPANT+ (default `treasury`) |
| POST | `/c/:slug/downtime/scheduled-effects` | GM/Writer |
| PATCH | `/c/:slug/downtime/scheduled-effects/:id` | GM/Writer |
| DELETE | `/c/:slug/downtime/scheduled-effects/:id` | GM/Writer (archives) |
| GET | `/c/:slug/downtime/scheduled-effects/:id/occurrences?limit=10` | GM/Writer |

List responses for narrative scope include `lastFiredAtLabel`, `lastOutcome`, and `lastSuppressionReasonLabel` per schedule.

Ledger hub payload includes `scheduledTreasury` lines (`scope=treasury`). Downtime overview pulse may show active treasury schedule count + next due hint.

## UI

- **Downtime › Ledger** — Scheduled treasury panel (list, add, pause, archive)
- **Progression › Scheduled Effects** — Narrative schedules (world-development + haven-threat prompts)
- **Haven manage** — “Create recurring upkeep in Ledger” prefills from authored upkeep cost

Fired treasury items appear in **Pending treasury events**. Fired narrative items appear in **Progression › Developments**.

## Related

- [downtime-ledger.md](./downtime-ledger.md)
- [world-development.md](./world-development.md)
- [global-time-hooks.md](./global-time-hooks.md)
- [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md) Phase 8
