# Entity relationship graph

**Layer:** 1 — Canon & Temporal Infrastructure (frontier)  
**Status:** Implemented  
**Modules:** [`shared/entityGraph.ts`](../../shared/entityGraph.ts), [`shared/entityGraphQuery.ts`](../../shared/entityGraphQuery.ts)

## Purpose

Provide a **unified traversable graph** over narrative entities (wiki pages, calendar events, map pins) while keeping wiki text and metadata as canonical sources. The `EntityRelation` table is **derived only** — synced from `WikiLink`, wiki metadata JSON, calendar prerequisites, and map targets.

## Architectural invariants

1. **Batched hydration** — `entityGraphService.hydrateNodePreviews` loads previews in one query per entity type; never N+1 per edge.
2. **Three query runtimes**
   - **LocalGraphQuery** (`GET /entity-graph`) — SQL-first neighborhood expansion (depth 1–2). Used by entity widgets and inspectors.
   - **Relations projection** (`GET /entity-graph/projection`) — server-precomputed render models for the Relations workspace (lens/mode/level/focus/at). Returns capped, aggregated JSON — not a raw edge dump.
   - **GraphAnalysisSnapshot** (`GET /entity-graph/diagnostics`) — full campaign edge load + in-memory analysis (cycles, orphans, dangling).
3. **Transactional sync** — canonical save/delete and derived row replacement share the same Prisma transaction.
4. **Explicit delete cleanup** — `clearEntityRelationsForWikiPage|CalendarEvent|MapPin` before hard deletes.
5. **Version headers** — `edgeTaxonomyVersion`, `graphSemanticsVersion` on all graph responses.

## Edge taxonomy (v1)

| Kind | Source | Notes |
|------|--------|-------|
| `WIKI_REFERENCE` | `WikiLink` | Directed |
| `ORG_*`, `CHARACTER_*`, `CHARACTER_SOCIAL`, `QUEST_*`, `LOCATION_*` | Wiki metadata | Directed |
| `LOCATION_RELATED` | Location metadata | **Undirected double-write** (forward + reverse rows) |
| `CALENDAR_PREREQUISITE` | `CalendarEvent.prerequisiteId` | Directed |
| `MAP_TARGETS` | `MapPin.targetPageId` | Directed |
| `PAGE_PARENT` | `WikiPage.parentId` | Directed |
| `HAVEN_LOCATION` | `DowntimeHaven.locationPageId` | Directed |
| `HAVEN_RESIDENT` | `DowntimeHaven.residentPageIds[]` | Directed |
| `HAVEN_FACTION` | `DowntimeHaven.factionPageIds[]` | Directed |
| `HAVEN_RELATED` | `DowntimeHaven.relatedPageIds[]` | Directed |
| `HAVEN_REFERENCE` | `DowntimeHaven.references[]` (internal targets) | Directed |

Payloads are discriminated unions in `shared/entityGraph.ts`. Optional `payload.preview` labels are cache hints only; hydration may override.

## Sync contract

| Trigger | Function |
|---------|----------|
| Wiki page substrate sync | `syncEntityRelationsForWikiPage` |
| Wiki page delete | `clearEntityRelationsForWikiPage` |
| Calendar event save/delete | `syncEntityRelationsForCalendarEvent` / `clearEntityRelationsForCalendarEvent` |
| Map pin save/delete | `syncEntityRelationsForMapPin` / `clearEntityRelationsForMapPin` |
| Downtime haven save/delete | `syncEntityRelationsForDowntimeHaven` / `clearEntityRelationsForDowntimeHaven` |
| Repair | `rebuildEntityRelationsForCampaign`, `diagnoseEntityRelationIntegrity` |

CLI backfill: `npx tsx backend/prisma/scripts/rebuild-entity-relations.ts [--campaign <id>]`

## Narrative relation semantics (v2)

`graphSemanticsVersion: graph-semantics-v2` adds optional `semantics` on lineage and social payloads (`shared/narrativeRelationSemantics.ts`): `narrativeType`, `polarity`, `strength`, `provenance` (`explicit` | `inferred`), and `inferenceSource` (`shared_faction`, etc.). Relations projections may augment social edges at runtime with inferred `shared_faction` ties (not persisted).

## API

```
GET  /c/:slug/entity-graph?entityType=&entityId=&depth=&kinds=
GET  /c/:slug/entity-graph/projection?lens=&mode=&level=&focus=&at=&includeHistorical=
GET  /c/:slug/entity-graph/diagnostics?checks=cycles,orphans,dangling
POST /c/:slug/entity-graph/rebuild   (elevated role)
```

**Relations projection** (`lens`: `social` | `structure` | `kinship`; `level`: `summary` | `cluster` | `entity`; `focus`: `party` | `wiki_page:<id>` | `bloc:<orgId>`) returns a lightweight render model with `narrativeSummary`, lens-specific arrays, and `truncation` metadata. Module: `shared/relationshipLensProjections.ts`. Render caps resolve via `shared/relationsRenderCaps.ts` and optional `SystemSetting.relationsMaxVisibleNodes/Edges`.

## Temporal expectations

| Operation | Cost |
|-----------|------|
| Local traversal at `campaignNow` | Cheap |
| Campaign diagnostics snapshot | Heavier |
| Whole-campaign historical time slice | Async/eventual (future) |

Edge `startDate` / `endDate` remain JSON chronology parts; filtering is application-level via `projectEntityRelation` and date windows.

## Extension points

Reserved entity types: `scene`, `clue`. Populate when Layer 2/5 entity types ship. Increment `edgeTaxonomyVersion` when adding kinds.
