# Entity inspector / Codex rail UX

Document + Codex rail layout for wiki entity authoring. See [canonical-page-editor.md](./canonical-page-editor.md) for the consolidated model.

## Controls

- **Edit** (primary, DM): inline block editing + layout drag handles (single `isEditingPage` mode)
- **Codex rail** (`PanelRight`): read-mostly intelligence overlay (400–640px, resizable)
  - World consistency (continuity issues)
  - Linked mentions and backlinks summary
  - Discovery summary (links to Discovery subview)
  - Document summary (visibility, template — read-only; “Edit on page” deep links)
- **Workspace density** (DM): Focused / Balanced / Expanded / Immersive

## Architecture

| Layer | Role |
|-------|------|
| Blocks | Canonical editor (semantic + generic widgets) |
| Metadata | Structured world state (`WikiPage.metadata`) |
| Projections | Derived reader UI (hero, infobox, identity strip) |
| Codex rail | Diagnostics and context — not metadata CRUD |
| Edit mode | Page composition + layout geometry |

## Canonical rule

| User intent | Surface |
|-------------|---------|
| Edit page content / metadata | Semantic or generic **blocks** |
| Inspect links, continuity, discovery | **Codex rail** |

## Deep links

- `?openCodex=1` or legacy `?openInspector=1` / `openSettings=1`
- `?focusBlock=entity-hero&field=profession` (legacy `focusField=` still supported)
- Rail closes on navigation unless deep-linked

## Infobox

Typed templates render metadata projections in `wiki-infobox` blocks with narrative typography (value-first). Edit identity and details in `entity-hero` and related semantic blocks.

## Section config (legacy)

`frontend/src/lib/entityInspectorSections.ts` — used by block subviews and lore blocks; inspector form routing removed in favor of page blocks.
