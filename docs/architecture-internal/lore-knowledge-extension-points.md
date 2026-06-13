# Lore knowledge extension points (schema freeze)

**Narrative Platform → Layer 1 — revelation projection substrate** (interpretive lore tables ship before v1.0.0 schema freeze; formerly Phase 22). Post-1.0 work should extend via:

- **UI projections** over existing tables
- **`metadata` JSON** on unrelated models (not interpretive lore — use overlay tables)
- **`ContentPresenceState`** with `entityType` `historical_alias`, `lore_interpretation`, `lore_claim`
- **`shared/discoveryProjection.ts`** — mandatory contract for browse, search, links, party-knowledge surfaces
- **`stableKey`** for external references (imports, AI, reveal workflows)

Avoid adding parallel claim/alias systems after freeze. See [`docs/plans/knowledge-architecture.md`](../plans/knowledge-architecture.md).
