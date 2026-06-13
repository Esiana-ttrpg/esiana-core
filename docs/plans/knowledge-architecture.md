# Knowledge architecture (Phase 22)

**Roadmap layer:** Narrative Platform → Layer 1 — Canon & Temporal Infrastructure (revelation projection). Shipped — [changelog.md](../../changelog.md).

Interpretive lore systems attach to wiki entities as **structured overlays** — not prose metadata. Wiki pages remain canonical; historical names, historiographic accounts, and claim-centric provenance live in dedicated tables.

## North star

| Layer | Role |
|-------|------|
| `WikiPage.title` + metadata | Stable identity and core facts |
| `EntityHistoricalAlias` | Timeline-aware display names (`usageType`, era bounds) |
| `LoreInterpretationAccount` | Competing recorded accounts (no forced single truth) |
| `LoreClaim` + `LoreClaimSource` | Evidence-linked statements |

## Schema extension points (pre-1.0 freeze)

### Stable external references

- `stableKey` (UUID) on `EntityHistoricalAlias`, `LoreInterpretationAccount`, `LoreClaim`
- Use for import/export, reveal tracking, AI grounding, cross-campaign presets

### Polymorphic sources

`LoreClaimSource`:

- `sourceEntityType` + `sourceEntityId` — wiki page, calendar event, character, artifact, org, session note
- `sourceType` — presentation enum (journal, testimony, artifact, …)
- `role` — SUPPORTS | CONTRADICTS | REFERENCES

### Phase 23 hooks (schema now, UI later)

- `LoreClaim.knowledgeState` — KNOWN | SUSPECTED | CONFIRMED | DISPROVEN | UNDISCOVERED
- `LoreClaim.discoveredViaType`, `discoveredViaRef`, `discoveredViaSessionId`, `discoveredAt`
- `ContentPresenceEntityType`: `historical_alias`, `lore_interpretation`, `lore_claim`
- Shared projection: [`shared/discoveryProjection.ts`](../../shared/discoveryProjection.ts) — see [`phase-23-discovery-knowledge.md`](./phase-23-discovery-knowledge.md)

### Narrative weight

- `narrativeWeight` on claims and interpretation accounts — MINOR | MAJOR | FOUNDATIONAL | APOCRYPHAL (sorting/AI summarization later)

## Distinct from wikilink aliases

| System | Table | Purpose |
|--------|-------|---------|
| Codex link aliases | `WikiPageAlias` | `[[wikilink]]` resolution, campaign-unique normalized text |
| Historical identity | `EntityHistoricalAlias` | Era-scoped names, usage types, regions — **not** auto-synced to link index |

## Inspector UX

Shared sections (all codex profiles, before Document):

1. **Identity History** — temporal names
2. **Interpretations** — historiography cards
3. **Sources & Provenance** — claim objects (OBJECT profile keeps separate artifact **Provenance** section)

Canvas header: canonical title always primary; `Formerly:` chips + optional “Known in this era as” callout — never replace page title globally.

## API (campaign-scoped)

| Route | Purpose |
|-------|---------|
| `GET/POST/PATCH/DELETE …/historical-aliases` | Identity history CRUD |
| `GET …/interpretive-summary` | Header chips + name projection |
| `GET …/interpretations` | Groups + accounts |
| `POST/PATCH/DELETE …/interpretation-groups`, `…/interpretation-accounts` | Historiography CRUD |
| `GET/POST/PATCH/DELETE …/lore-claims` | Claims + polymorphic sources |

Writes require operational manager (DM). `gmResolution` stripped for non-elevated roles.

## Migration from `CitationHooks`

Frontend helper: `citationHooksToClaimSources()` in `loreKnowledgeApi.ts` maps legacy relation `sourcePageIds` / `sourceEventIds` to `LoreClaimSource` rows.

## Shared contracts

- [`shared/loreKnowledge.ts`](../../shared/loreKnowledge.ts) — enums, record types, date projection helpers
- [`shared/contentPresence.ts`](../../shared/contentPresence.ts) — extended entity types for per-claim reveal

## Post-1.0

Prefer new UI and projections over schema changes. Claim graph traversal, party belief layer, and discovery codex build on this substrate without moving interpretive lore into wiki prose.
