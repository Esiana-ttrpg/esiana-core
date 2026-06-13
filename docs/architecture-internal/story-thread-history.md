# Story thread history (Layer 5)

**Module:** [`shared/storyThreadHistoryProjection.ts`](../../shared/storyThreadHistoryProjection.ts)

GM-only foreshadowing progression across sessions. **Not** a top-level navigation tab.

## Entry points

| Tier | Entry |
|------|-------|
| **Per-thread** | Thread wiki detail page — milestone panel |
| **Aggregate** | Story › Threads › **Recent Activity** lens (`?section=story&view=threads&threadsLens=activity`) |

Legacy `?section=thread-history` redirects to the aggregate lens.

Distinct from:

| Surface | Role |
|---------|------|
| **Story › Threads** | Author/edit thread pages |
| **Continuity rail** | Issue feed / narrative pressure |
| **Thread detail history** | Single-thread milestone timeline |
| **Scene Sequence** | Scene session ordering (Progression) |

## Data sources

Read-only projection from:

- Layer 2 `thread-metadata-v1` session fields
- Layer 4 `ForeshadowingChainEntry[]` + `detectForeshadowingIssues()` findings
- `CampaignSessionTimeline` rows for session titles and gap math

Tracked kinds: `foreshadowing`, `promise`, `mystery` (excludes player theories).

## API

```
GET /c/:slug/wiki/adventure-hub/:pageId?section=thread-history
```
