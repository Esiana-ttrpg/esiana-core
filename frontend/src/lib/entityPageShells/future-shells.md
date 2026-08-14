# Phase 2+ Entity Page Shells

Each shell owns: hero surface, tab architecture (no parity required), overview dashboard, rail sections, system blocks, and default layouts.

## CharacterPageShell — campaign wiki character sheet (shipped)

**Narrative frame:** RPG campaign wiki / character sheet — identity first, facts second, background prose third. No database-oriented labels (“Properties”, “Metadata”, “Profile”) on the Overview fact section.

**Character Core (Overview):**

1. **Hero / identity anchor** — Name, Title, Role / type, Pronouns, Status (stable fact rows; empty placeholders when unset).
2. **Identity** — Ancestry / origin, Home / location, Families, Affiliations, Gender, Tags (labeled fact rows).
3. **Description** — Biography / character introduction (`text-biography` on Overview; former Biography tab absorbed).

**Read/edit parity:** Same section order, names, and field ownership in read and edit; edit reveals controls in place only.

**Tabs (narrative destinations):** Overview, Appearance, Relationships, Timeline, Discovery (DM), Continuity (DM).

**Appearance tab:** Wiki-first hierarchy — primary portrait and compact physical facts, description prose, optional alternate **Appearances** (not “Forms”), supporting metadata; image import and credits are edit utilities only.

**System blocks:** `entity-hero`, `wiki-infobox`, `text-biography` (layout-hidden; surfaced via hero + Overview).

**Extensions (deferred):** Character Themes — campaign/game-specific facets; must not duplicate Hero / Identity fields.

**Reuse:** `EntityPageSection`, `EntityFactRow` / `EntityFactRowList` for later entity rollouts.

---

## BestiaryPageShell — field guide / creature codex (shipped)

**Narrative frame:** discovery-first field guide maintained through encounters — threat-first, not statblock-first.

**Overview dashboard:** Threat profile, habitat & range, combat intel (masked by discovery), behavior, discovery status, related creatures/locations.

**Tabs:** Overview, Encounters, Combat, Appearance, Related, Lore, Discovery (DM), Continuity (DM).

**System blocks:** `entity-bestiary-hero`, `wiki-infobox`, `text-tiptap` (layout-hidden).

**Deferred:** Pokédex-style browse tiles, field-level campaign reveals, player margin notes, Anatomy/Drops tabs, campaign codex mode toggle, dedicated bestiary hub API.

---

## AncestryPageShell — inheritance-aware identity graph (shipped)

**Narrative frame:** root ancestries and inheriting lineages — presence, societies, and cast anchored to identity graphs (not flat race pages).

**Tabs:** Overview, Lineages, Societies, Presence, Relations, Characters.

**System blocks:** `entity-ancestry-hero`, `wiki-infobox`, `text-tiptap` (layout-hidden).

---

## LocationPageShell — relationship-first atlas hub (shipped)

**Narrative frame:** A place is the center of the world graph — who is here, what exists inside it, who shapes it, and how it connects elsewhere. Maps answer “where”; the shell answers “what is changing here.”

**Projection layers:**

- `LocationHubProjection` — people, places, organizations, connections, map contexts (derived from wiki tree, character `locationRelations`, org presence metadata, pins).
- `LocationStateProjection` — narrative pulse signals (stub in v1; future: world events, developments, reputation). GM overrides win over derived trends when wired.

**Character ↔ location:** `locationRelations` on character identity (`resident` | `visitor` | `former`, optional `featured`). `currentLocationId` remains last-known / physical placement (powers **Last seen here** when life status is Missing). People sections list only explicit relations — not every NPC with a matching current location.

**Location metadata:** `currentStatus` freeform narrative status on Overview (not pulse simulation stats).

**Org ↔ location:** Projected from organization HQ/presence lists via shared `OrganizationLocationRelation` adapter (future first-class edge storage). No duplicate fields on location pages.

**Tabs:** Overview, People, Places, Organizations, Events, Connections, Timeline, Lore.

**Overview:** Description, at-a-glance facts, View Map / map contexts, Location Pulse placeholder, timeline summary teasers.

**Maps:** Reuse `mapAssetId`, `mapPageId`, and pin targets — no parallel geography schema.

**System blocks:** `entity-location-hero`, `wiki-infobox`, `text-tiptap` (layout-hidden).

---

## OrganizationPageShell — institutional power surfaces (shipped)

**Narrative frame:** how power moves through the world — active, directional, consequential (not wiki lore pages).

**Guiding doctrine:** Organizations describe how power moves through the world (counterpart to ancestry's lived peoples).

**Overview dashboard:** Current Pressures (primary aliveness), compact Why Now (world state + party standing + tensions), teaser links to deeper tabs — restrained, not dashboard soup.

**Tabs:** Overview, Structure, Presence, Relations, People, Lore, Continuity (DM).

**Hub:** `OrganizationHubView` with hierarchy / world-state / region grouping, symbol glyph cards, party reputation bands.

**Metadata:** world state, current pressures, public/private duality, presence lists, influence mode, organizational visibility, symbol preset + doctrine tint, structural role for sub-orgs.

**System blocks:** `entity-org-hero`, `wiki-infobox`, `text-tiptap` (layout-hidden).

**Deferred:** full heraldry uploads, institutional vs personal relations layer, temporal identity eras, political map overlays.

---

## FamilyPageShell — dynasty / lineage tracker

**Narrative frame:** bloodlines, alliances, scandals, inheritance, branches.

**Overview dashboard:** bloodline summary, current head, active branches, notable alliances.

**Tabs (examples):** Lineage (primary), Branches, Notable Members, Alliances.

**System blocks:** family-hero, lineage graph data, branch registry.

---

## GenericWikiPageShell — fallback

Wraps current `EntityWorkspaceSurface` behavior for threads, scenes, and unmigrated entity types. Uses shared `wikiPageSubviews.ts` with block-filtered Overview until migrated.

## Shared entity page shell (`EntityPageShellView`)

**Narrative frame:** One compositor owns hero + Overview dashboard + content tabs. Entities plug in hero and overview components; shell owns layout only.

**Shipped on compositor:** Character (Identity + Description), Quest (narrative-first section Overview).

**Shared IA spine (extensible per entity):**

```text
Identity
Overview
Description
Entity Sections
Notes
Advanced
```

**Quest Overview (reference multi-section narrative editing):** Identity (type, narrative status, visibility) → Overview (`summary`) → Description (TipTap) → People & Places → Time & Consequences → Rewards → GM Notes → Advanced (board status, diagnostics, engine fields).

**Future adopters:** Locations, Organizations, Families, Bestiary, Ancestries, Events, Rules — register shell config + overview dashboard; migrate off generic wiki shell incrementally.

## Registration

Add each shell to `registry.ts` via `registerEntityPageShell(key, shell)` when implemented.
