# Rumor engine (Layer 3)

**Layer:** 3 — Living World Systems  
**Status:** Implemented  
**Modules:** [`shared/rumorEngine.ts`](../../shared/rumorEngine.ts), [`shared/rumorProjection.ts`](../../shared/rumorProjection.ts), [`backend/src/lib/rumorEngineService.ts`](../../backend/src/lib/rumorEngineService.ts)

## Ontology

| Concept | Meaning |
|---------|---------|
| **LoreClaim** | Canonical assertion (editable epistemic fields only) |
| **RumorCirculation** | Immutable append-only propagation record |
| **SpreadAction** | Chronology `CalendarEvent` + JSON payload (`spreadAction-v1` / `retraction-v1`) |
| **RumorProjection** | Derived feed at `asOfEpochMinute` (not stored) |
| **LoreInterpretationAccount** | Competing belief framing on a subject |

Do **not** clone `LoreClaim` rows when spreading. Do **not** use mutable `isRetracted` flags.

## Party projection invariant

Party feeds filter `visibility: PARTY` circulation edges **before** deduplication. Five `GM_ONLY` circulations and zero `PARTY` circulations ⇒ claim **absent** from party feeds.

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/c/:slug/locations/:pageId/rumors` | Member |
| GET | `/c/:slug/wiki/:pageId/gossip` | Member (org pages) |
| POST | `/c/:slug/rumors/spread` | Operational manager |
| POST | `/c/:slug/rumors/retract` | Operational manager |
| GET | `/c/:slug/lore-claims/:claimId/circulations` | Operational manager |

Epoch fields in JSON are **strings** (`EpochMinuteString`). Spread/retract use campaign `currentEpochMinute` only (no backdating in v1).

## Inclusion precedence

1. Subject locality  
2. Source locality  
3. Explicit spread targeting  
4. Interpretation regionality  
5. Related org graph (metadata; depth-1 deferred)

## Claim inspector (Circulate…)

On entity **Sources & provenance** claims, operational managers see:

- **Circulate…** — opens spread modal with claim statement and subject prefilled; stance and propagation target are chosen at spread time (not copied from claim fields).
- **View circulation history** — append-only chronology table (`GET /lore-claims/:claimId/circulations`); circulation and retraction rows use distinct badges (not active/inactive styling).
- **Retract circulation** — on projectively active circulation edges only; appends a retraction row.

Party members do not see circulation controls on claim rows.

**Where to find it (character and other entity pages):**

1. **Discovery** subview — scroll to **Sources & provenance** (below party knowledge); add a claim, then **Circulate…** on each claim row.
2. **Codex** rail (DM) — **Sources & provenance** section with the same editor.
3. **Lore** area above page blocks (DM) — **Sources & provenance** when not using reader-first layout only.

## Non-goals

- Derivative claims per spread target  
- Mutable circulation rows  

**Note:** Time-driven rumor spread from the downtime reputation hook (`reputation_shifts`) is **not** autonomous engine diffusion — it emits GM-reviewed `rumor_spread` suggestions; accept may call `circulate_rumor`. See [downtime-reputation.md](./downtime-reputation.md).
