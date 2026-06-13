# Continuity warnings (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented (temporal contradictions)  
**Roadmap:** [todo.md](../../todo.md) — Continuity warnings v1

## Purpose

Deterministic, rule-based **temporal contradiction detection** for campaign canon — no AI. Complements Phase 1 link-integrity continuity (broken wikilinks, unlinked entities, alias collisions).

## API surfaces

| Endpoint | Role |
|----------|------|
| `GET /c/:slug/wiki/:pageId/continuity` | Page-scoped issues (link + temporal when elevated) |
| `GET /c/:slug/wiki/continuity-summary` | Campaign-wide summary (link + temporal when elevated) |

Temporal issues are **DM / Writer only** — same gating as the Codex Continuity subview.

## v1 rules

### Posthumous character reference

| Input | Detail |
|-------|--------|
| Boundary | Character `lineage.deathDate` on wiki metadata |
| Source | Dated wiki page with resolved wikilink to that character |
| Contradiction | Content in-world date is **after** `deathDate` |
| Issue type | `temporal_posthumous_reference` |

**Dated sources (v1):**

- Session notes with `metadata.fantasyEpochMinute` (converted via master fantasy calendar)
- Event lore pages (`event-{calendarEventId}`) using linked `CalendarEvent` occurrence date

### Dissolved organization in later content

| Input | Detail |
|-------|--------|
| Boundary | `organizationStatus: DISSOLVED` + `statusEffectiveDate` on org metadata |
| Source | Dated wiki page with resolved wikilink to that organization |
| Contradiction | Content in-world date is **after** `statusEffectiveDate` |
| Issue type | `temporal_dissolved_org_reference` |

`MERGED` and `RENAMED` lifecycle values are stored but **not** checked in v1.

## Organization lifecycle metadata

```typescript
organizationStatus: 'ACTIVE' | 'DISSOLVED' | 'MERGED' | 'RENAMED'
statusEffectiveDate: ChronologyDateParts | null
statusReason: string | null
```

Edited in the organization identity panel. Defaults to `ACTIVE` when unset.

## Issue contract

Emitted via [`shared/continuityIssue.ts`](../../shared/continuityIssue.ts):

- `producer: 'chronology_analyzer'`
- `scope: 'temporal'`
- `severity: 'warning'`
- `pageId` — dated source page; `relatedPageId` — contradicted character/org; `blockId` when wikilink is block-scoped

## Modules

| Module | Role |
|--------|------|
| [`shared/continuityIssue.ts`](../../shared/continuityIssue.ts) | Issue types, fingerprints |
| [`backend/src/lib/temporalContinuityScan.ts`](../../backend/src/lib/temporalContinuityScan.ts) | Campaign index (characters, orgs, dated links) |
| [`backend/src/lib/buildTemporalContinuityIssues.ts`](../../backend/src/lib/buildTemporalContinuityIssues.ts) | Pure rule engine |
| [`backend/src/lib/wikiContinuityService.ts`](../../backend/src/lib/wikiContinuityService.ts) | Orchestration with link continuity |

## v1 limits

- No NLP for memorial / flashback vs living reference
- No undated wiki pages
- No player-journal plugin private entries (only published wiki)
- No `MERGED` / `RENAMED` contradiction rules
- Global temporal scan capped at 50 issues per request
- Recomputed per request (no cache)

## Related

- [narrative-dead-end-detection.md](./narrative-dead-end-detection.md) — Layer 4 branch/consequence/thread structure linting (same continuity API)
- [narrative-hidden-reachability.md](./narrative-hidden-reachability.md) — Layer 4 hidden branch activation-path linting (same continuity API)
- [narrative-circular-dependency.md](./narrative-circular-dependency.md) — Layer 4 SCC-based cycle linting (same continuity API)
- [narrative-orphan-analysis.md](./narrative-orphan-analysis.md) — Layer 4 tiered orphan / isolation analysis (same continuity API)
- [narrative-clue-redundancy.md](./narrative-clue-redundancy.md) — Layer 4 clue SPOF and bottleneck linting (same continuity API)
- [narrative-foreshadowing-tracker.md](./narrative-foreshadowing-tracker.md) — Layer 4 foreshadowing progression (same continuity API)
- [narrative-density-metrics.md](./narrative-density-metrics.md) — Layer 4 density metrics payload (same continuity API)
- [chronology-convergence.md](./chronology-convergence.md) — Layer 1 temporal feed substrate
- [canonical-page-editor.md](../plans/canonical-page-editor.md) — Codex Continuity subview (orthogonal to block-scoped link scan)
