# Character Hub (campaign cast board)

**Status:** Shipped (MVP + Phase 2 memory density) — 2026-06  
**Tracking:** [changelog.md](../../changelog.md) → Codex browser — Character Hub  
**Related:** [canonical-page-editor.md](./canonical-page-editor.md), Adventure page (orchestration vs recognition split)

## North star

**Characters = active campaign cast**, not wiki index rows. The page answers *"Who matters in the current world state?"* — recognition, relevance, and memory refresh — without duplicating Adventure orchestration.

## Shipped scope

### Backend

- `GET /c/:slug/wiki/character-hub/:pageId` — index children + campaign aggregates
- `characterHubContext.ts` — per-character cast context (location, portrait, presence tier, last seen, known through, active quests, co-seen, memory snippet)
- `sessionPageBacklinks.ts` — generalized session backlink helper (quest hub delegates)
- `sessionMentionSnippet.ts` — excerpt around last wikilink mention in session notes

### Frontend

- `CharacterHubView` — dedicated Characters route (replaces generic `EntityBrowserView`)
- `CharacterCastEntry` — narrative cards (portrait, identity line, Active/Dormant, Known Through, Last Seen, Active In, With, memory snippet)
- Location-grouped feed + presence tier bands (Active This Session → Recently Active → Dormant)
- `CharacterHubRail` — campaign summary + selected-character preview (master-detail)
- Table view demoted to power-user secondary with location section headers
- Nested/hierarchy view removed for Characters (`categoryBrowseRegistry` views: card + table only)

## Deferred (post-ship)

- Chronology-aware location via `resolveCharacterLocationAt`
- Table optional memory columns toggle
- Campaign spotlight auto-select on load
