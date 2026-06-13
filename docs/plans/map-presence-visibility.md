# Map Presence & Visibility

Unified architecture for map layers, revelation (fog), and temporal map projection. See Cursor plan `map_presence_visibility` for phased delivery.

## Principle

One resolver answers: **what should this viewer see on this map right now?**

Do not build separate FogEngine or TemporalEngine products.

## Phases

| Phase | Scope |
|-------|--------|
| **7A** | `MapLayer`, `MapSceneObject`, scene GET API, normalized geometry, Ghost Mode, layer UI |
| **9B** | `revelation` on objects, batch reveal, linked-target DTO stripping, wiki downstream warnings |
| **7C** | `visibleFrom`/`Until`, `MapObjectKeyframe`, “View map at date”, in-map keyframe edit (Layer 3 border overlays) |

## Core types

- **`PresenceContext`** — `viewerRole`, `isElevated`, `enabledLayerIds`, `viewEpochMinute`, `editorGhostMode`, `canViewWiki(visibility)`
- **`MapSceneObjectInput`** — geometry, layer, role visibility, revelation, temporal bounds, link targets
- **`resolveMapObjectPresenceDetailed()`** — returns `{ visible, reason }`; boolean wrapper for filtering

### Deny reasons (first failing step)

1. `layer_disabled`
2. `role_dm_only`
3. `unrevealed` / `draft`
4. `before_visible_from` / `after_visible_until`
5. `inherited_wiki_hidden` / `inherited_map_hidden`
6. `missing_target` (pins only)
7. `visible`

Ghost Mode (elevated): objects stay in editor payload; `reason` used for styling only.

## Projection precedence

Per-object scene serialization at `viewEpochMinute` ([`mapSceneService.ts`](../../backend/src/lib/mapSceneService.ts)):

1. Load base `MapSceneObject` (canonical geometry, style, label, `visibleFrom`/`Until`, `layerId`).
2. Select latest `MapObjectKeyframe` where `effectiveEpochMinute <= viewEpochMinute`.
3. **Sparse merge** into projected view (unspecified keyframe fields inherit from base):
   - geometry ← `geometryOverride ?? base.geometry`
   - style ← `styleOverride ?? base.style`
   - visibility ← `visibilityOverride ?? base.visibility`
   - revelation ← keyframe `revelationOverride` merged via `resolveMapObjectRevelationState`
4. Run `resolveMapObjectPresenceDetailed` on projected inputs. **Temporal bounds always come from the base object**, not keyframes.

Then the presence pipeline runs on merged inputs (order unchanged):

1. `layer_disabled`
2. `role_dm_only`
3. `unrevealed` / `draft`
4. `before_visible_from` / `after_visible_until`
5. `inherited_wiki_hidden` / `inherited_map_hidden`
6. `missing_target` (pins)
7. `visible`

Party `viewEpochMinute` is clamped to campaign present for non-elevated viewers. Pin-type and group hide chips filter client-side only — never presence.

Political border overlays: [map-border-overlays.md](../architecture-internal/map-border-overlays.md).

## Geometry

Stored as normalized GeoJSON in \[0, 1\] relative to map display dimensions. Legacy `MapPin` pixel coords converted at sync boundary.

- **Base geometry** on `MapSceneObject`
- **Overrides** on `MapObjectKeyframe` only
- Product surface uses pins, regions, labels, and paths; token creation is removed from UI.

## Layers vs groups vs filters

| Concept | Meaning | Affects presence? |
|---------|---------|-------------------|
| **Layers** | Diegetic content (borders, routes) | **Yes** — `enabledLayerIds` / `layer_disabled` |
| **Groups** | Editor organization (`MapObjectGroup`) | **No** — assign via `groupId` only |
| **Filters** | Pin-type chips, group hide chips (localStorage) | **No** — client `.filter()` after scene load |

### Canonical rule

> **Only layers affect presence resolution. Groups and filters must never change visibility semantics.**

- Backend: `resolveMapObjectPresence` must not read `groupId`. Scene GET must not accept `groupIds`.
- Frontend: never pass group IDs to `fetchMapScene`. Group panel is labeled “Organize (editor)”.
- Phase 9 owns wiki/timeline `revelation`; map inherits wiki **visibility** only today.

| | Layers | Groups |
|---|--------|--------|
| Purpose | Diegetic (borders, routes) | Editor organization |
| Affects presence | Yes | No (UI filter only) |
| v1 nesting | Flat | Flat |

## Security

- Party payloads: omit hidden objects entirely (no placeholders, no `reason`)
- Party `viewEpochMinute` clamped to `Campaign.currentEpochMinute`
- Strip `targetPageId` / titles when target not viewable
- Batch reveal: per-object authorization

## API (campaign-scoped)

- `GET /maps/:assetId/scene` — layers + resolved objects
- CRUD `/maps/:assetId/layers`, `/objects`, `/objects/:id/keyframes`
- `POST /maps/:assetId/reveal` (Phase B)
- Elevated: `editorGhostMode=1`, `debugPresence=1`

## Won't-do

- `TimelineEra` DB model (use `CalendarEventCategory` + optional `ChronologyPeriod`)
- Polygon morphing / GIS / timeline scrubber in v1

## Code locations

- `shared/mapPresence.ts` — resolver (shared tests via backend import)
- `backend/src/lib/mapSceneService.ts` — load, pre-filter, serialize
- `backend/src/controllers/mapSceneController.ts` — HTTP
- `backend/src/lib/mapPinVisibility.ts` — legacy pin path (delegates where applicable)
