# Downtime projects (Layer 1)

**Layer:** 1 — Canon & Temporal Infrastructure (simulation substrate)  
**Status:** Implemented (Phase 2 — data model, progression, outcomes, hub UI)  
**Modules:** [`shared/projectMetadata.ts`](../../shared/projectMetadata.ts), [`backend/src/lib/downtimeProjectService.ts`](../../backend/src/lib/downtimeProjectService.ts), [`backend/src/lib/projectProgressionService.ts`](../../backend/src/lib/projectProgressionService.ts), [`backend/src/lib/projectOutcomeService.ts`](../../backend/src/lib/projectOutcomeService.ts)

## Philosophy

> **Projects are simulation entities with narrative documents attached — not documents pretending to be systems.**

```text
WikiPage        = narrative surface (title, blocks, visibility, backlinks)
DowntimeProject = temporal simulation state (duration, status, resources)
```

Projects are **campaign-world operations** — construction, research, training, operations, recovery — not productivity tasks.

## Storage model

| Surface | Location |
|---------|----------|
| Title, blocks, visibility | `WikiPage` under `Downtime › Projects` |
| Simulation fields | `DowntimeProject` table (1:1 via `wikiPageId`) |

`relatedPageIds` is a **temporary denormalized** reference list. Entity graph `PROJECT_*` relation kinds are deferred until provenance/backlinks are needed.

## Temporal invariants

- Duration and progress are stored in **epoch minutes** (Layer 1 canonical time).
- **Never** convert calendar months to minutes for simulation ([time-advancement.md](./time-advancement.md)).
- **Canonical simulation truth:** `durationElapsedMinutes`, `durationTotalMinutes`, `stalledDurationMinutes`, `status`.
- **`progressPercent` is presentation-oriented** — derived from elapsed/total for display; hub UI prefers temporal prose over percentages.

## Stalled duration

`stalledDurationMinutes` accumulates lifetime stall time when:

| Condition | Stall += elapsed | Elapsed progresses |
|-----------|------------------|-------------------|
| `ACTIVE` + prerequisites met | No | Yes |
| `ACTIVE` + blocked (resources/blockers) | Yes | No |
| `PAUSED` / `SUSPENDED` | Yes | No |
| `PLANNED` | No | No |

Stall does **not** reset when prerequisites clear — supports *"languished for months"* narrative later (chronology, reputation, world events).

## Progression (project_progression hook)

On each global time advance, `runProjectProgression`:

1. Scans non-terminal projects (ignores wiki visibility).
2. Gates on all `blockers[].resolved` and `resources[].satisfied`.
3. Increments elapsed or stall minutes.
4. Auto-completes when `durationElapsedMinutes >= durationTotalMinutes`.
5. Applies pending outcomes on completion.

Manual `PATCH` → `COMPLETED` uses the same outcome executor.

## Waiting state (hub UI)

v1 uses **prose-only** summaries from blockers and resources:

- *"Blocked by: winter storms"*
- *"Requires: stone shipment"*

No stall-cause taxonomy in Phase 2. Future structured causes (`logistical`, `environmental`, etc.) are reserved — prose remains player-facing.

## Outcomes

Applied idempotently via `applyProjectOutcomes()` — skip `status: applied`; persist provenance on each outcome row (`appliedAtEpochMinute`, `applicationSource`, `applicationRunId`).

| Kind | v1 behavior |
|------|-------------|
| `unlock_entity` | `discover_wiki_page` via canonical world effect |
| `future_hook` | `discover_quest` or `discover_wiki_page` |
| `reputation_effect` | `set_faction_stance` on linked org page |
| `alter_location` | **Append-only** `downtimeAlterations[]` on location wiki metadata — narrative annotations only; no map/geometry mutation |
| `generate_event` | `CalendarEvent` on master calendar at completion epoch |
| `haven_effect` | Apply structured patch to linked haven: activity log (`origin: project_outcome`), optional status, upgrade with provenance, threat |

### alter_location boundary

*Narrative alterations attached to places* — **not** a place transformation engine. Only append to `downtimeAlterations`; never mutate borders, overlays, or replace metadata fields.

## Status lifecycle

| Status | Meaning |
|--------|---------|
| `PLANNED` | Authored, not yet running |
| `ACTIVE` | Time progression applies when ungated |
| `PAUSED` | Intentionally inactive (party/GM choice) |
| `SUSPENDED` | Cannot proceed due to world state |
| `COMPLETED` | Terminal success |
| `FAILED` | Terminal failure |
| `ABANDONED` | Terminal abandonment — retained as world history |

`startedAtEpochMinute` is set **once** on first transition to `ACTIVE`.

`completedAtEpochMinute` is set on `COMPLETED` or `FAILED`.

## Visibility vs simulation

- **API/party reads** filter by linked `WikiPage.visibility`.
- **`project_progression` hook** scans all non-terminal projects **regardless of visibility**.

## Delete semantics

- **PLANNED only:** hard delete (soft-delete wiki page + remove project row).
- **After ACTIVE:** use `PATCH status: ABANDONED`.

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/downtime/projects` | Party (visibility-filtered) |
| GET | `/c/:slug/downtime/projects/by-wiki/:wikiPageId` | Party |
| GET | `/c/:slug/downtime/projects/:id` | Party |
| GET | `/c/:slug/downtime/projects/:id/overview` | Party |
| POST | `/c/:slug/downtime/projects` | GM/Writer |
| PATCH | `/c/:slug/downtime/projects/:id` | GM/Writer |
| DELETE | `/c/:slug/downtime/projects/:id` | GM/Writer — PLANNED only |

Downtime hub `?section=projects` returns `DowntimeHubProjectsPayload` with narrative operation cards.

### Project overview page

Wiki pages with `templateType: DOWNTIME_PROJECT` open the **operation overview** by default (status, clock, requirements, obstacles, outcomes, recent-changes shell). Append `?view=lore` to edit narrative markdown in the standard wiki editor.

GM/Writer actions: **Manage operation** (status, duration, resources, blockers, treasury metadata) and **Edit lore**.

Hub cards link to the overview; progress and waiting state appear on both hub cards and the detail page.

### Hub naming

| Surface | Label |
|---------|--------|
| Sidebar / route | **Projects** |
| In-page H2 | **Operations** |
| CTA | **New operation** |
| Create modal | **Begin operation** |

### Hub create flow (GM/Writer)

From Downtime → Projects, **New operation** opens a narrative-first modal — not a task form.

**Identity:** title, operation type, **Led by** (wiki page sponsor), expected duration (prose-friendly days/weeks — no progress %), optional **current posture** (narrative tone stored on wiki `metadata.downtimeOperationPosture`).

**Operation brief** and **Stakes** seed wiki markdown (`## Operation brief`, `## Stakes`). Stakes are pressure and framing — not outcome records.

**What stands in the way?** — unified composer with soft **Requirement** / **Obstacle** typing:

- Requirements → `resources[]` (`satisfied: false`)
- Obstacles → `blockers[]` (`resolved: false`)

Wiki also receives mirrored bullet lists under `## Requirements` and `## Obstacles`, plus empty `## Notes`. No Tasks, Checklist, or Milestones sections.

Default simulation status on create: `PLANNED`. Progress engine remains a hidden temporal substrate on hub cards.

## Reserved (future)

- `currentStage` — multi-phase project narration
- `narrativeWeight` — impact tier for world reactions
- **Operational memory** — append-only `activityLog` on `DowntimeProject` feeding a Recent changes section (lightweight; not master calendar integration)
- **Project lifecycle chronology** — auto entries on master calendar: `started`, `stalled`, `resumed`, `completed`, `failed`
- Structured stall-cause taxonomy (simulation-only; prose remains UI surface)

## Related

- [downtime-havens.md](./downtime-havens.md) — haven entity model and overview UI
- [global-time-hooks.md](./global-time-hooks.md) — simulation spine
- [time-advancement.md](./time-advancement.md) — epoch minute invariants
