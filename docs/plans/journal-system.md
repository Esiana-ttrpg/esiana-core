# Journal — Library + Planner

**Status:** Full-stack MVP built on `feat/journal-library-planner` (2026-07); not yet merged
**Changelog:** [changelog.md](../../changelog.md) — `## Unreleased`
**Related:** [terminology.md](../terminology.md), [narrative-engine-layers.md](./narrative-engine-layers.md), [downtime-havens-ledger.md](./downtime-havens-ledger.md), [knowledge-architecture.md](./knowledge-architecture.md)

## Vision

The Journal is **campaign narrative publishing**, not a task board or CMS. A publication (a newsletter, letter, notice, obituary, rumor sheet…) is authored, given optional release conditions, and released into a canonical archive when the world reaches the right state.

It is not:

- a Kanban board
- a timeline editor
- a general content management system
- combat or rules tooling

It is:

- a **Library** — the canonical archive of released publications
- a **Planner** — the pre-release workspace where drafts wait, resolve, and release

Core principle:

> A publication is released when it *reads as done* AND the world is *ready for it*.

## Two surfaces

| Surface | Contains | Audience | Access |
|---------|----------|----------|--------|
| **Library** | Released publications only | Any campaign member | member-readable; authoring uses `PAGE_CREATE` |
| **Planner** | Drafts, scheduled, blocked | Orchestrators | `JOURNAL_PLANNER_ACCESS` (optional capability) |

Authoring a journal is *not* gated by the Planner. Anyone with `PAGE_CREATE` can write a publication. Release orchestration (rules, scheduling, manual release, series) is the optional, capability-gated layer — framed in the UI as **Automation (optional)**. This keeps a party member's point-of-view journal or a player newsletter possible without granting orchestration power.

## Two orthogonal state axes

The system never stacks dimensionality onto the user. Internally there are two axes; each surface collapses them into one perceived state.

1. **Release lifecycle** (`JournalPublicationStatus`): `draft → scheduled → released → archived`. Stored.
2. **Content readiness** (`ContentReadiness`): `empty → partial → ready`. Computed, never stored (`partial` reserved for structured templates).

**Invariant:** only a content-`ready` publication can ever be `released` — auto, manual, or override. An empty issue never publishes even if its rule is satisfied and even if a GM forces it.

### Perceived Planner state

`toPerceivedState()` folds the rule's `PlanState` into a single queue group:

| PlanState | Perceived | Meaning |
|-----------|-----------|---------|
| `needs_plan` | **Needs plan** | No rule yet |
| `pending` / `ready` | **Pending** | Rule set; waiting to auto-release or held on content |
| `blocked` | **Blocked** | A referenced entity is missing/restricted |

`ready` folds into Pending on purpose: a ready-but-unreleased issue either auto-releases on the next resolution pass or is waiting on content, so it reads the same to the GM.

## Release rules

Rules are a browser-safe, nestable DSL (`shared/journalReleaseRule.ts`): `GROUP` nodes (`ALL` / `ANY`) contain `CRITERIA` leaves. Criteria only reference **existing** backend systems, each classified by owning `CriteriaSubsystem` (the plugin extension seam):

- **chronology** — session number/completion, in-world date/season, elapsed time
- **narrative** — event occurred/resolved/visible, character status, quest lifecycle, world-event acceptance
- **discovery** — page revealed, page visibility level
- **downtime** — project status/progress, haven status/scale
- **reputation** — faction reputation axis threshold
- **publishing** — real-world date (lazy/eventual, see below)
- **manual** — release only by GM action

Evaluation (`evaluateReleaseRule`) is a **pure** function over an immutable `JournalReleaseSnapshot`. It returns a `PlanState` plus leaf-level `ConditionDiagnostic`s with i18n tokens for plain-language readiness copy. The builder UI edits value-only criteria directly; entity-anchored criteria render read-only (removable) pending per-subsystem pickers.

### Snapshot resolution

`buildJournalReleaseSnapshot` is **reference-driven**: it walks all rules in a request with `collectRuleReferences`, batches one query per subsystem for exactly the referenced ids, and shares the snapshot across every publication in that pass. No per-publication N+1.

### Ghost references

Referenced entities can be deleted or become restricted. Each criterion snapshots a **`label`** at authoring time. When a reference cannot resolve, the diagnostic carries a `missingReason` (`deleted` | `restricted` | `unresolved`) and the publication reads **Blocked** with plain-language copy — it never silently auto-releases or throws.

## Release timing is lazy

There is **no background scheduler** (consistent with the polling/no-WebSockets locked decision). Resolution runs opportunistically:

- when the Journal is loaded (a natural poll), and
- on campaign time-advance (a jump can satisfy chronology criteria).

The time-advance trigger is a detached, best-effort call — it does **not** modify the locked global-time hook spine. Real-world-clock criteria are therefore **eventual**: an issue releases on the next resolution pass at or after its target time, not on a precise cron tick. This is documented behavior, not a bug.

## Series

For recurring publications a **`JournalSeries`** holds a blueprint: default type, optional template draft, naming scheme, and a `nextIssueRule`. Issues materialize **lazily, buffer-of-1** — the next issue is drafted just-in-time rather than pre-spawning empty issues. A **"Generate next issue now"** manual override exists for GMs who want to get ahead. This avoids a graveyard of stale empty drafts.

## Performance & pagination

- **Library** uses cursor pagination (`CursorPage<T>`) and lightweight row DTOs.
- **Planner** is an on-demand computed view: lightweight list projections (`JournalPlannerItemDTO`, no full diagnostics tree) with full diagnostics loaded lazily per selected publication.
- Snapshot evaluation is batched and shared per request.

## Tenant isolation

All Journal reads and writes are campaign-scoped: `findFirst({ id, campaignId })` then scoped `updateMany`, receipts keyed `campaignId_publicationId`. No cross-campaign leakage in queries, snapshots, or diagnostics.

## Data model

- `JournalPublication` — the issue (status, type, content, `releaseRule` JSON, `linkedPageId` origin, series/issue linkage, provenance).
- `JournalSeries` — recurring blueprint (`nextIssueRule`, `nextIssueNumber`, naming scheme, mode).
- `JournalReleaseReceipt` — immutable release record (trigger kind, epoch minute, diagnostics snapshot).

Migration: `20260703120000_journal_publications` (Prisma-portable; inline FKs for dual-engine SQLite/Postgres).

## Deferred

- Four higher-complexity criteria (require deeper subsystem contracts) held for a follow-up.
- Plugin-contributed criteria kinds (the `CriteriaSubsystem` seam is in place; wiring is a follow-up PR).
- Per-subsystem entity pickers in the rule builder (entity-anchored criteria are currently read-only there).
- Structured-template `partial` content readiness.
