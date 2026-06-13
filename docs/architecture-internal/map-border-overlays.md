# Map border overlays (Layer 3)

**Status:** Implemented (Phase 1 — authoring v1)  
**Prerequisites:** [map-presence-visibility.md](../plans/map-presence-visibility.md), [narrative-projection-semantics.md](./narrative-projection-semantics.md)  
**Module:** [`shared/mapOverlayTypes.ts`](../../shared/mapOverlayTypes.ts)

## Concepts

| Concept | Meaning | Encoding |
|---------|---------|----------|
| **Geographic region** | Physical/cultural area | `kind: region` on a standard layer; `semanticRole: region` (default) |
| **Political border overlay** | Temporal sovereignty visualization | `Political borders` layer (or `layerKind: political_border` in object style); `semanticRole: political_border` |

Same Prisma models (`MapSceneObject`, `MapObjectKeyframe`, `MapLayer`). No `TimelineEra` table.

## Projection precedence

### Scene serialization (per object at `viewEpochMinute`)

1. Load base `MapSceneObject` (canonical geometry, style, temporal bounds).
2. Select latest keyframe where `effectiveEpochMinute <= viewEpochMinute`.
3. **Sparse merge** — unspecified keyframe fields inherit from base:
   - `geometry` ← `geometryOverride ?? base.geometry`
   - `style` ← `styleOverride ?? base.style`
   - `visibility` ← `visibilityOverride ?? base.visibility`
   - `revelation` ← keyframe override ?? base
4. Run `resolveMapObjectPresenceDetailed` on merged inputs. **Temporal bounds always from the base object.**

### Presence pipeline (after merge)

See [map-presence-visibility.md](../plans/map-presence-visibility.md#projection-precedence).

## Keyframe rules

- **Sparse overrides only** — POST keyframes with only fields that change; omit nulls for unchanged fields.
- **Never mutate base geometry when recording history** — “Record border as of this date” writes `geometryOverride` on a new keyframe; editing default shape is a separate explicit save on the base object.
- **Discrete swaps** — no polygon morphing between keyframes.

## Authoring (DM)

1. Create or enable a **Political borders** layer (map editor → add layer template).
2. Draw regions on that layer; set **Visible from / until** in the object editor temporal panel.
3. Scrub **View at date** on the map chronology bar to preview historical borders.
4. Add **keyframes** at the scrubbed date to record a different border shape without changing the canonical base geometry.

Optional: link an **Organization** wiki page for label/color hints (`controllingOrgPageId` in object style).

## Phase 2 (faction linkage)

`FACTION_CONTROL` chronology entries **reference** overlay objects; they do not store polygons. Consequences may suggest keyframes; geometry remains editor-owned.

## API

- `GET /maps/objects/:objectId/keyframes` — list keyframes
- `POST /maps/objects/:objectId/keyframes` — sparse create
- `DELETE /maps/objects/:objectId/keyframes/:keyframeId`
