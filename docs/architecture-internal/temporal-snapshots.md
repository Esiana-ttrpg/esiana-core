# Temporal snapshots (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** Implemented  
**Roadmap:** [todo.md](../../todo.md) — Temporal snapshots

**User guide:** [narrative-snapshots-user-guide.md](./narrative-snapshots-user-guide.md) — operational guidance for DMs (Campaign History, when to capture, compare limits).

## Purpose

Materialized **projection captures** for region visits and milestones—not a second canon store. Wiki metadata and chronology remain authoritative; snapshots freeze what the projection runtime believed at capture time.

## Invariants

### Projection determinism

A snapshot payload is interpreted using the `projectionContextHash`, `projectionSemanticsVersion`, and per-facet `collectorVersions` stored at capture—not silently upgraded when runtime rules change.

### Immutability

Snapshots are **not** rewritten when DMs retcon org stances, locations, or chronology. Diffs mean “then vs now (or vs another snapshot).”

### Canonical visits are never deleted

`PartyRegionVisit` rows are permanent. Storage is managed via **hot/cold payload tiers**, not visit deletion.

### Dual payloads (revelation integrity)

| Field | Role |
|-------|------|
| `dmPayload` | Elevated projection at capture |
| `partyPayload` | Party projection frozen at capture |

Player-facing since-last-visit uses `partyPayload` only. Operational version warnings are **DM-only**.

## API (campaign-scoped)

| Method | Path |
|--------|------|
| POST | `/c/:slug/locations/:pageId/visits` |
| GET | `/c/:slug/locations/:pageId/visits/latest` |
| GET | `/c/:slug/locations/:pageId/since-last-visit` |
| GET | `/c/:slug/locations/:pageId/visit-suggestions` |
| POST | `/c/:slug/locations/:pageId/visit-suggestions/:id/promote` |
| POST | `/c/:slug/locations/:pageId/visit-suggestions/:id/dismiss` |
| POST | `/c/:slug/narrative-snapshots` (milestone) |
| GET | `/c/:slug/narrative-snapshots` (list moments; optional `?comparableOnly=true`) |
| GET | `/c/:slug/narrative-snapshots/compare?from=&to=` |

## Compression

After a visit is committed, `enqueueSnapshotCompression` downgrades older hot `party_visit` snapshots in the same scope to **cold** (facets stripped; hashes and `summaryLinesAtCapture` retained). Never inline on the request path.

Env: `SNAPSHOT_HOT_VISITS_PER_REGION` (default `1`).

## Modules

| Module | Role |
|--------|------|
| [`shared/narrativeSnapshots.ts`](../../shared/narrativeSnapshots.ts) | Types, hashes, diff, templates |
| [`backend/src/lib/regionSnapshotService.ts`](../../backend/src/lib/regionSnapshotService.ts) | Collectors + capture |
| [`backend/src/lib/snapshotCompressionQueue.ts`](../../backend/src/lib/snapshotCompressionQueue.ts) | Async hot→cold |
| [`backend/src/controllers/narrativeSnapshotController.ts`](../../backend/src/controllers/narrativeSnapshotController.ts) | HTTP |

## Location metadata

Optional fields for snapshot scope: `regionKey`, `regionPageId`, `dangerLevel` (1–5).
