# Downtime / Havens / Ledger — Phased Implementation Plan

**Status:** Phases 1–6 + Phase 7 timeline/entity + adventure integration **shipped** (2026-06); Phases 7–9 remainder open  
**Changelog:** [changelog.md](../../changelog.md) — Layer 1 downtime spine + timeline projection; Layer 3 reputation + world events  
**Tracking:** [todo.md](../../todo.md) → Downtime simulation layer (Phases 7–9 remainder)  
**Related:** [world-advance.md](../architecture-internal/world-advance.md), [rumor-engine.md](../architecture-internal/rumor-engine.md), [terminology.md](../terminology.md), [narrative-engine-layers.md](./narrative-engine-layers.md), [sidebar-ia-reorder.md](./sidebar-ia-reorder.md)

## Vision

Downtime is the campaign simulation layer.

It is not:

* bookkeeping
* housing management
* spreadsheets

It is:

* time passing
* projects advancing
* the world reacting
* factions shifting
* bases evolving
* consequences maturing

The system should make campaigns feel alive between active scenes.

Core principle:

> Everything in Downtime advances because time advances.

---

## Terminology

Stable engineering IDs (Tier C — never renamed internally). Campaign-level display aliases in Phase 9.

| Internal ID | User-facing (default) | Avoid confusing with |
|-------------|----------------------|----------------------|
| `downtime` | Downtime | Session pacing tag on scenes (`downtime` beat) |
| `haven` | Haven | Building/wiki location pages |
| `project` | Project | Generic task trackers |
| `ledger` | Ledger | Layer 5 **Investigation dependency ledger** — [InvestigationDependencyMatrix.tsx](../../frontend/src/components/adventure/InvestigationDependencyMatrix.tsx) |
| `world_event` | World Events | `CalendarEvent` chronology entries (interoperate, not collapse) |

See [terminology.md](../terminology.md) for engineering ↔ user-facing conventions.

---

## Core Architecture

### Foundational Concepts

#### Downtime

Campaign-wide lifecycle layer.

Tracks:

* elapsed time
* projects
* havens
* world-state changes
* passive progression
* offscreen consequences

#### Haven

Persistent operational base tied to downtime.

May represent:

* inn
* pirate ship
* airship
* camp
* sanctuary
* orbital station
* guild hall
* caravan
* hidden bunker

Not mechanically tied to buildings.

#### Projects

Time-based activities.

Examples:

* repairs
* research
* construction
* training
* investigations
* smuggling
* ritual preparation
* political influence

Projects are narrative clocks, not generic tasks.

#### Ledger

Lightweight economic flow tracking.

Tracks:

* haven expenses
* project costs
* group treasury
* upkeep
* rewards
* debts
* passive income

Avoid full inventory/accounting simulation.

> **Not** the Investigation dependency ledger (clue/scene/NPC matrix under Adventure).

#### World Events

Passive world progression.

Examples:

* rumors spread
* wars escalate
* caravans disappear
* factions mobilize
* plagues worsen
* political shifts occur

Generated from:

* elapsed time
* unresolved threads
* faction activity
* project outcomes

---

## Shipped substrate

Phase 1 extends existing primitives — not greenfield.

| Concept | Shipped | Modules / docs |
|---------|---------|----------------|
| Campaign time | `currentEpochMinute`, fantasy calendars, `advanceCampaignTime` | [campaignsController.ts](../../backend/src/controllers/campaignsController.ts), Layer 1A changelog |
| Time UI | `WorldChronometerWidget`, `CalendarWidget` advance controls | Campaign Home widgets |
| World progression | GM-triggered world advance batches + `CALENDAR_ADVANCED` domain events | [world-advance.md](../architecture-internal/world-advance.md) |
| Rumors / drift | Manual rumor spread, creative drift tracking | [rumor-engine.md](../architecture-internal/rumor-engine.md) |
| Quest downtime tag | `questType` datalist includes `Downtime` | [quest-card-properties.md](./quest-card-properties.md) |
| Sidebar IA | PLAY / WORLD / TIMELINE / TOOLS zones | [sidebar-ia-reorder.md](./sidebar-ia-reorder.md) |

---

## PHASE 1 — Downtime Foundation

**Goal:** Establish Downtime as a first-class campaign layer.

### Features

#### Downtime Hub

New top-level section. The root route **is** the overview — no separate Overview tab or sidebar child.

Sidebar:

```text
Downtime          ← narrative/temporal overview (default route)
 ├─ Projects
 ├─ Havens
 ├─ World Events
 ├─ Reputation
 └─ Ledger
```

**Root overview** (index route content):

* elapsed campaign time
* current downtime period
* active projects (summary cards, not a task board)
* haven statuses
* recent world events
* unresolved developments
* pending consequences

UI emphasis:

* atmospheric
* narrative
* temporal

Avoid spreadsheet visuals.

**Routing and sidebar (Phase 1 build):**

* Default view = overview at the bare index route (e.g. `/c/:slug/downtime` or wiki category with no `?section=`). Sub-sections use `?section=projects` (etc.) — consistent with Adventure hub routing.
* `DOWNTIME_SECTIONS` lists only: projects, havens, reputation, ledger, worldEvents — no `overview` section id in nav.
* Sidebar parent link → base downtime path (no section param). Children → section hrefs. Parent active when on root with no section param. Do **not** duplicate the root view as a child tab (unlike Adventure Board under Adventure).
* Hub shell: `CategoryHubShell` + section switcher pattern from `AdventureView`; overview section component composes existing temporal and world-advance surfaces before Phase 2 entity tables exist.

#### Time System v1

Introduce canonical campaign time.

Core requirements:

* current campaign date/time
* configurable calendar
* session-level time advancement
* downtime advancement
* world event timestamps

Must support:

* fantasy calendars
* sci-fi stardates
* custom eras

**Substrate:** Layer 1A temporal runtime is largely shipped — `currentEpochMinute`, fantasy calendars, chronology hub. Extend rather than replace.

#### Time Advancement Engine

Critical infrastructure.

Support:

**Manual advancement** — GM advances hours, days, weeks, months.

**Session advancement** — Prompt after session:

```text
"How much time passed?"
```

Examples:

* 8 hours
* 3 days
* 2 weeks at sea

**Substrate:** `PATCH /c/:slug/time-tracking/advance` exists for minutes/hours/days. Extend units and session-end prompt.

#### Global Time Hooks

When time advances, trigger:

* project progression
* haven state updates
* faction simulations
* reputation decay/growth
* event generation
* economic upkeep
* cooldown expiration

This becomes the backbone of the simulation layer.

**Substrate:** `CALENDAR_ADVANCED` domain events from time advance; world advance batch already steps clock. Fan-out hooks: [global-time-hooks.md](../architecture-internal/global-time-hooks.md) (Phase 1 spine shipped).

---

## PHASE 2 — Projects System

**Goal:** Create narrative progression systems tied to time.

### Project Model

Projects contain:

* title
* description
* owner
* associated haven
* duration
* progress state
* required resources
* blockers
* related entities
* outcomes
* risks

### Project UI

Projects should resemble:

* narrative operations
* campaign clocks

NOT:

* Jira tasks

Example:

```text
Temple Reconstruction
██████░░░░ 60%

12 days remaining

Requires:
- 800 gold
- Stone shipment
- Friendly reputation with masons
```

### Project Progression

Projects advance automatically when:

* time passes
* prerequisites resolve
* resources arrive

### Project Outcomes

Projects may:

* unlock entities
* alter locations
* generate events
* change haven state
* affect reputation
* create future hooks

### Project Types

Examples:

* **Construction** — fortifications, repairs, ship upgrades
* **Research** — magic, engineering, investigations
* **Training** — skills, troops, crew
* **Operations** — trade routes, espionage, smuggling
* **Recovery** — healing, morale, rebuilding

---

## PHASE 3 — Havens

**Goal:** Create persistent operational anchors.

### Haven Entity Type

Core fields:

* name
* haven type
* description
* status
* crew/residents
* upgrades
* threats
* linked projects
* associated factions
* passive benefits

### Haven Types

Examples:

* Inn
* Ship
* Camp
* Sanctuary
* Estate
* Station
* Fortress
* Caravan

Mechanically identical core structure. Only presentation/themes differ.

### Haven Overview Page

Displays:

**Status** — Prosperous, Damaged, Hidden, Threatened, Under Siege

**Activity feed** — smugglers arrived, repairs completed, taxes overdue, faction visit, rumors spreading

**Active projects** — Projects tied to this haven

**Upgrades** — workshop, armory, shrine, medbay, hidden compartments

**Threats** — bounty hunters, inspections, corruption, infestations, sabotage

### Haven Simulation

Havens evolve over time.

Potential systems:

* prosperity
* danger
* morale
* notoriety
* maintenance
* security

These should remain lightweight and narrative-first.

---

## PHASE 4 — Ledger

**Goal:** Track meaningful campaign economy without inventory hell.

> Distinct from the Layer 5 Investigation dependency ledger (clue matrix). Internal ID: campaign economic `ledger`.

### Ledger Scope

Track:

* treasury
* major expenses
* passive income
* project costs
* upkeep
* debts
* donations
* trade profits

Avoid:

* granular item inventories
* weight tracking
* micromanagement

Shipped v1: manual entries + treasury feed — see [downtime-ledger.md](../architecture-internal/downtime-ledger.md).

### Ledger UI

Example:

```text
Recent Transactions

- Ship repairs ........ -450g
- Smuggling payout .... +700g
- Haven upkeep ........ -120g
- Temple donations .... +80g
```

### Automated Entries

**Staged suggestions (shipped):** upstream events emit pending treasury line items — never silent balance changes.

| Source | When | Confidence |
|--------|------|------------|
| Project completion | Ledger-tagged resources or `treasury_effect` outcomes | Authored when metadata present; inferred for costs without amounts |
| Trade signals | World-advance `economic_signal` | Inferred (amount omitted — GM fills on Edit) |
| Quest completion | `ledgerReward` metadata on quest page | Authored |
| Haven upkeep | Opt-in per haven + authored `upkeepCost` + major status transition only | Authored — **not** from simulation drift |

GM/Writer **Accept**, **Edit**, or **Dismiss** in Downtime › Ledger. Accepted suggestions create manual entries (`source: manual`).

See [downtime-ledger.md](../architecture-internal/downtime-ledger.md) for API, data model, and policy.

### Shared Party Wealth

Optional shared treasury (`sharedTreasuryEnabled`, default on).

Supports:

* contributions / withdrawals with contributor attribution on feed lines
* funding projects via quick actions
* single shared balance — no per-member sub-balances

---

## PHASE 5 — Reputation Integration

**Goal:** Make downtime reshape faction relationships.

### Reputation Events

Time advancement can:

* spread rumors
* decay trust
* increase notoriety
* trigger investigations

### Sources

Reputation changes from:

* projects
* haven activity
* unresolved events
* passive world spread

### Reputation Feed

Examples:

```text
Iron Guild ↑ Trusted
Reason:
Protected winter caravans.

Crown ↓ Suspicious
Reason:
Harbor smuggling rumors.
```

**Substrate:** Faction relation effects exist in world advance domain projectors; dedicated downtime reputation feed is new.

---

## PHASE 6 — World Events

**Goal:** Make the world evolve independently.

### Event Generator

Events generated from:

* elapsed time
* unresolved threads
* faction goals
* regional instability
* haven influence
* reputation states

**Substrate:** [world-advance.md](../architecture-internal/world-advance.md) (GM-triggered batches), [rumor-engine.md](../architecture-internal/rumor-engine.md) (manual spread). Passive time-driven generation is the gap.

### World Event Feed

Examples:

```text
3 days ago
Eastern bridge seized by bandits.

1 week ago
Ash King declared amnesty.

12 days ago
Strange lights seen over Blackmere.
```

### Event Consequences

**Shipped:** [event-consequences.md](../architecture-internal/event-consequences.md) — GM-authored consequences on event-lore pages; manual apply + preview; reuses Layer 2/3 substrates.

Events may:

* create quests (`quest_hook`)
* modify locations (`alter_location` — append-only narrative annotations)
* alter routes (`route_change` — DRAFT map overlays)
* threaten havens (`haven_threat`)

Deferred in v1: price changes, NPC unlocks, auto-apply on time advance.

---

## PHASE 7 — Narrative Integration

**Goal:** Integrate downtime into every campaign system.

### Timeline Integration

Downtime periods appear in:

* campaign chronology
* adventure timelines
* world-state progression

### Entity Integration

**Shipped (collapsed):** Downtime periods optionally annotate involved entities — chronology-facing only.

| Entity | Surface | Not built |
|--------|---------|-----------|
| **Characters** | Presence continuity (where / absent) via derived annotations | Training, injuries, obligation tracking, entity-page UI |
| **Locations** | Passive textual mentions from alterations in gap window | Operational state, persistent condition models |
| **Factions** | — | Faction pressure cards (deferred) |

Pattern: `DowntimeAnnotation` + `DowntimeLocationMention` on `DowntimePeriodPayload`; optional GM overlay on `Campaign.downtimeGapOverlays`. See [downtime-timeline.md](../architecture-internal/downtime-timeline.md).

### Adventure Integration

**Shipped:** Quest expiry (hybrid), offscreen progress, ignored-quest escalation — [quest-time-simulation.md](../architecture-internal/quest-time-simulation.md), [changelog.md](../../changelog.md)

Quests can:

* expire over time
* progress offscreen
* worsen when ignored

### Continuity Integration

**Shipped (2026-06):** Downtime overview is diagnostic-aware — Layer 4 continuity (warning+), escalating haven threats, and stalled projects normalize into `DowntimeFeedCard` via `loadDowntimePressurePresentation()`. Haven threats auto-escalate on `haven_updates` (one tier per pass). Project stall pressure is feed-only (no auto-consequences). Module: [`shared/downtimeContinuityIntegration.ts`](../../shared/downtimeContinuityIntegration.ts).

* unresolved threats escalating — **shipped** (time hook + overview feed)
* ignored warnings maturing — **shipped** (foreshadowing / structural diagnostics → overview feed)
* delayed projects causing consequences — **deferred** (stall cards only; consequence automation is Phase 8)

---

## PHASE 8 — Automation & Simulation

**Goal:** Reduce manual GM burden.

### Scheduled Effects Infrastructure

**Shipped (v1):** `CampaignScheduledEffect` table + `upkeep` hook — recurring treasury suggestions (`ledger_upkeep`, `ledger_income`). See [scheduled-effects.md](../architecture-internal/scheduled-effects.md).

**Shipped (v1.1):** Narrative schedules + occurrence audit — [scheduled-effects.md](../architecture-internal/scheduled-effects.md), [changelog.md](../../changelog.md).

### World Development (Optional)

GM-opt-in living-world suggestions — off by default. See [world-development.md](../architecture-internal/world-development.md).

* faction activity generation
* regional developments
* trade movement suggestions
* narrative progression prompts
* approval workflow (Manual / Assisted / Auto Apply)
* campaign-wide activity budget with faction allocation
* type lifecycles (preparation + cooldown)
* rationale on every suggestion
* expiration and staleness hygiene

### Downtime Resolution Wizard

Guided flow:

```text
1. Advance time
2. Resolve projects
3. Process haven events
4. Apply reputation shifts
5. Generate world events
6. Review consequences
```

This could become one of the strongest campaign rituals in the app.

---

## PHASE 9 — Theme Layer / Custom Terminology

**Goal:** Support genre flexibility.

### Internal Stable Terms

```text
downtime
haven
project
ledger
world_event
```

Never renamed internally.

### Display Alias System

Campaign-level display mapping.

Examples:

**Pirate campaign**

```text
Downtime → Voyage
Haven → Ship
Projects → Operations
World Events → Rumors
```

**Sci-Fi campaign**

```text
Downtime → Fleet Cycle
Haven → Station
Ledger → Credits
```

Aligns with [terminology.md](../terminology.md) — stable engineering IDs, campaign-level user-facing aliases.

---

## Critical Design Rules

### 1. Time Is The Backbone

Everything advances because time advances.

Without canonical time, the system collapses into disconnected trackers.

### 2. Narrative First

Always prefer:

* consequences
* atmosphere
* campaign evolution

Over:

* micromanagement
* accounting
* optimization gameplay

### 3. Avoid Spreadsheet Gravity

Danger areas:

* inventory tracking
* resource simulation
* excessive currencies
* detailed upkeep math

Keep systems lightweight and story-facing.

### 4. Downtime Must Feel Alive

The ideal emotional outcome:

```text
"The world kept moving while we were away."
```

That feeling is the entire purpose of the system.

---

## Scheduling

| Window | Scope |
|--------|-------|
| **Pre-1.0** | Phase 1 UI-only items (hub shell + root overview layout, session time prompt) may ship without new tables if they orchestrate existing temporal/world-advance surfaces |
| **Post-1.0 (default)** | Phases 2–6 entity models (`haven`, `project`, `ledger_entry`) are `schema-sensitive` — schedule after v1.0.0 schema freeze per [todo.md](../../todo.md) release gates |

### Related open items (cross-link only — do not merge)

* **Ambient calendar clicker** — [todo.md](../../todo.md) Campaign ops; adjacent time UX
* **Narrative pacing diagnostics "downtime" beat** — session content analysis, not this simulation layer
* **Multi-calendar temporal mapping** — optional Phase 1 dependency
