# Party-to-faction reputation (Downtime)

Lightweight **party standing with factions** — trust and notoriety bands, narrative feed, and GM-reviewed major shifts. Distinct from org-to-org diplomatic relations (world advance) and the adventure investigation dependency ledger.

**Internal ID:** `reputation` (Downtime simulation layer)

**Modules:** [`shared/reputationMetadata.ts`](../../shared/reputationMetadata.ts), [`shared/reputationSimulation.ts`](../../shared/reputationSimulation.ts), [`backend/src/lib/reputationSimulationService.ts`](../../backend/src/lib/reputationSimulationService.ts)

---

## Design principle: hybrid mutation

| Change | Policy |
|--------|--------|
| In-band drift (trust decay toward neutral, slow notoriety bleed) | **Auto-applied** on time advance |
| Band crossing (e.g. Neutral → Suspicious) | **Pending suggestion** — GM Accept / Edit narrative / Dismiss |
| Investigation trigger | **Pending suggestion** (`kind: investigation`) |
| Autonomous rumor spread | **On suggestion accept** via `circulate_rumor` when `claimId` is set |

---

## Ontology

| Concept | Meaning |
|---------|---------|
| **CampaignReputation** | Per-campaign simulation state JSON (`trust` / `notoriety` 0–100 per watched faction) |
| **CampaignReputationEvent** | Append-only feed line (drift, band crossing, investigation, project outcome) |
| **CampaignReputationSuggestion** | Pending major shift awaiting GM resolution |
| **Party-facing bands** | Trust: Hostile → Suspicious → Neutral → Friendly → Trusted; Notoriety: Obscure → Infamous |

Do **not** conflate with `OrganizationRelation` diplomatic history on org wiki pages.

---

## Watched factions (v1)

Auto-discovered union of:

- `DowntimeHaven.factionPageIds`
- Entity graph `QUEST_FACTION` / `HAVEN_FACTION` targets
- Factions already present in simulation state

Manual watch-list UI is deferred.

---

## Time hook

`reputation_shifts` runs after `haven_updates` on campaign clock advance. Handler: `reputation-simulation-v1`.

**Drivers (v1):**

- Linked haven notoriety band
- Negative rumor circulations targeting the faction
- Stalled projects at linked havens
- Creative drift disposition count (light pressure)

---

## Project outcomes

`reputation_effect` outcomes emit an authored **project_outcome** feed event and bump trust immediately (no approval queue).

---

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/wiki/downtime-hub/:pageId?section=reputation` | Member — hub payload |
| GET | `/c/:slug/downtime/reputation/suggestions` | Member |
| POST | `/c/:slug/downtime/reputation/suggestions/:id/accept` | GM/Writer |
| POST | `/c/:slug/downtime/reputation/suggestions/:id/dismiss` | GM/Writer |

Accept body (optional): `{ "narrative": "..." }` to edit the reason line.

---

## Feed presentation

```text
Iron Guild ↑ Trusted
Protected winter caravans.

Crown ↓ Suspicious
Harbor smuggling rumors.
```

Bands only in UI — internal numeric scores are not shown to players.
