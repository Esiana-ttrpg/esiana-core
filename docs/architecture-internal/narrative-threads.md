# Open narrative threads (Layer 2)

**Layer:** 2 — Narrative State Engine  
**Module:** [`shared/threadMetadata.ts`](../../shared/threadMetadata.ts)

## Purpose

Track **long-lived narrative vectors** distinct from Adventure quest tracking: mysteries, promises, foreshadowing, dangling clues, and player theories. Threads are wiki-canonical pages under the `narrative_threads` system category—not quest cards or tagged lore.

| Concept | Role |
|---------|------|
| **`NarrativeLifecycleState`** (`open_thread`) | **Authoritative** orchestration visibility (`LOCKED` → party surfaces) |
| **`threadStatus` metadata** | **Descriptive** narrative pacing (`OPEN`, `DORMANT`, `RESOLVED`, `ABANDONED`), constrained by lifecycle |
| **Authored threads** | GM/setup obligations (`mystery`, `promise`, `foreshadowing`, `clue`; not `playerSubmitted`, not kind `theory`) |
| **Player theories** | Speculative, non-canonical (`playerSubmitted` or kind `theory`) |

## Lifecycle ↔ status matrix

Lifecycle transitions are authoritative. Status PATCH may only adjust pacing within allowed values, or trigger explicit terminal mappings (`RESOLVED` → `COMPLETED`, `ABANDONED` → `FAILED`).

| Lifecycle | Allowed `threadStatus` | Party-visible |
|-----------|------------------------|---------------|
| `LOCKED` | (none player-visible) | No |
| `DISCOVERED` | `OPEN`, `DORMANT` | Yes |
| `ACTIVE` | `OPEN` only | Yes |
| `COMPLETED` | `RESOLVED` | Yes (resolved) |
| `FAILED` | `ABANDONED` | Yes (archived) |

Implementation: [`shared/threadLifecycleMatrix.ts`](../../shared/threadLifecycleMatrix.ts), [`backend/src/lib/narrativeLifecycleService.ts`](../../backend/src/lib/narrativeLifecycleService.ts).

## Metadata (`thread-metadata-v1`)

| Field | Purpose |
|-------|---------|
| `threadKind` | **Fixed enum only:** `mystery` \| `promise` \| `foreshadowing` \| `clue` \| `theory` (no custom kinds pre-1.0) |
| `threadStatus` | Published pacing (matrix-constrained) |
| `narrativeWeight` | `minor` \| `major` \| `critical` — campaign attention signal (default `major`; mechanics deferred) |
| `introducedSessionId` | First appearance |
| `lastAdvancedSessionId` | Last session thread materially changed |
| `resolvedSessionId` | Set when resolved / completed |
| `relatedPageIds`, `payoffPageId` | Graph + payoff links |
| `playerSubmitted` | Auto `true` for `theory` kind |
| `sortOrder` | Hub / dashboard ordering |

Kind display order for hub grouping: [`shared/threadDisplay.ts`](../../shared/threadDisplay.ts) (`THREAD_KIND_DISPLAY_ORDER`, `THREAD_KIND_GROUP_LABELS`). Theories are excluded from authored kind groups.

**Kinds vs tags:** thread kind is a controlled narrative role. Freeform tags (political, romance, etc.) are deferred as a separate field so hub grouping and signals stay meaningful.

## Create Thread wizard

GMs classify threads at creation — not via generic wiki page create.

| Entry | Component |
|-------|-----------|
| Threads Hub “New thread” | [`CreateThreadModal`](../../frontend/src/components/thread/CreateThreadModal.tsx) |
| Entity wiki page “Track narrative thread” | Same wizard with `relatedPageIds` pre-filled |

Wizard steps: identity (title, **kind**, **narrative weight**), lifecycle visibility, status (matrix-constrained), connections, placement preview, review.

Atomic create: `POST /wiki` with `threadKind` in metadata + optional `initialThreadLifecycle`. Backend [`bootstrapThreadPageOnCreate`](../../backend/src/lib/bootstrapThreadPageOnCreate.ts) merges metadata, seeds kind-specific TipTap prompts ([`shared/threadCreate.ts`](../../shared/threadCreate.ts)), sets lifecycle, syncs graph edges.

Frontend: `createThreadPage()` in `frontend/src/lib/wiki.ts`.

**Future consumers of `narrativeWeight`:** dashboard sort, recap/snapshot emphasis, stale/dormant heuristics, campaign health views (stored now, not wired in v1).

## GM authoring (wiki)

- **Block:** `entity-thread-properties` on thread pages (seeded above `text-tiptap` on create).
- **Surface profile:** `thread` when page is under Narrative Threads (pre-freeze gate in `entitySurfaceProfile.ts`).
- **Warnings:** `parseThreadMetadataWithWarnings` → `metadataWarnings` on hub + PATCH (elevated).
- **Signals (elevated):** [`shared/threadSignals.ts`](../../shared/threadSignals.ts) — `stale`, `dangling_foreshadowing`, `unresolved_promise`, `theory_contradiction` (v1 heuristics).

## API

```
GET  /c/:slug/wiki/threads-hub
GET  /c/:slug/wiki/threads-hub/:pageId
PATCH /c/:slug/wiki/:pageId/metadata  (thread fields; matrix validation on threadStatus)
PATCH /c/:slug/narrative-lifecycle/open_thread/:pageId  { lifecycleState }
GET  /c/:slug/narrative-lifecycle?subjectKind=open_thread&subjectIds=...
```

Frontend helpers: `updateThreadMetadata`, `patchThreadLifecycle`, `fetchThreadLifecycleStates` in `frontend/src/lib/wiki.ts`.

## Threads Hub

Two zones (not one mixed list):

1. **Narrative Threads** — authored setup vectors, sub-grouped by `THREAD_KIND_DISPLAY_ORDER`.
2. **Player Theories** — separate styling; flat list v1.

Filters: kind, status, lifecycle (GM), player-submitted. GM `previewAsPlayer` toggle (Adventure Board pattern).

GM toolbar includes **Investigation topology** — deep link to Adventure › Investigation for clue-web aggregation. Author threads here; view operational topology there.

## Investigation topology (Adventure)

Adventure › Investigation aggregates clue-kind threads, lead threads, scene links, NPCs, location unlocks, and discoveries into a dependency matrix and topology graph with SPOF and reachability signals. It does not replace Threads Hub — use Threads Hub to create and edit thread pages. Docs: [narrative-investigation-ledger.md](./narrative-investigation-ledger.md)

## Dashboard — Living Threads

Bundle shape `threadBundle`:

| Bucket | Rules |
|--------|--------|
| `living` | Authored; lifecycle `ACTIVE`/`DISCOVERED`; status `OPEN`/`DORMANT`; max 8 |
| `theories` | Player theories; same visibility rules; max 5 |
| `recentlyResolved` | `RESOLVED` or lifecycle `COMPLETED`, updated within 14 days; max 5 |

Legacy field `openThreads` mirrors `threadBundle.living`.

## Entity graph

- `THREAD_RELATED` — metadata `relatedPageIds`
- `THREAD_PAYOFF` — metadata `payoffPageId`

## Related

- [narrative-lifecycle.md](./narrative-lifecycle.md)
- [narrative-foreshadowing-tracker.md](./narrative-foreshadowing-tracker.md) — Layer 4 progression diagnostics from thread session metadata
- [narrative-projection-semantics.md](./narrative-projection-semantics.md)
- [narrative-engine-layers.md](../plans/narrative-engine-layers.md)
