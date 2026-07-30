# Frontend development

Area-specific guidance for `/frontend`. General setup, CI, and branch workflow: [../DEVELOPMENT.md](../DEVELOPMENT.md).

---

## Component patterns

- Use campaign APIs and existing hooks — no cross-campaign client caches
- Respect server-stripped fields; never leak GM-only placeholders to party views
- **Campaign Home** (`/campaigns/:handle/dashboard`): modular widgets; extend `GET .../dashboard` when adding widget data
- **Sidebar:** navigation only — do not move recency, pulse, or heavy analytics into the sidebar
- Reuse dashboard widgets, codex browse registry, `CodexHierarchyView`, and `useIdentityDisplay` before new abstractions
- Maps: client filters run after scene load; never pass `groupIds` to scene fetch as visibility inputs

References:

- [AGENTS.md](../AGENTS.md) — product identity and engineering invariants
- [docs/experience-doctrine.md](../docs/experience-doctrine.md) — gravity test, principles, blocklist, PR gate
- [docs/density-doctrine.md](../docs/density-doctrine.md) — density limits

---

## Design tokens

CSS primitives for layout, density, and editorial rhythm live in `frontend/src/index.css`, `frontend/src/lib/densityConstants.ts`, and `frontend/src/lib/surfaceLayout.ts`.

Theme / surface work only:

- [docs/design-tokens.md](../docs/design-tokens.md) — token catalog
- [docs/surface-hierarchy.md](../docs/surface-hierarchy.md) — surface role tokens

---

## Surface hierarchy

Visual roles (canvas, focal, contextual, operational, overlay) define where UI chrome belongs.

- **Codex mode:** Reading (consume, lower chrome) | Writing (edit, orchestration)
- **Layout:** Standard | Wide (measure + margins only)

- `TYPE_DISPLAY_CLASS`, `TYPE_PROSE_CLASS`, `TYPE_META_CLASS` in `surfaceLayout.ts` — see [experience-doctrine.md](../docs/experience-doctrine.md#typographic-roles)

Default campaign entry is **codex/wiki**; Campaign Home is the secondary overview.

---

## Accessibility and mobile

- No horizontal scroll traps in wiki editor or session forms
- Collapsible campaign chrome below `lg`; admin nav drawer below `md`
- Tables may use `overflow-x-auto` wrappers; body must not scroll horizontally
