# Entity inspector / Codex rail UX

**Status:** Retired — Inspector and Codex rail removed from core wiki pages.

System inference now lives on **subview tabs** only:

| Former Inspector lens | Subview tab |
|-----------------------|-------------|
| Relations | Relationships |
| Status / diagnostics | Continuity |
| Discovery | Discovery |

## Current model

See [editor-shell-doctrine.md](./editor-shell-doctrine.md).

- **Relationships subview** — links, mentions, entity relationships (`wiki-backlinks`, `entity-relationships`)
- **Continuity subview** — full `WikiContinuityPanel` and continuity blocks (DM continuity issues)
- **Discovery subview** — party knowledge (`entity-discovery` block)

## Deep links

Legacy query params still handled in [`WikiPage.tsx`](../frontend/src/pages/WikiPage.tsx):

- `?openCodex=1` or `?openInspector=1` — routes to a subview via `resolveSubviewFromCodexDeepLink`
- `?openSettings=1` — opens page settings drawer
- `?focusBlock=` / `?focusField=` — focus block or field on page

## Infobox

Typed templates render metadata projections in `wiki-infobox` blocks. Edit identity and details in semantic blocks (`entity-hero`, etc.).

## Legacy

`frontend/src/lib/entityInspectorSections.ts` — block subview routing only; no inspector rail.
