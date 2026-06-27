# Experience convergence backlog

Gravity-keyed remediation from [experience-scorecard.md](./experience-scorecard.md). **Declare gravitational center per route before component changes.**

Priority: **P0** = no clear landing point on core routes; **P1** = equal-weight regions; **P2** = tempo/typography; **P3** = deferred aesthetics.

Related: [experience-doctrine.md](../experience-doctrine.md), [deprecated-ui-patterns.md](../deprecated-ui-patterns.md).

---

## Declared gravitational centers (target state)

| Route | State object | Representation | Gravitational center (target) |
|-------|--------------|----------------|------------------------------|
| Campaign Home (briefing) | Campaign pulse | Continuity stream | `CampaignContinuityStream` + `CampaignStateCard` — hero recedes |
| Campaign Home (customize) | Layout prefs (operational) | Widget bank | Operational chrome only — never default view |
| Character | Character current truth | Narrative + compact facts | `CharacterHeroSurface` — overview orbits hero, no equal card grid |
| Organization | Power / pressures | Stream + tabs | Current pressures as prose stream — not card grid |
| Location | Place identity | Canvas + narrative | Location hero + map/atmosphere focal (when shell ships) |
| Adventure | Thread/scene state | Storyboard canvas | `StoryboardCanvas` — toolbars recessed |
| Session notes (editor) | Session narrative | Editorial | Note prose column |
| Session notes (index) | Note catalog | Table/list | Selected note or search — index recessed |
| Chronology | Temporal state | Calendar/timeline | Active view content — header recessed |

---

## P0 — Declare gravitational center

### Character page

**Failure:** Overview tab `DashboardCard` grid (`CharacterOverviewDashboard.tsx`) competes with `CharacterHeroSurface`.

**Direction:**

1. Name hero as sole display anchor; demote overview to recessed meta + prose lede (biography excerpt at `TYPE_PROSE`).
2. Replace equal cards with **one** summary stream + deep links to tabs — not six bordered peers.
3. Add since-last-visit / change line at prose tier near hero (continuity #15).

**Files:** `CharacterPageShellView.tsx`, `CharacterOverviewDashboard.tsx`, `CharacterHeroSurface.tsx`.

### Organization page

**Failure:** `OrganizationOverviewDashboard` card grid vs hero; `future-shells.md` intent (pressures as aliveness) not reflected in UI.

**Direction:**

1. Gravitational center = **current pressures** as editorial stream (or hero-embedded pressures block at display weight).
2. Collapse overview cards into orbit links — Structure, Presence, Relations as recessed rows.
3. Continuity signal on overview at meta/prose tier.

**Files:** `OrganizationPageShellView.tsx`, `OrganizationOverviewDashboard.tsx`.

### Campaign Home — briefing vs customize

**Failure:** Briefing — hero greeting steals gravity from continuity. Customize — widget peers with no center.

**Direction:**

1. Briefing: Demote `CampaignDashboardHero` to environmental frame; elevate `CampaignContinuityStream` to focal column top (or merge pulse into state card as single anchor).
2. Customize: Visual distinction as operational mode; never land new users in grid. `DashboardGrid` widgets at `region-depth-1` only.
3. Default entry remains briefing stack (`CampaignHomeBriefing`).

**Files:** `CampaignDashboardPage.tsx`, `CampaignHomeBriefing.tsx`, `CampaignDashboardHero.tsx`, `CampaignContinuityStream.tsx`, `DashboardGrid.tsx`.

---

## P1 — Equal-weight regions

### Entity overview dashboards (all shells)

**Components:** `CharacterOverviewDashboard`, `OrganizationOverviewDashboard`, `CreatureOverviewDashboard`, `AncestryOverviewDashboard`.

**Pattern to retire:** `DashboardCard` with `text-xs uppercase tracking-wider` titles — violates principles 5, 7, 8.

**Replace with:** Depth-lifted inset sections (`region-depth-3`) without bordered peers; one dominant section per overview.

### Global Hub — Needs Attention / activity stack

**Components:** `HubAttentionQueue.tsx` ("Needs Attention"), `HubRecentActivity.tsx`, `HubResumeHero.tsx`.

**Direction:** Single "Continue" or campaign resume line at display weight; demote attention queue to meta tier or remove. Activity belongs on Campaign Home continuity stream only (doctrine IA #17).

### Action placement at equal prominence

**Audit:** Scatter edit buttons across overview cards, hero strips, rails at same visual weight.

**Direction:** Apply [action placement matrix](../experience-doctrine.md#action-placement) per route; one primary page action.

---

## P2 — Tempo and typography

### Adventure / chronology flat density

**Targets:** `ChronologyPage.tsx` (header + sidebar + main), `SceneTimelineSection.tsx`, storyboard inspector.

**Direction:** Void band below `UniverseHeader`; single scroll context; dense only at canvas/timeline spine.

### Typography adoption

**Baseline:** ~27 files use `TYPE_*`; ~200+ use micro-labels.

**Direction:**

1. New UI: mandatory `TYPE_DISPLAY` / `TYPE_PROSE` / `TYPE_META`.
2. Migrate heroes: `RecruitmentHero`, `dashboardHeroPresentation.ts` → `TYPE_DISPLAY` + CSS vars.
3. Remove `uppercase` from `Sidebar` `ZoneHeading` when touching sidebar.
4. Align `--text-measure-ch` to 68 per density-doctrine (separate token fix).

### Metadata editor badge walls

**Targets:** `OrganizationMetadataEditor.tsx`, `BestiaryMetadataEditor.tsx`, `CharacterIdentityEditor.tsx`, `codexMetadataEditorShared.tsx`.

**Direction:** Progressive disclosure lists; section titles at meta tier only.

---

## P3 — Deferred (subordinate to doctrine)

| Item | Notes |
|------|-------|
| Theme FOUC (`theme-init.js` drift) | Aesthetics after gravity |
| `dark:` vs `theme-*` mismatch | Token hygiene |
| Hub ambient gradient intensity | Global hub language |
| Violet hardcoding in badges | Palette propagation |

---

## Governance

- **PR template addition:** "Gravitational center: ___ | Principles touched: ___"
- **Quarterly:** Re-score seven routes in experience-scorecard.md
- **New routes:** Complete design review block in experience-doctrine.md before merge

---

## Success metrics

| Metric | Baseline (2026-06) | Target (2 cycles) |
|--------|-------------------|-------------------|
| Avg gravity score (7 routes, briefing) | ~2.8 | ≥4.0 |
| Character / Org / CH gravity score | ≤2.2 | ≥4.0 |
| Files with `TYPE_*` on touched routes | ~27 total | +100% on P0 routes |
| `Needs Attention` on hub | 1 | 0 or recessed |
| Overview `DashboardCard` grids on P0 entities | 2 | 0 |
