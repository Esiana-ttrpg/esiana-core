# Downtime havens (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure (simulation substrate)  
**Status:** Implemented (Phase 3 entity + overview UI; Phase 3b lightweight simulation)  
**Modules:** [`shared/havenMetadata.ts`](../../shared/havenMetadata.ts), [`shared/havenSimulation.ts`](../../shared/havenSimulation.ts), [`backend/src/lib/downtimeHavenService.ts`](../../backend/src/lib/downtimeHavenService.ts), [`backend/src/lib/havenSimulationService.ts`](../../backend/src/lib/havenSimulationService.ts), [`backend/src/lib/buildHavenPresentation.ts`](../../backend/src/lib/buildHavenPresentation.ts)

## Philosophy

> **Havens are persistent narrative anchors — not transient operations like projects.**

```text
WikiPage        = narrative surface (title, blocks, visibility, lore prose)
DowntimeHaven   = persistent anchor state (status, presence, history, scars)
```

```text
Projects create punctuated change.
Simulation creates ambient pressure.
Activity logs unify both into campaign memory.
```

Projects leave **visible historical scars** on havens via `haven_effect` outcomes. Havens accumulate **campaign memory** through authored, outcome-driven, and time-driven activity entries.

## Storage model

| Surface | Location |
|---------|----------|
| Title, blocks, visibility | `WikiPage` under `Downtime › Havens` |
| Simulation fields | `DowntimeHaven` table (1:1 via `wikiPageId`) |

**Linked projects** are not denormalized — query `DowntimeProject WHERE havenPageId = haven.wikiPageId`.

## Identity fields (presentation + future filters)

| Field | Purpose |
|-------|---------|
| `scale` | outpost, modest, sprawling, legendary |
| `ownershipType` | party, faction, shared, patron_owned |
| `primaryTheme` | smuggler, arcane, militant, noble, sacred, neutral |
| `establishedAt` | When the haven entered campaign play |
| `discoveryState` | Narrative visibility: public, known, concealed, mythic (distinct from wiki visibility) |

## Presence

| Field | Purpose |
|-------|---------|
| `residentPageIds` | Character wiki pages currently associated |
| `factionPageIds` | Linked organization pages |
| `crew` | Freeform roles with optional character page links |

## Narrative state (JSON arrays)

- **`upgrades`** — landmarks and facilities (*"Hidden smuggler docks"*, not numeric stats)
- **`threats`** — narrative pressure with optional severity (`low`, `rising`, `critical`)
- **`passiveBenefits`** — capability prose (*"Safe harbor for smugglers"*)
- **`activityLog`** — campaign memory feed with `origin` (`manual`, `project_outcome`, `future_simulation`, `migration`) and optional `sourceProjectId`

## Lightweight simulation (Phase 3b)

Stored in `simulationHints.havenSimulation` — **no extra Prisma columns**.

| Concept | Behavior |
|---------|----------|
| **Opt-in** | `enabled: false` by default; GM enables per haven in Manage haven |
| **Campaign clock** | Master switch — havens only react when time advances |
| **Axes** | `prosperity`, `danger`, `morale`, `notoriety`, `stability`, `security` — internal 0–100, UI shows **bands only** |
| **lockedAxes** | Per-axis drift freeze (cursed haven, permanent danger, faction support) |
| **pausedReason** | Suspends simulation while keeping opt-in enabled (stasis, abandonment, GM lock) |
| **Time hook** | `haven_updates` → `haven-simulation-v2` on global time advance |
| **Threat escalation** | Unresolved `low` threats → `rising` after 14 campaign days; `rising` → `critical` after 7 more days (`sinceEpochMinute` resets per tier; one tier per hook pass — no skipping). Runs **before** axis simulation so updated severity feeds `danger` drivers. Deterministic activity log copy. Module: [`shared/downtimeContinuityIntegration.ts`](../../shared/downtimeContinuityIntegration.ts), [`backend/src/lib/havenThreatEscalationService.ts`](../../backend/src/lib/havenThreatEscalationService.ts) |
| **Activity** | Band crossings and threat promotions; fiction-first prose (`origin: future_simulation`) |
| **Headline** | Dominant pressure prose on hub cards and overview (not raw axis labels) |
| **axisDrivers** | GM tooltip explainability (*"unresolved threats"*, *"failing stability"*) |

Significance thresholds reduce twitch on short advances (e.g. prosperity needs ≥1 week elapsed; notoriety ≥30 days).

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/downtime/havens` | Party (visibility-filtered situation cards via hub) |
| GET | `/downtime/havens/by-wiki/:wikiPageId` | Party |
| GET | `/downtime/havens/:id` | Party |
| GET | `/downtime/havens/:id/overview` | Party (activity-first projection payload) |
| POST | `/downtime/havens` | GM/Writer |
| PATCH | `/downtime/havens/:id` | GM/Writer (`havenSimulation` partial merge supported) |
| DELETE | `/downtime/havens/:id` | GM/Writer (blocked if active projects linked) |

## Identity layer (`identityHints` + wiki banner)

Optional presentation fields on `DowntimeHaven` (`downtime-haven-v2`):

| Field | Purpose |
|-------|---------|
| `identityHints.summary` | Short “what is this place?” blurb |
| `identityHints.portraitAssetId` | Key art |
| `identityHints.crestAssetId` | Faction / crest icon |
| `identityHints.galleryAssetIds[]` | Ambient gallery (ordered) |
| `WikiPage.featuredImageId` | Banner (wiki surface — not duplicated on haven row) |
| `locationPageId` | Region / location association (wiki page FK) |

Havens without images remain complete — identity strip collapses to title + summary + location chips.

## References layer (`references` JSON)

Typed, relationship-driven links — **not** file attachments or embedded rule text:

| `type` | Typical target | Opens in |
|--------|----------------|----------|
| `map`, `vtt_scene` | `asset` or map wiki page | Maps module |
| `rules`, `handout`, `wiki_page` | wiki page | Wiki |
| `timeline_event` | `calendar_event` | Chronology |
| `external_doc` | `url` | External |
| `image` | `asset` | Asset viewer |

`relatedPageIds` remains a parallel generic wiki link list (not migrated into references).

## Spaces layer (`spaces` JSON) — phase 1 lite

Label + optional one-liner sub-areas (e.g. War Room, Forge Wing). Per-space reference bundles deferred.

## Module boundaries

| Module answers | Haven must not become |
|----------------|----------------------|
| Haven — “Why does this matter?” | Map editor, file browser, rules compendium |
| Maps — “Where exactly?” | Dropbox-with-castle-skin dashboard |
| Wiki — “What is canonically true?” | |
| Operations — “What is happening?” | |

## Entity graph

Haven edges sync to `EntityRelation` on create/update/delete (`sourceDomain: downtime`):

- `HAVEN_LOCATION`, `HAVEN_RESIDENT`, `HAVEN_FACTION`, `HAVEN_RELATED`, `HAVEN_REFERENCE`

Source entity is the haven wiki page id. Enables location pages to discover linked havens via graph traversal.

## UI surfaces

1. **Downtime hub `?section=havens`** — situation-board cards (pressure headline, recent activity, threats, ops, present)
2. **Haven wiki page (`DOWNTIME_HAVEN`)** — narrative overview via `HavenOverviewView`

Overview layout: **Identity strip** → Status pulse → **Underlying pressures** (when simulation active) → **Recent changes** → **References** → **Spaces** → Active operations → Threats → Improvements → Present → Lore (collapsible).

Editing maps, rules, and assets stays in their owning modules; Manage haven links references only.

## Project integration — `haven_effect`

When a project completes with a `haven_effect` outcome:

1. Resolves target haven via `linkedPageIds[0]` (haven wiki page id)
2. Appends `activityLog` entry with `origin: 'project_outcome'` and `sourceProjectId`
3. Optionally patches `status`, appends upgrade/threat entries with provenance
4. Optional `simulationDeltas` nudge axis values (punctuated intervention, not ambient drift)

See [downtime-projects.md](./downtime-projects.md) for outcome executor details.

## Related

- [downtime-projects.md](./downtime-projects.md) — project model and `haven_effect`
- [global-time-hooks.md](./global-time-hooks.md) — time advance spine
- [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md) — phased plan
