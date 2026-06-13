# Narrative lifecycle (Layer 2)

**Layer:** 2 — Narrative State Engine  
**Status:** Implemented  
**Module:** [`shared/narrativeLifecycle.ts`](../../shared/narrativeLifecycle.ts)

## Purpose

Campaign-scoped **orchestration lifecycle** for narrative subjects (`quest`, `open_thread`). Distinct from:

| System | Role |
|--------|------|
| **`NarrativeLifecycleState`** | GM orchestration truth — progression eligibility |
| **`metadata.questStatus`** | Published Quest Hub Kanban display (synced on transition) |
| **`ContentPresenceState`** | Fog / revelation on wiki content |

Party surfaces never include subjects in `LOCKED` orchestration state.

## States

| State | Party visible | Published `questStatus` |
|-------|---------------|-------------------------|
| `LOCKED` | No | `AVAILABLE` (internal; party does not see quest) |
| `DISCOVERED` | Yes | `AVAILABLE` |
| `ACTIVE` | Yes | `ACTIVE` |
| `COMPLETED` | Yes | `COMPLETED` |
| `FAILED` | Yes | `FAILED` or preserved `ABANDONED` |

## Transitions (backend-enforced)

```
LOCKED     → DISCOVERED | ACTIVE
DISCOVERED → ACTIVE | FAILED
ACTIVE     → COMPLETED | FAILED
COMPLETED  → (terminal)
FAILED     → (terminal)
```

Invalid transitions return HTTP `409` with `allowedTargets`.

## Storage

`NarrativeLifecycleState` table — `(campaignId, subjectKind, subjectId)` unique.

- `subjectKind`: `quest` | `open_thread`
- `subjectId`: wiki page id

New quests under the Quests category default to `LOCKED`. Thread pages use `open_thread` with lifecycle-primary editing; published `threadStatus` is descriptive and matrix-constrained (see [narrative-threads.md](./narrative-threads.md)).

## API

```
GET   /c/:slug/narrative-lifecycle?subjectKind=quest&subjectIds=id1,id2
PATCH /c/:slug/narrative-lifecycle/:subjectKind/:subjectId  { lifecycleState }
POST  /c/:slug/narrative-lifecycle/rebuild   (elevated)
```

Quest metadata PATCH with `questStatus` routes through lifecycle transitions (Kanban drag compatibility).

## Projection

`projectNarrativeLifecycle(state, viewerContext)` — party gets `visible: null` for `LOCKED`; elevated sees canonical state.

Integrated surfaces:

- Quest Hub (`GET /wiki/quests-hub`) — filters locked quests for party; exposes `lifecycleState` to GMs
- Dashboard quest ledger
- Campaign milestone snapshot facets (split DM vs party payloads)

## Repair

```bash
npx tsx backend/prisma/scripts/rebuild-narrative-lifecycle.ts [--campaign <id>]
```

Runs automatically after campaign clone, backup restore, and import.

## Open threads (`open_thread`)

Lifecycle is **authoritative** for threads; `threadStatus` is descriptive pacing synced on lifecycle transition and only selectively drives lifecycle on terminal status PATCH (`RESOLVED` / `ABANDONED`). Full matrix: [narrative-threads.md](./narrative-threads.md).

```
PATCH /c/:slug/narrative-lifecycle/open_thread/:pageId  { lifecycleState }
```

Integrated surfaces: Threads Hub (GM lifecycle chips), `entity-thread-properties` block, dashboard `threadBundle`.

## Branching & consequences

- Branch graphs: `GET/PATCH /narrative-branches/:subjectId` (GM-only)
- Consequence rules: metadata `narrativeConsequenceRules` — fired on lifecycle transitions (idempotent receipts)

## Publication

- `POST /narrative-publish/quest/:pageId` — sanitizes blocks, `LOCKED → DISCOVERED`
- `GET /narrative-publish/quest/:pageId/preview` — party projection preview
- `projectPublishedNarrative` in [`shared/narrativeProjection.ts`](../../shared/narrativeProjection.ts)

## Related

- [narrative-projection-semantics.md](./narrative-projection-semantics.md) — viewer context
- [narrative-engine-layers.md](../plans/narrative-engine-layers.md) — Layer 2 roadmap
