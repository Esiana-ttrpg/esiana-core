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

## LocationPageShell — setting atlas entry

**Narrative frame:** spatial readability, travel context, environmental framing.

**Overview dashboard:** map thumbnail, atmosphere summary, travel links, controlling factions.

**Tabs (examples):** Geography, Atmosphere, Factions, Events — no Discovery or Continuity tabs; continuity warnings via rail only if needed.

**System blocks:** location-hero metadata, atmosphere prose, map reference data.

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

Wraps current `EntityWorkspaceSurface` behavior for quests, threads, scenes, and unmigrated entity types. Uses shared `wikiPageSubviews.ts` with block-filtered Overview until migrated.

## Registration

Add each shell to `registry.ts` via `registerEntityPageShell(key, shell)` when implemented.
