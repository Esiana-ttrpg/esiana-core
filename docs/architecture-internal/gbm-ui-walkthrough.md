# Girl by Moonlight — Post-Import UI Walkthrough

Manual verification checklist after importing `girl-by-moonlight-one-shot` from **demo-content-packs**. Run as GM with full campaign access.

## Setup

1. If you authored packs in `community-plugins/demo-content-packs`, run `npm run plugins:link` from **esiana-core** and restart the backend so the wizard sees updated `manifest.json` entries.
2. Admin → Plugins → enable **Demo Content Packs**
3. Create Campaign → Content Packs → **Girl by Moonlight (Flagship Demo)**
4. Complete wizard; open Campaign Home

## Cross-system matrix

| Connection | Verify |
|------------|--------|
| Character ↔ Organization | Each PC (`pc-hana`, `pc-mira`, `pc-yuki`, `pc-ren`) has org affiliation metadata + relation edges |
| Character ↔ Family | `family-shirogane`, `family-ashvale` link to PCs via lineage fields |
| Character ↔ Quest | PCs show `activeArc` / `motivation`; quests reference givers |
| Quest ↔ Thread | `quest-find-idol`, `quest-investigate-ruins`, `quest-confront-regent` link to threads |
| Thread ↔ Arc | `arc-moonfall` contains thread + quest refs |
| Scene ↔ Quest | `scene-rooftop-confession` links objectives/threads |
| Haven ↔ Project | `project-repair-observatory` → `haven-school-rooftop`; `project-community-trust` → haven |
| Timeline ↔ entities | `event-founding-ritual`, `event-recent-eclipse`, `event-future-convergence` reference orgs/locations |
| Knowledge ↔ Quest | `lore-directorate-secret` (DM-only); `lore-moon-curse` party-visible; `knowledge.json` claims |
| Map ↔ Location | `map-city-overview` **illustrated map** with pins for academy, directorate, broadcast, observatory, shrine, ashvale, rooftop haven |
| Object ↔ Quest | `obj-lunar-idol` tied to `quest-find-idol` |
| Bestiary ↔ Location | `beast-moon-hound` inhabits `loc-old-shrine` |
| Scene ↔ Quest | `scene-rooftop-confession` (PLAYED) and `scene-yuki-room-gathering` (PLANNED) link quests/threads |
| Fifth Witness | Seeds across eclipse event, founding ritual, idol quest, city-secret thread, rooftop scene, journals — unresolved |

## UI state coverage

| System | Pages exercising states |
|--------|-------------------------|
| Quest | active (`quest-find-idol`), completed, failed (`quest-failed-ritual`), hidden DM (`quest-hidden-pact`), available, abandoned |
| Thread | open (`thread-city-secret`), escalating (`thread-cost-of-power`), resolved (`thread-resolved-oath`), dormant (`thread-hope-vs-despair`) |
| Project | active (`project-relic-research`), blocked (`project-repair-observatory`), completed (`project-community-trust`) |
| Haven | healthy (`haven-ashvale-apartment`), threatened (`haven-arcade-loft`), upgraded (`haven-school-rooftop`) |

## Surface checklist (non-empty)

| Surface | Expected content |
|---------|------------------|
| Campaign Home | Hero **cover image** from `campaign.json` `coverImagePath`; tagline from `campaignHomeIntro`; At a Glance; Current Story; Party roster (4 PCs with **portraits**); Recent Activity |
| Party | 4 PCs with appearance forms, **wired portrait URLs**, personal stakes in prose |
| Adventure Hub | Multiple quests, arc, **two scenes** (rooftop PLAYED + Yuki room PLANNED) |
| Thread Hub | Four threads in varied states |
| Timeline / Chronology | Past, recent, future event pages |
| Organizations | 6 orgs with diplomatic relations |
| Families | Shirogane + Ashvale lineage |
| Characters | Full appearance profiles |
| Locations | Lunar City region + sub-locations |
| Maps | City overview with pins |
| Projects | Three projects |
| Havens | Three havens |
| Journals | Party recap + private journal — **primary story delivery** |
| Session Notes | **Session zero** — campaign entry point (5–6 paragraphs) |
| Bestiary | Moon hound |
| Objects | Lunar idol |
| Discovery / Lore | Claims from `knowledge.json` where UI exposes them |

## Regression packs (frozen)

After GbM passes, smoke-test:

- `tomb-of-horrors-demo` — wikilinks, skeleton, calendar import
- `player-experience-demo` — visibility tiers, DM-only pages

No new feature scope on regression packs.
