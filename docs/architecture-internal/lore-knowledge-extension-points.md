# Lore knowledge extension points (schema freeze)

**Revelation projection substrate** — interpretive lore tables. Extend via:

- **UI projections** over existing tables
- **`metadata` JSON** on unrelated models (not interpretive lore — use overlay tables)
- **`ContentPresenceState`** with `entityType` `historical_alias`, `lore_interpretation`, `lore_claim`
- **`shared/discoveryProjection.ts`** — mandatory contract for browse, search, links, party-knowledge surfaces
- **`stableKey`** for external references (imports, AI, reveal workflows)

Avoid adding parallel claim/alias systems after freeze.
