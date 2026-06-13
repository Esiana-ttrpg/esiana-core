# Time advancement (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** Implemented (v1 extensions)  
**Modules:** [`shared/timeAdvanceUnits.ts`](../../shared/timeAdvanceUnits.ts), [`backend/src/lib/computeTimeAdvance.ts`](../../backend/src/lib/computeTimeAdvance.ts), [`backend/src/lib/timeEngine.ts`](../../backend/src/lib/timeEngine.ts)

## Philosophy

Campaign time is **narrative state progression**, not merely timestamp mutation. All advance paths share one epoch calculator so manual advance, world advance, and session prompts never diverge.

```text
duration units     → arithmetic epoch delta (minutes, hours, days, weeks)
calendar units     → projection shift (months)
```

## Unit taxonomy

| Unit | Kind | Computation |
|------|------|-------------|
| `minutes`, `hours`, `days` | Duration | Arithmetic multipliers on epoch minutes |
| `weeks` | Duration | `amount × 7 × 1440` minutes (not calendar weeks) |
| `months` | Calendar | `advanceCalendarByMonths` on master fantasy calendar |

Shared constants: `TIME_ADVANCE_UNITS`, `DURATION_ADVANCE_UNITS` (excludes `months`).

### Hard invariant — no month→minute conversion

`months` must **never** be converted to minutes via averages (`months × 30 days`, `averageMonthMinutes`, etc.) in simulation, scheduling, analytics, or hooks. Month advancement stays projection-driven only.

## Entry points

| Path | Calculator |
|------|------------|
| `PATCH /c/:slug/time-tracking/advance` | `computeNextEpochMinute` |
| `POST /c/:slug/world-state/apply` (`advanceTime`) | `computeNextEpochMinute` |
| Session time prompt (new session / end session) | Same API |

## Month advancement flow

1. `convertEpochToCalendarState` → year, month index, day, hour, minute
2. Walk forward `monthsToAdd` month indices via `getMonthsForYear` (leap/intercalary aware)
3. **Preserve day-of-month**; clamp to target month length when needed
4. **Preserve local time-of-day** — rebuild with `calendarEpochMinuteForDate(y, m, d) + hour×60 + minute`; never snap to midnight
5. Return `CalendarShiftResult` with `actualMinuteDelta = nextEpochMinute − previousEpochMinute`

### `CalendarShiftResult`

| Field | Meaning |
|-------|---------|
| `nextEpochMinute` | Resulting campaign clock |
| `previousCalendarState` / `nextCalendarState` | Projection before/after |
| `actualMinuteDelta` | True elapsed minutes (for hooks, DTOs, analytics) |
| `clampedDay` | `true` when target day-of-month was reduced (e.g. Jan 31 → Feb 28) |
| `requestedDay` / `resolvedDay` | Day-of-month before/after clamp |

Month advances require a master fantasy calendar (`isMasterTime`). Missing calendar returns `NO_MASTER_CALENDAR` (400).

## API DTO semantics

- `advancedBy` — user-facing `{ amount, unit }` (display amount, not pre-multiplied minutes)
- `toCalendarAdvancedDto.amount` / hook context elapsed minutes — **`actualMinuteDelta`** (critical for months)
- Optional `clampedDay: true` in advance response when unit is `months`

## Session presets

`SESSION_TIME_ADVANCE_PRESETS` in shared are **presentation-only** flavor scaffolding (Short rest, Travel day, Downtime, etc.). Future campaigns may relabel presets without changing engine semantics.

## Future type (not implemented v1)

```ts
type CalendarDelta =
  | { kind: 'duration'; minutes: bigint }
  | { kind: 'calendar'; unit: 'months'; amount: number };
```

## Performance

Month walking is O(`monthsToAdd`) with per-year month resolution. Fine for session/downtime scales (1–12 months). Very large gaps (e.g. 120 months) may need batching optimization later.

## Related

- [global-time-hooks.md](./global-time-hooks.md) — hook orchestration after epoch update
- [world-advance.md](./world-advance.md) — bundled world advance batches
