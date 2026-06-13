# Creative drift (Layer 3)

**User-facing name:** Unresolved (`/c/:slug/narrative/unresolved`)

**Layer:** 3 — Living World Systems (narrative thermodynamics)  
**Status:** Implemented  
**Modules:** [`shared/creativeDrift.ts`](../../shared/creativeDrift.ts) (browser-safe types), [`shared/creativeDriftFingerprint.ts`](../../shared/creativeDriftFingerprint.ts) (server-only), [`shared/creativeDriftCompute.ts`](../../shared/creativeDriftCompute.ts), [`backend/src/lib/creativeDriftService.ts`](../../backend/src/lib/creativeDriftService.ts)

## Purpose

Campaign-level **narrative entropy inbox** — surfaces narrative energy introduced but not yet metabolized. This is **campaign cognition** (Story Ops), not codex maintenance or Layer 4 structural integrity analysis.

**Doctrine:** Layer 3 interpretive synthesis over Layer 2 narrative state. Findings are synthetic, recomputable, and non-canonical.

## Placement

- **Route:** `/c/:slug/narrative/unresolved` (legacy `/narrative/drift` redirects)
- **Nav:** Campaign sidebar → **Narrative** → Unresolved (adjacent to Threads)

## Buckets (v1)

| Internal ID | UI label | Signals |
|-------------|----------|---------|
| `dormant_plotlines` | Dormant plotlines | `DORMANT` threads, cooling threads, stagnant quests, latent branch nodes |
| `unused_entities` | Dormant figures & factions | High intro weight, low recurrence (never "unused" in UI) |
| `hanging_promises` | Unresolved promises | Foreshadowing without payoff, unresolved promises, unrevisited mysteries |
| `emotional_residue` | Emotional beats | Optional `emotionalResidueKind` tag, inferred character-linked beats |
| `ambient_residue` | *(reserved)* | Not computed in v1 — future thematic texture recall |

## Reawakened strip

Transient gratification layer (not a bucket): threads/entities that returned to play within ~14 days.

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/narrative/creative-drift` | Operational manager |
| PATCH | `/c/:slug/narrative/creative-drift/dispositions` | Operational manager |

Disposition kinds: `intentional`, `revive_later`, `archived`, `snoozed` (with `snoozeUntil`).

Stored on `Campaign.creativeDriftDispositions` (JSON, fingerprint-keyed).

## Inputs

Composes:

- Layer 2: `thread-metadata-v1`, `NarrativeLifecycleState`, `narrative-branch-v1`
- Layer 1: `EntityRelation` narrative edges, `CampaignActivity`, `WikiLink` stats
- [`threadSignals.ts`](../../shared/threadSignals.ts) heuristics (relabelled in UI)

## UI tone

Advisory only: Dormant · Cooling · Unrevisited · Latent · Reawakened — never broken/orphan/score language.

Cooling bands (`recent` / `moderate` / `long`) are shown; internal sort math is hidden.

## Actions

- Mark intentional / Revive later / Archive / Snooze
- Attach to thread (`relatedPageIds` PATCH)
- Convert to rumor (deep-link to entity Sources & provenance — narrative composting)

## Non-goals (v1)

- Entity/chronology/map badges
- Dashboard digest widget
- Layer 4 dead-end / orphan graph analysis
- `ambient_residue` compute

## Related

- [narrative-threads.md](./narrative-threads.md)
- [narrative-lifecycle.md](./narrative-lifecycle.md)
- [rumor-engine.md](./rumor-engine.md)
- [entity-graph.md](./entity-graph.md) (Layer 4 diagnostics — separate concern)
