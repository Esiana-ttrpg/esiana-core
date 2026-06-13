# World advance — Tier 1 validation

Companion to [world-advance.md](./world-advance.md). Exercises the six projection domains via **canonical scenarios**, automated assertions, and optional live-campaign inspection.

## Scenario catalog

| Key | Primary domains | Intent |
|-----|-----------------|--------|
| `war_escalation` | conflict, faction, territorial | Hostile stances + escalating front + border pressure |
| `refugee_crisis` | npc_mobility, conflict | Displacement + migration pressure |
| `failed_harvest` | economic, seasonal | Scarcity / prosperity decline + season context |
| `noble_alliance` | faction | Org relation ALLY / DIPLOMATIC |
| `trade_collapse` | economic | Trade disruption on corridor |
| `harsh_winter` | seasonal, economic, npc_mobility | Season + scarcity + displacement |

Definitions: [`shared/worldAdvanceScenarios.ts`](../../shared/worldAdvanceScenarios.ts)

Each scenario defines:

- **Positive** expectations (axes, synthesis fragments)
- **Anti-goals** (forbidden axes, synthesis substrings, domain bleed)
- **Signal locality** (`inScopePageKeys` / `outOfScopePageKeys`)

## Automated tests

```bash
cd backend && npm test
```

Included files:

- `shared/worldAdvanceScenarios.test.ts` — positive, anti-goal, locality, explainability
- `shared/worldAdvanceSynthesis.test.ts` — template regression
- `shared/worldConditionSurfaces.test.ts` — all six scenarios
- `backend/src/lib/worldAdvanceDensity.test.ts` — anchor fan-out vs `CONVERGENCE_MAX_ENTRIES` (2000)
- `frontend/src/components/chronology/worldAdvanceFeedGrouping.test.ts` — WORLD_ADVANCE batch grouping (via `cd frontend && npm test`)

Shared helpers: [`shared/worldAdvanceValidationAssert.ts`](../../shared/worldAdvanceValidationAssert.ts)

## Live campaign inspection

1. Copy [`scenarios/world-advance-page-map.example.json`](../../scenarios/world-advance-page-map.example.json) and replace placeholders with real wiki page IDs for your campaign.
2. Run preview-only (safe):

```bash
npx tsx backend/prisma/scripts/seed-world-advance-validation.ts \
  --campaign <slug> \
  --mapping scenarios/my-page-map.json \
  --report validation_report.md
```

3. Apply batches (mutates campaign + chronology):

```bash
npx tsx backend/prisma/scripts/seed-world-advance-validation.ts \
  --campaign <slug> \
  --mapping scenarios/my-page-map.json \
  --apply \
  --report validation_report.md
```

4. Stress chronology density (repeat apply per scenario):

```bash
npx tsx backend/prisma/scripts/seed-world-advance-validation.ts \
  --campaign <slug> \
  --mapping scenarios/my-page-map.json \
  --apply \
  --density 15 \
  --report validation_report.md
```

The report includes synthesis headline, condition chips, anti-goal checklist, locality violations, and convergence truncation stats.

## Density validation results (2026-06-04)

Campaign: `calendar-test` · mapping: [`scenarios/calendar-test-world-advance-page-map.json`](../../scenarios/calendar-test-world-advance-page-map.json)

| Run | Mode | `world_advance` entries | `totalCollected` | `truncation.capped` |
|-----|------|-------------------------|------------------|---------------------|
| Baseline | 6 scenarios × 1 apply | — | — | — |
| Stress | 6 scenarios × 15 applies | 256 | 256 | false |

Reports: [`validation_density_baseline.md`](../../validation_density_baseline.md), [`validation_density_stress.md`](../../validation_density_stress.md)

**Collector caveat:** `collectWorldAdvanceAnchors` reads only the **200 most recent** World advance calendar events. Stress stats reflect the latest 200 batches, not full campaign history.

### Feed readability rubric (pre-grouping UX)

| Question | Result | Notes |
|----------|--------|-------|
| Identify distinct batches without effect IDs? | **Fail** | One row per effect; shared synthesis headline repeated |
| Synthesis headline feels like spam? | **Fail** | Same headline on every effect row in a batch |
| Find latest advance in ~10s? | **Marginal** | Domain filter helps; list length grows quickly |
| Acceptable length for one session week? | **Fail** at stress load | 256 visible anchors after stress run |
| Truncation banner at realistic pace? | **Pass** | Not capped below 2000-entry overlay limit |

**Decision:** Implement **WORLD_ADVANCE batch grouping** in [`CampaignFeedView.tsx`](../../frontend/src/components/chronology/CampaignFeedView.tsx) — one row per chronology batch with “N effects” expander and **Provenance** link to batch detail.

Grouping threshold estimate: consider grouping essential above ~**30–50** visible world-advance anchors per week (≈10–15 batches × 3 effects).

## Explainability validation results (2026-06-04)

Scenarios exercised in unit layer: `war_escalation`, `refugee_crisis` ([`worldAdvanceScenarios.test.ts`](../../shared/worldAdvanceScenarios.test.ts)).

| Path | Result | Notes |
|------|--------|-------|
| **Preview** (`/c/:slug/world-advance` → Preview → condition chips) | **Pass** | `explainWorldAdvancePreview` links effects + citation clauses; unit tests enforce non-empty reasons |
| **Post-apply** (chronology feed only, before batch page) | **Fail** | Feed showed effect-level rows without provenance |
| **Post-apply** (`/c/:slug/world-advance/batches/:eventId`) | **Pass** (after fix) | Batch detail page reuses `WorldAdvanceConditionPanel` with campaign rollups |

| Acceptance question | Preview | Post-apply (batch page) |
|---------------------|---------|-------------------------|
| State why region is unstable in one sentence? | Pass | Pass |
| Concrete events in reasons? | Pass | Pass (with wiki labels when surfaces provide `regionLabel`) |
| Citations match synthesis? | Pass | Pass |
| Derived · not canon visible? | Pass | Pass |
| Copy provenance usable in session notes? | Pass | Pass |

## Explainability (GM UI)

- **Preview:** [`WorldAdvancePage`](../../frontend/src/pages/WorldAdvancePage.tsx) — click region condition chips (`WorldAdvanceConditionPanel`).
- **Historical batch:** [`WorldAdvanceBatchPage`](../../frontend/src/pages/WorldAdvanceBatchPage.tsx) at `/c/:slug/world-advance/batches/:eventId` — linked from feed **Provenance** and recent batches list.
- Helpers: [`explainWorldConditions.ts`](../../shared/explainWorldConditions.ts) (page-aware effect summaries).

## Known heuristic gaps

Document failures from the dev report here after your first run — **fix projectors** (`worldConditionSurfaces.ts`, `worldAdvanceSynthesis.ts`), do not weaken assertions.

| Scenario | Typical gap |
|----------|-------------|
| `noble_alliance` | Faction-only batches may produce no region condition surfaces (expected) |
| `trade_collapse` | Org-targeted economic signals do not attach to a region unless mapped to a location |

## When anti-goals fail

1. Read the report `anti-goals` section for the scenario
2. Adjust projection heuristics, not scenario expectations
3. Re-run unit tests and preview-only script until green
