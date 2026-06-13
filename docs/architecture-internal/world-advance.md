# Advance world state (Layer 3)

**Layer:** 3 — Living World Systems  
**Status:** Implemented  
**Modules:** [`shared/worldAdvance.ts`](../../shared/worldAdvance.ts), [`shared/worldConditionSurfaces.ts`](../../shared/worldConditionSurfaces.ts), [`shared/worldAdvanceSynthesis.ts`](../../shared/worldAdvanceSynthesis.ts), [`backend/src/lib/worldAdvanceService.ts`](../../backend/src/lib/worldAdvanceService.ts)

## Ontology

| Concept | Meaning |
|---------|---------|
| **World advance batch** | GM-triggered bundle of living-world effects + optional clock step |
| **Canonical layer** | Wiki metadata appends, `CalendarEvent` JSON (`world-advance-v1`), `WorldAdvanceReceipt` |
| **Domain projectors** | Six lenses: faction, territorial, economic, conflict, seasonal, npc_mobility |
| **Derived condition surfaces** | Deterministic readability (stability, prosperity, military/migration pressure) — **not stored as canon** |
| **Batch narrative synthesis** | Template causal prose — **projection only** |

## API

| Method | Path | Access |
|--------|------|--------|
| POST | `/c/:slug/world-state/preview` | Operational manager |
| POST | `/c/:slug/world-state/apply` | Operational manager |
| GET | `/c/:slug/world-state/batches` | Operational manager |
| GET | `/c/:slug/world-state/batches/:eventId` | Operational manager |

## UI

- **Advance world** — `/c/:slug/world-advance` (linked from Time tracking)
- Preview shows domain-grouped effects, derived condition chips, and narrative synthesis

## Chronology

- Category: `World advance`
- Convergence domain: `world_advance` — one anchor per effect in batch events

## Non-goals

- Autonomous simulation or AI strategic planners
- Procedural map geometry mutation (border suggestions remain GM-confirmed)
- Canonical storage of derived condition labels or synthesis prose in wiki body

## Related

- [world-advance-validation.md](./world-advance-validation.md) — Tier 1 scenario catalog, tests, and dev inspection script
- [rumor-engine.md](./rumor-engine.md) — manual spread only; no autonomous diffusion
- [map-border-overlays.md](./map-border-overlays.md) — territory suggestions
- [narrative-lifecycle.md](./narrative-lifecycle.md) — shared `applyCanonicalWorldEffect` for consequences
