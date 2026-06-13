# Map weather overlays (Layer 3)

**Status:** Implemented (climate projection v1)  
**Companion:** [map-flow-overlays.md](./map-flow-overlays.md)  
**Modules:** [`shared/mapOverlayTypes.ts`](../../shared/mapOverlayTypes.ts), [`backend/src/lib/mapOverlayProjectionService.ts`](../../backend/src/lib/mapOverlayProjectionService.ts)

## Primary driver (v1)

Weather bands derive from **fantasy calendar month climate**, not world advance events:

```
FantasyCalendar months (climateAspect per month)
  + season resolution at viewEpochMinute
  + location pins grouped by regionKey
  → regional weather band polygons (convex hull)
```

`record_season_context` and event weather (`weatherOverlay.sourceMode: event`) are **deferred to v1.1**.

## Temporal semantics

| Field | Role |
|-------|------|
| `overlayTemporal.generatedAtEpoch` | When projection was written (scene load / recompute) |
| `overlayTemporal.representsEpoch` | In-world month/season the band describes (follows chronology scrub) |
| `visibleFromEpochMinute` / `visibleUntilEpochMinute` | Presence window (approximate month bounds) |

When the GM scrubs the map chronology bar, `representsEpoch` tracks `viewEpochMinute` while `generatedAtEpoch` stays at campaign present unless explicitly recomputed.

## Derivation provenance

```ts
derivedFrom: {
  type: 'seasonal_climate_projection'
  sourceIds: [calendarId, regionKey, monthKey, seasonName]
}
```

Idempotency: `seasonal_climate_projection + calendarId + regionKey + monthKey + representsEpoch + mapAssetId`

## Geometry

v1 uses **convex hull** of location pins sharing a `regionKey` (from location wiki metadata). Not pin-radius circles.

## Layer 4 rendering

Fill intensity blends weighted `weatherOverlay.climateAspects` (v1: single month `climateAspect` as weight 1). Ribbon/flow field samples do not apply to weather bands.

## Scene load

`getMapScenePayload` calls `refreshClimateOverlaysForMap` (best-effort) so scrubbing to winter/summer updates bands without a world event.

## Future

- Multi-aspect `MonthClimateProfile` (up to ~6 weighted aspects) when calendar editor supports it
- Event weather layer (`sourceMode: event`) for storms, blight, `record_season_context`
