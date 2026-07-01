# Experience convergence backlog

Gravity-keyed remediation from [experience-scorecard.md](./experience-scorecard.md). **Declare gravitational center per route before component changes.**

Priority: **P0** = no clear landing point on core routes; **P1** = equal-weight regions; **P2** = tempo/typography; **P3** = deferred aesthetics.



Priority: **P0** = shell contract + gravitational center on core routes; **P1** = equal-weight regions; **P2** = tempo/typography; **P3** = deferred aesthetics.



Related: [experience-doctrine.md](../experience-doctrine.md), [deprecated-ui-patterns.md](../deprecated-ui-patterns.md).



---



## Declared gravitational centers (target state)



| Route | State object | Representation | Gravitational center (target) |

## P0 — Declare gravitational center

### Character page

**Failure:** Overview tab `DashboardCard` grid (`CharacterOverviewDashboard.tsx`) competes with `CharacterHeroSurface`.


**Canonical primitives:** `CategoryHubShell`, `CategoryIndexToolbar`, `WorkspaceActionBar`, `WorkspaceHeader`, `WorkspaceModeToggle`.
1. Name hero as sole display anchor; demote overview to recessed meta + prose lede (biography excerpt at `TYPE_PROSE`).
2. Replace equal cards with **one** summary stream + deep links to tabs — not six bordered peers.
3. Add since-last-visit / change line at prose tier near hero (continuity #15).
**Adopted by:** Characters, Organizations, Locations, Families, Bestiary, Maps, Thread/Quest hubs, Session notes index, Chronology (toolbar zone).


### Organization page
**Outlier fixes:**
**Failure:** `OrganizationOverviewDashboard` card grid vs hero; `future-shells.md` intent (pressures as aliveness) not reflected in UI.


| Route | Drift | Target |
1. Gravitational center = **current pressures** as editorial stream (or hero-embedded pressures block at display weight).
|-------|-------|--------|
3. Continuity signal on overview at meta/prose tier.
| Maps | Was direct `WikiWorkspaceShell` | `CategoryHubShell` + upload via `createAction` |

| Organizations | Custom group pills | `WorkspaceModeToggle` in `modeControl` slot |
### Campaign Home — briefing vs customize
| Bestiary | Custom browse toggle | Align with `CategoryIndexViewToggle` or `viewControl` slot |
**Failure:** Briefing — hero greeting steals gravity from continuity. Customize — widget peers with no center.
| Character / Bestiary hubs | Duplicated rail toggle | `CategoryHubContextRailToggle` |


1. Briefing: Demote `CampaignDashboardHero` to environmental frame; elevate `CampaignContinuityStream` to focal column top (or merge pulse into state card as single anchor).
2. Customize: Visual distinction as operational mode; never land new users in grid. `DashboardGrid` widgets at `region-depth-1` only.
3. Default entry remains briefing stack (`CampaignHomeBriefing`).


### P0.2 — Entity header convergence (Track A)



**Goal:** Every entity route composes `EntityHeader` slots regardless of Phase 2 shell vs generic workspace.



**Slots:** display · meta · actions · continuity · atmosphere
**Pattern to retire:** `DashboardCard` with `text-xs uppercase tracking-wider` titles — violates principles 5, 7, 8.

**Replace with:** Depth-lifted inset sections (`region-depth-3`) without bordered peers; one dominant section per overview.
**Migration:** Extract from `*HeroSurface` read modes; wire continuity on Overview; document in `entityPageShells/types.ts` and `future-shells.md`.


**Components:** `HubAttentionQueue.tsx` ("Needs Attention"), `HubRecentActivity.tsx`, `HubResumeHero.tsx`.
**Keep separate:** `WikiPageRuntimeToolbar` = global page ops; `EntityHeader.actions` = entity-scoped ops.
**Direction:** Single "Continue" or campaign resume line at display weight; demote attention queue to meta tier or remove. Activity belongs on Campaign Home continuity stream only (doctrine IA #17).


### P0.3 — Representation pass (Track B)
**Audit:** Scatter edit buttons across overview cards, hero strips, rails at same visual weight.




#### Character page



**Failure:** Overview tab `DashboardCard` grid competes with `CharacterHeroSurface`.
**Targets:** `ChronologyPage.tsx` (header + sidebar + main), `SceneTimelineSection.tsx`, storyboard inspector.

**Direction:** Void band below `UniverseHeader`; single scroll context; dense only at canvas/timeline spine.
**Direction:**


**Baseline:** ~27 files use `TYPE_*`; ~200+ use micro-labels.

**Direction:**

1. New UI: mandatory `TYPE_DISPLAY` / `TYPE_PROSE` / `TYPE_META`.
2. Migrate heroes: `RecruitmentHero`, `dashboardHeroPresentation.ts` → `TYPE_DISPLAY` + CSS vars.
3. Remove `uppercase` from `Sidebar` `ZoneHeading` when touching sidebar.
4. Align `--text-measure-ch` to 68 per density-doctrine (separate token fix).
1. Hero = sole display anchor; overview = recessed meta + biography lede (`TYPE_PROSE`).

2. One summary stream + deep links to tabs — not six bordered peers.
**Targets:** `OrganizationMetadataEditor.tsx`, `BestiaryMetadataEditor.tsx`, `CharacterIdentityEditor.tsx`, `codexMetadataEditorShared.tsx`.

**Direction:** Progressive disclosure lists; section titles at meta tier only.
**Files:** `CharacterPageShellView.tsx`, `CharacterOverviewDashboard.tsx`, `CharacterHeroSurface.tsx`.



#### Organization page


| Theme FOUC (`theme-init.js` drift) | Aesthetics after gravity |
**Failure:** `OrganizationOverviewDashboard` card grid vs hero; pressures not at focal weight.



**Direction:**



- **PR template addition:** "Gravitational center: ___ | Principles touched: ___"

- **New routes:** Complete design review block in experience-doctrine.md before merge

---

## P2 — Global chrome

### Account nav and campaign switcher

**Failure:** Campaign switcher lives in the left identity cluster (`CampaignPicker`); account menu duplicates “Your Campaigns” as a flat link; doctrine places switcher in global top-right.

**Direction:**

1. Slim primary account menu: Switch Campaign sub-panel, Profile, Settings, Administration, Log out.
2. Switch panel as routing-only surface: Recent (3) + membership roster + Create Campaign.
3. Campaign header left cluster: identity link only (no chevron picker).

Plan: [header-account-nav.md](../plans/header-account-nav.md).

3. Continuity signal at meta/prose tier.



**Files:** `OrganizationPageShellView.tsx`, `OrganizationOverviewDashboard.tsx`.

#### Campaign Home — briefing vs customize

| Files with `TYPE_*` on touched routes | ~27 total | +100% on P0 routes |
| `Needs Attention` on hub | 1 | 0 or recessed |

**Failure:** Hero greeting steals gravity from continuity. Customize — widget peers with no center.


**Direction:**



1. Briefing: Demote `CampaignDashboardHero` to environmental frame; elevate `CampaignHomeBriefing` / `CampaignContinuityStream` above widget grid.

2. Customize: `DashboardGrid` at `region-depth-1` operational styling; never default entry.

3. Default entry remains briefing stack.



**Files:** `CampaignDashboardPage.tsx`, `CampaignHomeBriefing.tsx`, `CampaignDashboardHero.tsx`, `CampaignContinuityStream.tsx`, `DashboardGrid.tsx`.



---



## P1 — Equal-weight regions



### Entity overview dashboards (all shells)



**Components:** `CharacterOverviewDashboard`, `OrganizationOverviewDashboard`, `CreatureOverviewDashboard`, `AncestryOverviewDashboard`.



**Pattern to retire:** `DashboardCard` with equal bordered peers — violates principles 5, 7, 8.



**Replace with:** Depth-lifted inset sections (`region-depth-3`); one dominant section per overview.



### Global Hub — Needs Attention / activity stack



**Components:** `HubAttentionQueue.tsx`, `HubRecentActivity.tsx`, `HubResumeHero.tsx`.



**Direction:** Single resume line at display weight; demote attention queue. Activity on Campaign Home continuity stream only.



### Action placement at equal prominence



**Direction:** Apply [action placement matrix](../experience-doctrine.md#action-placement) per route; one primary page action.



---



## P2 — Tempo and typography



### Adventure / chronology flat density



**Targets:** `ChronologyPage.tsx`, `SceneTimelineSection.tsx`, storyboard inspector.



**Direction:** Void band below header; single scroll context; dense only at canvas/timeline spine.



### Typography adoption



**Direction:** Mandatory `TYPE_*` on touched routes; migrate remaining heroes; align `--text-measure-ch` to 68.



### Metadata editor badge walls



**Direction:** Progressive disclosure; section titles at meta tier only.



### Global chrome — Account nav and campaign switcher



Plan: [header-account-nav.md](../plans/header-account-nav.md).



---



## P3 — Deferred (subordinate to doctrine)



| Item | Notes |

|------|-------|

| Theme FOUC | Aesthetics after gravity |

| `dark:` vs `theme-*` mismatch | Token hygiene |

| Hub ambient gradient intensity | Global hub language |

| Violet hardcoding in badges | Palette propagation |



---



## Governance



- **PR template:** Gravitational center · Shell contract (collection / entity / n/a) · Principles touched

- **Quarterly:** Re-score seven routes in experience-scorecard.md

- **New routes:** Design review block in experience-doctrine.md before merge



---



## Success metrics



| Metric | Baseline (2026-06) | Target (2 cycles) |

|--------|-------------------|-------------------|

| Collection routes on `CategoryHubShell` + toolbar contract | ~5/6 | 6/6 + narrative indexes audited |

| Entity shell heroes using `EntityHeader` | 0/4 | 4/4 |

| Avg gravity score (7 routes, briefing) | ~2.8 | ≥4.0 |

| Character / Org / CH gravity score | ≤2.2 | ≥4.0 |

| Doctrine cites shell vs representation split | No | Yes |

| Overview `DashboardCard` grids on P0 entities | 2 | 0 |


