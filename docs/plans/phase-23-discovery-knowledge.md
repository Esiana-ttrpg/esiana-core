# Phase 23 — Discovery Codex, Knowledge States, Party Knowledge

**Roadmap layer:** Narrative Platform → Layer 1 — revelation projection substrate.

Shipped — [changelog.md](../../changelog.md) (Narrative Platform — Knowledge & Revelation).

## DiscoveryProjection contract

Canonical shared module: [`shared/discoveryProjection.ts`](../../shared/discoveryProjection.ts)

Parent semantics: [`docs/architecture-internal/narrative-projection-semantics.md`](../architecture-internal/narrative-projection-semantics.md) — discovery is the **revelation + epistemic** slice of unified narrative projection.

All discovery-aware surfaces (codex browse, maps hub, link index, backlinks, party-knowledge API, inspector Discovery mode) consume this contract. Do not re-implement `HIDDEN` checks inline; use `projectRevelation` / `projectWikiPageVisibility` from [`shared/narrativeProjection.ts`](../../shared/narrativeProjection.ts).

## Two axes

| Axis | Storage | Party UX |
|------|---------|----------|
| Entity unlock | `ContentPresenceState` on `wiki_page` | Hidden entries omitted from browse/search/links; count-only summary in codex |
| Epistemic state | `LoreClaim.knowledgeState` | Undiscovered claims omitted; grouped beliefs in Discovery inspector |

## Party knowledge groups

- **Confirmed** — `KNOWN` / `CONFIRMED`
- **Suspected** — `SUSPECTED` (rumor tag)
- **Disproven** — `DISPROVEN`
- **Contested** — computed when visible claims or interpretations conflict

## Rich discovery states (v1)

Canonical consumer shape from `projectDiscoveryState()` in [`shared/discoveryProjection.ts`](../../shared/discoveryProjection.ts):

```ts
interface DiscoveryStateProjection {
  state: 'hidden' | 'rumor' | 'partial' | 'contested' | 'known';
  available: boolean;
  gatedUntil?: number;
}
```

**Two-pass resolution**

1. **Availability** — party `available` is false when presence is `HIDDEN`/`DRAFT`, or when `campaignNow < ContentPresenceState.availableFromEpochMinute`. Managers always get `available: true`.
2. **Epistemic** — when available, derive `state` from visible claims + interpretations: contested → rumor → partial → known.

Temporal scheduling is **orthogonal** to epistemic labels: store `availableFromEpochMinute` on `ContentPresenceState`; expose schedule blocks via `available` + `gatedUntil`, never as a discovery enum value.

**UI badge density**

- Browse lists: badge for hidden/locked, rumor, partial, contested — omit `known`.
- Page header / Codex: same prominent chips; `known` renders without a badge by default.

## Revelation provenance

`RevelationProvenance` uses typed `RevelationSource`:

- `SESSION`, `MANUAL`, `IMPORT`, `QUEST`, `SCENE`

Claim storage: `discoveredViaType`, `discoveredViaRef`, `discoveredViaSessionId`, `discoveredAt`.

Entity unlock storage: `ContentPresenceState.workflowKey` + `revealedAt`.

## Cross-link policy

When a wiki link target is **HIDDEN** for the party:

- Render the label as **plain non-clickable text** (no broken-link styling, no “unknown faction” token)
- GMs retain full clickable links with Hidden/Draft badges in margin notes

## Discovery-aware search

Party viewers: link index, backlinks, and outlinks omit unrevealed pages.

Managers: full lists with optional `presenceState` badges.

## GM workflow

1. Set `ContentPresenceState` to `HIDDEN` on import or via page tools
2. Reveal via `POST /c/:slug/presence/reveal` when the party discovers content
3. Set claim `knowledgeState` and `visibility: PARTY` in Lore inspector for epistemic beliefs

## API

| Route | Purpose |
|-------|---------|
| `GET /wiki/index/:pageId` | Adds `discoverySummary` for party |
| `GET /maps` | Adds `discoverySummary` for party |
| `GET /wiki/:pageId/party-knowledge` | Party belief projection + `discovery` state + GM `canonDelta` |

## Languages codex

`Languages` category uses metadata-backed wiki pages (`entityCategory: languages`, codex type `LANGUAGE`).
