# Foreshadowing & payoff tracker (Layer 4)

**Layer:** 4 — Diagnostics & Integrity  
**Status:** v1 implemented  
**Module:** [`shared/narrativeForeshadowingTracker.ts`](../../shared/narrativeForeshadowingTracker.ts)

## Purpose

Track **foreshadowing progression** as an explicit state machine derived from Layer 2 thread metadata — setup → reinforcement → payoff across sessions.

Complements dead-end `passNarrativeIntent` (structural payoff lint) with session-aware progression diagnostics.

## State machine

```text
introduced → reinforced → payoff_pending → resolved
                                      ↘ abandoned
```

| Stage | Derivation |
|-------|------------|
| `introduced` | `introducedSessionId` set; no reinforcement |
| `reinforced` | `lastAdvancedSessionId` differs from `introducedSessionId` |
| `payoff_pending` | Reinforced + `payoffPageId` linked, thread still OPEN |
| `resolved` | `RESOLVED` status or `resolvedSessionId` |
| `abandoned` | `ABANDONED` status |

v1 uses `lastAdvancedSessionId` as single reinforcement anchor (no `reminderSessionIds[]` schema).

## Rules

| Rule | Issue type |
|------|------------|
| `foreshadowing_introduced_only` | `narrative_foreshadowing_no_reminder` |
| `foreshadowing_stale_reinforcement` | `narrative_foreshadowing_stale` |
| `foreshadowing_payoff_pending` | `narrative_foreshadowing_no_payoff` |

## Layer 5 consumption

Adventure › **Thread History** (`?section=thread-history`) builds `StoryThreadHistoryProjection` from `foreshadowingChains`, thread session metadata, and campaign sessions. Docs: [story-thread-history.md](./story-thread-history.md)

`continuity-summary` also exposes raw `foreshadowingChains: ForeshadowingChainEntry[]` for other consumers.

**Downtime consumption (Phase 7):** Warning+ foreshadowing issues surface on Downtime › overview via `loadDowntimePressurePresentation()` (`sourceType: continuity_diagnostic`). No diagnostic state mutation from Downtime.

Producer: `narrative_foreshadowing_analyzer`

## Related

- [narrative-threads.md](./narrative-threads.md)
- [story-thread-history.md](./story-thread-history.md)
- [narrative-dead-end-detection.md](./narrative-dead-end-detection.md)
