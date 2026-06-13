# Downtime timeline projection

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** Implemented (Phase 7 — Timeline integration)  
**Related:** [chronology-convergence.md](./chronology-convergence.md), [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md), [global-time-hooks.md](./global-time-hooks.md)

## Purpose

Project **derived downtime periods** into the Layer 1 convergence feed so GMs and players can see when time passed between active play — without a dedicated `DowntimePeriod` table.

Downtime periods **interoperate** with `CalendarEvent` world chronology; they do not replace or collapse calendar events.

## Derived period rules (v1)

| Rule | Detail |
|------|--------|
| Boundary source | Consecutive `CampaignSessionTimeline` points with `fantasyEpochMinute` on session anchor metadata |
| Fallback start | Latest `NarrativeStateSnapshot` (`milestone`, `party_visit`, `manual`) when no session chronicle exists |
| Open period end | `campaign.currentEpochMinute` |
| Closed period end | Next session's `fantasyEpochMinute` |
| Storage | Ephemeral projection only — anchors built at overlay read time |

Each period becomes one `downtime_period` convergence entry with a `ChronologyRange` (`start` → `end`) for span labels in the campaign feed.

## Layer 2 enrichment (read-only rollup)

Within each period window the collector counts:

- `TimeAdvanceSimulationRun` rows (`nextEpochMinute` in range)
- `DowntimeProject` completions and failures (`completedAtEpochMinute` in range)

Rollup copy is narrative-first (e.g. *"3 weeks passed between sessions — 2 time advances · 1 project completed"*).

## Surfaces

| Surface | Domains / behaviour |
|---------|---------------------|
| Chronology Hub › Campaign feed | `downtime_period` domain chip + span-labelled rows |
| Adventure › Timeline | `downtime_period` included in default domain filter |
| Downtime Hub › Overview | `currentDowntimePeriod` card with link to chronology feed |

Scene Timeline (session-column planner) is **out of scope** — it uses session ordering, not epoch ranges.

## Entity annotations (Phase 7 — collapsed)

Downtime periods **optionally annotate involved entities** — derived, textual, chronology-facing only.

**Principle:** Downtime is primary; entities are contextual references. No entity-owned downtime state.

| Kind | Source | Example |
|------|--------|---------|
| Character presence | `locationHistory`, world-advance mobility effects | *Seren spent the winter in the southern provinces.* |
| Location mention | `downtimeAlterations` in gap window | *Northwall remained under reconstruction during the Frost Months.* |
| GM overlay | `Campaign.downtimeGapOverlays[gapId]` | Optional period label + freeform mentions |

Auto-derived annotations are **ephemeral** (computed at overlay read). GM overlays are period-scoped JSON on the campaign — not entity metadata.

Merged into `DowntimePeriodPayload.annotations` and `locationMentions` on convergence anchors. UI: inline **Affected** list on downtime period rows (Chronology Hub + Adventure Timeline).

## Promotion overlay

`DowntimePeriodPayload.promotedLabel` — GM-authored period headline via gap overlay (optional).

## Modules

| Module | Role |
|--------|------|
| [`shared/downtimePeriodProjection.ts`](../../shared/downtimePeriodProjection.ts) | Gap derivation + headline formatting (browser-safe) |
| [`shared/downtimeAnnotations.ts`](../../shared/downtimeAnnotations.ts) | Annotation types, merge helpers, overlay parsers |
| [`shared/chronologyTypes.ts`](../../shared/chronologyTypes.ts) | `DOWNTIME_PERIOD` domain + `anchorFromDowntimePeriod()` |
| [`backend/src/lib/downtimePeriodProjectionService.ts`](../../backend/src/lib/downtimePeriodProjectionService.ts) | Prisma collectors + annotation merge |
| [`backend/src/lib/downtimeAnnotationDerivation.ts`](../../backend/src/lib/downtimeAnnotationDerivation.ts) | Window-scoped read-only derivation |
| [`backend/src/lib/downtimeGapOverlays.ts`](../../backend/src/lib/downtimeGapOverlays.ts) | Campaign overlay storage |
| [`backend/src/lib/chronologyConvergenceService.ts`](../../backend/src/lib/chronologyConvergenceService.ts) | Overlay registration |

## API

Periods appear in:

`GET /c/:slug/chronology/overlay?domains=downtime_period`

GM gap overlay (chronology manager):

`PUT /c/:slug/downtime/gap-overlays/:gapId`

Downtime hub overview payload (`currentDowntimePeriod`) unchanged.
