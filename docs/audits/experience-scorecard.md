# Experience scorecard

Baseline audit of seven canonical routes against [experience-doctrine.md](../experience-doctrine.md). Scores **1–5** per dimension; **3** = acceptable, **4+** = converged, **≤2** = gravity failure requiring backlog entry.

**Audit method:** Code and component structure review (2026-06-22). Re-run quarterly with screenshots and maintainer squint test.

**Lead question:** *Where does attention settle?*

---

## Summary

| Route | Gravity (avg) | Design language | P0 issue |
|-------|---------------|-----------------|----------|
| Campaign Home (briefing) | 3.4 | Converged briefing | Continuity competes with stacked cards |
| Campaign Home (customize) | 1.8 | Legacy dashboard | No gravitational center |
| Character entity | 2.2 | Transitional | Overview tab = equal-weight card grid |
| Organization entity | 2.0 | Transitional | Overview vs hero compete; pressures not focal |
| Location entity | 2.5 | Legacy workspace | No dedicated shell; generic codex layout |
| Adventure (storyboard) | 2.8 | Tool surface | Canvas OK; chrome dense |
| Journal / session notes | 3.2 | Mixed | Index operational; editor converged |
| Timeline / chronology | 2.6 | Operator tool | View switcher competes with content |

**Cross-route finding:** Character, Organization, and Campaign Home (customize) share **absent gravity** — not card count. Briefing mode is closest to doctrine but continuity is not yet the single anchor.

---

## 1. Campaign Home (briefing mode)

**Declared state object:** Campaign pulse — what matters now.  
**Representation:** Continuity stream + briefing stack.  
**Gravitational center (should):** `CampaignContinuityStream` or `CampaignStateCard` pulse line.  
**Gravitational center (today):** Split between `CampaignDashboardHero` (greeting/title) and `CampaignStateCard` — eye lands on hero first, not continuity.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 3 | Hero + state card compete; stream often below fold |
| Campaign state obvious? | 4 | Pulse intent clear in briefing stack |
| Gravity differential? | 3 | Levels 2–6 similar `SURFACE_FLOAT` weight |
| Typographic gravity? | 4 | `TYPE_DISPLAY` on hero; prose in state card |
| Primary action obvious? | 3 | Customize buried; no single "continue" |
| Reading path | 4 | Top-down briefing levels |
| Header pattern | 4 | Matches dashboard composition |
| Action placement | 3 | Customize in hero operational zone |
| Spacing rhythm | 4 | `CampaignHomeLevel` gaps |
| Surface hierarchy | 4 | `NarrativeLayout`, context rail recessed |
| State-first? | 4 | Briefing is state, not admin |
| Pacing tempo | 3 | Medium density throughout levels |
| Signature (continuity) | 3 | Present but not at gravity center |

---

## 2. Campaign Home (customize mode)

**Declared state object:** None — layout editor.  
**Gravitational center (today):** None — `DashboardGrid` widget peers.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 1 | Equal widget tiles |
| Campaign state obvious? | 2 | Widgets show fragments, not unified pulse |
| Gravity differential? | 1 | `react-grid-layout` equal cells |
| Typographic gravity? | 2 | Per-widget ad-hoc type |
| Primary action obvious? | 3 | Add widget / save layout |
| State-first? | 1 | Operator layout tool |
| Signature (continuity) | 1 | Lost in widget wall |

**Remediation:** Customize is operational mode — acceptable if visually distinct from briefing; must not be default Campaign Home entry.

---

## 3. Character entity

**Declared state object:** Character's current truth (identity, status, relationships).  
**Representation:** Hero + overview dashboard OR prose tabs.  
**Gravitational center (should):** `CharacterHeroSurface` identity (name, portrait, status).  
**Gravitational center (today):** Hero, then **equal-weight** `DashboardCard` grid on Overview tab.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 2 | Overview cards pull eye away from hero |
| Campaign state obvious? | 3 | Hero identifies character; overview dilutes |
| Gravity differential? | 2 | `DashboardCard` identical chrome per card |
| Typographic gravity? | 2 | Cards use `text-xs uppercase` headers — meta shouts |
| Primary action | 3 | Jump-to-tab on cards |
| State-first? | 2 | Overview tab is dashboard-first, not narrative |
| Signature (continuity) | 2 | No since-last-visit at focal weight on overview |

**Key files:** `CharacterPageShellView.tsx`, `CharacterOverviewDashboard.tsx` (`DashboardCard` pattern).

---

## 4. Organization entity

**Declared state object:** Institutional power — pressures, presence, structure.  
**Gravitational center (should):** Current pressures / why now (per `future-shells.md` intent).  
**Gravitational center (today):** `OrganizationHeroSurface` + `OrganizationOverviewDashboard` card grid — pressures not single anchor.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 2 | Hero vs overview cards |
| Campaign state obvious? | 3 | Org identity clear; power state diffuse |
| Gravity differential? | 2 | Overview dashboard equal cards |
| Typographic gravity? | 2 | Uppercase micro-headers on cards |
| State-first? | 2 | Overview summarizes instead of showing pressures as stream |
| Signature (continuity) | 2 | Continuity tab immature; not on overview |

**Key files:** `OrganizationPageShellView.tsx`, `OrganizationOverviewDashboard.tsx`.

---

## 5. Location entity

**Declared state object:** Place — geography, atmosphere, controlling factions.  
**Representation:** Should be canvas + narrative (per `future-shells.md`); **not shipped**.  
**Gravitational center (today):** Generic `EntityWorkspaceSurface` / wiki blocks — no location shell.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 2 | Infobox + prose blocks equal weight |
| Campaign state obvious? | 3 | Title identifies place |
| Gravity differential? | 2 | No map thumbnail focal anchor |
| State-first? | 3 | Lore-forward but undifferentiated |
| Signature (continuity) | 2 | No location-specific change signal |

**Note:** LocationPageShell deferred — scores reflect unmigrated entity workspace.

---

## 6. Adventure (storyboard / threads)

**Declared state object:** Thread timeline, scenes, beats.  
**Representation:** Canvas (storyboard) + timeline sections.  
**Gravitational center (today):** `StoryboardCanvas` when in board mode; timeline views split focus.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 3 | Canvas works; filters/toolbars compete |
| Campaign state obvious? | 4 | Adventure state clear |
| Gravity differential? | 3 | Canvas vs dense inspector |
| Typographic gravity? | 2 | Storyboard nodes ad-hoc; micro-labels |
| Pacing tempo | 2 | Flat density in timeline cards |
| Signature (continuity) | 3 | Thread history present; not focal |

**Key files:** `StoryboardSection.tsx`, `StoryboardCanvas.tsx`, `SceneTimelineSection.tsx`.

---

## 7. Journal / session notes

**Declared state object:** Session narrative — what happened, what's next.  
**Representation:** Editorial (note body) + index ledger.  
**Gravitational center (should):** Open note prose column.  
**Gravitational center (today):** Index: notebook list; Editor: `SessionNoteEditor` prose — **converged in editor**.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 3 | Index is operational; editor is 4+ |
| Campaign state obvious? | 4 | Note title + body |
| Gravity differential? | 3 | Index dense; editor good |
| Typographic gravity? | 3 | `SessionNoteEditor` uses surface tokens; index ad-hoc |
| State-first? | 4 | Notes are state |
| Signature (continuity) | 3 | Session-scoped; weak cross-session pulse |

**Key files:** `SessionNotesView.tsx`, `SessionNoteEditor.tsx`, `PlayerSessionNotesPage.tsx`.

---

## 8. Timeline / chronology

**Declared state object:** When things happened — calendar, events, feed.  
**Representation:** Timeline / ledger / calendar canvas.  
**Gravitational center (today):** `UniverseHeader` view switcher + active view — **header competes with content**.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Where does attention settle? | 2 | Multi-view chrome |
| Campaign state obvious? | 4 | Temporal state is the page |
| Gravity differential? | 2 | Header pills + sidebar + main equal busy |
| Typographic gravity? | 2 | `text-[10px]` in calendar grids |
| Pacing tempo | 2 | Dense throughout |
| Signature (continuity) | 4 | Inherently temporal — strongest continuity surface |

**Key files:** `ChronologyPage.tsx`, `UniverseHeader.tsx`, `WidescreenCalendarView.tsx`.

---

## Scorecard template (copy for new routes)

| Question | 5 | 1 |
|----------|---|---|
| Where does attention settle? | One center in 2s squint | Eye wanders |
| Campaign state obvious? | Clear state object | Unclear purpose |
| Gravity differential? | Primary visibly heavier | Equal weight throughout |
| Typographic gravity? | One display anchor | Multiple display-scale headers |
| Primary action obvious? | One CTA in declared zone | Scattered actions |
| Reading path obvious? | Center outward | Z-scan competition |
| Same header pattern? | Route template | One-off chrome |
| Same action placement? | Action matrix | Random placement |
| Same spacing rhythm? | Void isolates center | Uniform padding |
| Same surface hierarchy? | Canvas recedes | All bordered equally |
| State-first? | One state object | Admin chrome competes |
| Pacing tempo? | Dense center, sparse edge | Flat medium density |
| Signature (continuity)? | Continuity at/near center | Generic CRUD |

---

## Baseline metrics (grep, 2026-06-22)

| Metric | Count | Doctrine note |
|--------|-------|---------------|
| Files referencing `TYPE_*` classes | ~27 | Low adoption vs hundreds of components |
| Files with `text-[9–11px]` | ~200+ | Meta tier shouting |
| `react-grid-layout` usage | 4 files | Campaign customize + wiki layout |
| `Needs Attention` (hub) | 1 component | IA anti-pattern #15 |
| Entity `*OverviewDashboard` | 4 shells | Equal-weight card grids |
