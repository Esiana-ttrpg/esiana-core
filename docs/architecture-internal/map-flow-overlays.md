# Map flow overlays (Layer 3)

**Status:** Implemented (Phase 7.6 — simulation-aware v1)  
**Prerequisites:** [map-border-overlays.md](./map-border-overlays.md), [map-presence-visibility.md](../plans/map-presence-visibility.md)  
**Modules:** [`shared/mapOverlayTypes.ts`](../../shared/mapOverlayTypes.ts), [`shared/mapFlowDerivation.ts`](../../shared/mapFlowDerivation.ts), [`backend/src/lib/mapOverlayProjectionService.ts`](../../backend/src/lib/mapOverlayProjectionService.ts)

## Overview

Migration corridors, trade/travel routes, and (with [map-weather-overlays.md](./map-weather-overlays.md)) climate bands are **persisted `MapSceneObject` projections** — not runtime-only decorations.

| Overlay | `kind` | Layer template | Primary derivation |
|---------|--------|----------------|-------------------|
| Migration corridor | `path` | Migration flows | `displacement`, snapshot NPC moves |
| Trade route | `path` | Trade routes | `economic_signal` |
| Travel route | `path` | Travel routes | `append_location_event` (`travel`) |
| Weather band | `region` | Weather & climate | Calendar month climate (see weather doc) |

## Architecture

```
Layer 1 (events/snapshots) → Layer 2 (mapFlowDerivation) → Layer 3 (MapSceneObject) → Layer 4 (ribbon render)
```

- **Spine geometry** (`LineString` in normalized `[0,1]`) is persisted.
- **Ribbon corridor** is derived at view time from spine + `ribbon` params (`widthUnit: normalized_map_space`).
- Auto-generated overlays default to `revelation: DRAFT`; GM confirms to `REVEALED`.

## Canonical style fields

See `MapFlowOverlayStyle` in `mapOverlayTypes.ts`:

- `overlayLifecycle`, `derivationStatus`, `sourceType`, `derivedFrom`, `generationVersion`
- **`overlayTemporal`**: `generatedAtEpoch` (when computed) vs `representsEpoch` (world time described) — distinct from `visibleFromEpochMinute` / `visibleUntilEpochMinute` on the object row
- `flowKind`, `flowDirection`, `geoPath`, `ribbon`, `migrationWave`, `tradeRoute`

### Temporary JSON

`migrationWave.flowCurve` is **intentionally temporary** until dedicated temporal projection storage exists. Keyframes adjust intensity via `styleOverride`, not spine `geometryOverride` (unless full supersession).

### Not persisted

`renderHints.flowFieldSamples` and `renderHints.ribbonPolygon` are Layer 4 only — computed client-side in `mapSceneStyles.flowPathRenderHints()`.

## GM workflow

1. Add a layer template from the map editor visibility bar (+ Migration flows, + Trade routes, etc.).
2. World advance or snapshot diff may create **DRAFT** paths automatically.
3. Open object → Temporal panel → review provenance → **Confirm overlay** or **Regenerate**.
4. Manual override: **Path** draw tool saves a `path` with `sourceType: manual`.

## Idempotency

Routes: `derivedFrom.type + sorted(sourceIds) + mapAssetId + flowKind`  
Supersession sets `overlayLifecycle: superseded` on prior object when geometry materially changes.

## Tests

- `shared/mapFlowDerivation.test.ts` — flow direction, idempotency keys, epoch pair
- `shared/mapGeometry.test.ts` — ribbon polygon, convex hull
