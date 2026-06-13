# Chronology convergence

**Layer:** 1 — Canon & Temporal Infrastructure  
**Status:** Implemented  
**Roadmap:** [todo.md](../../todo.md) — Canonical chronology interfaces; Cross-domain chronology convergence layer

## Purpose

Layer 1A ships per-domain temporal runtimes. This layer adds:

1. **Canonical chronology interfaces** — shared anchors, instants, and stable ids ([`shared/chronologyTypes.ts`](../../shared/chronologyTypes.ts))
2. **Cross-domain convergence feed** — eagerly projected, JSON-safe [`ConvergenceTimelineEntry`](../../shared/chronologyConvergence.ts) rows for APIs, Hub UI, and consumers (continuity warnings, recaps, since-last-session). See [continuity-warnings.md](./continuity-warnings.md).

Session chronicle (`CampaignSessionTimeline`) and world chronology (`CalendarEvent`) remain **distinct** storage models; convergence only projects them into one sorted feed.

## Platform primitive: `ConvergenceTimelineEntry`

| Rule | Detail |
|------|--------|
| Serializable | Plain JSON; no lazy resolution on the client |
| Eager projection | `projection`, `display`, and `links` computed server-side |
| Stable `entryId` | `buildChronologyEntryId()` — `${domain}:${entityType}:${entityId}:${subId}:${instantKey}` |
| Deterministic sort | `sortOrdinal` from epoch + domain rank + entity ids |
| Cache hints | Bundle includes `bundleVersion`, `projectionContextHash`, `evaluatedAt`, `campaignNowEpochMinute` |

## API

`GET /c/:campaignSlug/chronology/overlay`

| Query | Role |
|-------|------|
| `windowMode`, `from`, `to` | Same window semantics as `GET .../chronology/timeline` |
| `domains` | Comma-separated domain kinds (`world_event`, `session_chronicle`, …) |
| `sessionLinkedOnly` | `true` — session chronicle + entries with `sessionLink` |
| `includeSuppressed` | DM-only; includes non-visible rows |

Response: `ConvergenceOverlayBundle` with `entries[]` and `truncation` metadata.

## Hub UI

Chronology Hub tab **Campaign feed** (`?view=feed`):

- Domain filter chips
- Session-linked only toggle
- Grouped by `display.dateLabel`
- Collapsible domain sections (maps/lore collapsed by default)
- Deep links from `entry.links[]` — no client-side revelation logic

## v1 collectors

| Domain | Source |
|--------|--------|
| `world_event` | Calendar occurrence expansion |
| `session_chronicle` | `CampaignSessionTimeline` + session note metadata |
| `map_keyframe` | `MapObjectKeyframe` |
| `org_relation` | Organization wiki metadata `relations[].history[]` |
| `downtime_period` | Derived between-session gaps + open current period — [downtime-timeline.md](./downtime-timeline.md) |
| `world_advance` | World-advance batch calendar events |
| `faction_control` | Map overlay faction control keyframes |
| `quest_transition` | Reserved — empty until Layer 2 |

## Related modules

| Module | Role |
|--------|------|
| [`shared/chronologyTypes.ts`](../../shared/chronologyTypes.ts) | Anchors, adapters, sort keys |
| [`shared/chronologyConvergence.ts`](../../shared/chronologyConvergence.ts) | Entry shape, merge/filter, projection |
| [`shared/narrativeProjection.ts`](../../shared/narrativeProjection.ts) | Revelation + role visibility |
| [`backend/src/lib/chronologyConvergenceService.ts`](../../backend/src/lib/chronologyConvergenceService.ts) | Collectors + bundle assembly |

## Future (not v1)

- `relevanceHints` for weighting / clustering (mechanical filters only today)
- Quest-transition collector
- GM-promoted downtime period labels (authored overlay on derived gaps)
- HTTP caching via `projectionContextHash` ETag
