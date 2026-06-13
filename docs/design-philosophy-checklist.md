# Design philosophy PR checklist

Mandatory gate for **frontend UI PRs** before merge. Source: [design-philosophy.md](../design-philosophy.md).

## Checklist

- [ ] **Deprecated patterns** — Does this PR introduce any pattern from [deprecated-ui-patterns.md](./deprecated-ui-patterns.md)? If yes, refactor or justify.
- [ ] **Density doctrine** — Panel count, card nesting, widget cap, metadata lines, ultrawide proliferation per [density-doctrine.md](./density-doctrine.md)?
- [ ] **Ultrawide (≥1920px)** — Does extra width add panels/columns/density, or only breathing room?
- [ ] **TTRPG clarity** — User copy uses [terminology.md](./terminology.md)? No Steward/Chronicle on operational surfaces?
- [ ] **Play-first** — Usable mid-session? Not museum-curated academic infrastructure?
- [ ] **Mode + layout** — Codex uses Reading/Writing + Standard/Wide axes — not four semantic workspace modes?
- [ ] **Representational defaults** — New examples/placeholders per [representational-defaults.md](./representational-defaults.md)?
- [ ] **Surface hierarchy** — Does each view have one obvious primary focal region per [surface-hierarchy.md](./surface-hierarchy.md)?
- [ ] **Shell focal guard** — Does `CampaignLayout` or any layout shell apply `surface-primary` / focal role tokens? Shell must stay canvas-only.
- [ ] **Atmospheric canvas palette** — Do shell/sidebar/header tokens use the warm charcoal atmospheric ramp (not raw slate `#020617` / `#0f172a`)?
- [ ] **Theme harmonization path** — Do new theme/palette code paths route through `atmosphericDerivation.ts` (not raw `bg`/`border` on components)?
- [ ] **Surface role tokens** — Do new surfaces use role tokens (`bg-focal`, `bg-depth-3`, `bg-contextual`, `SURFACE_*_CLASS`) instead of raw `bg-surface border-border` boxing?
- [ ] **Depth axis** — Do in-stream sections use depth lifting (`region-depth-3`, `focal-elevated`) within the focal column instead of nested bordered cards?
- [ ] **Accent discipline** — Is there at most one dominant illuminated element per viewport region? Operational chrome recessed (depth-1, no glow pills)?
- [ ] **Region composition** — Do workspace regions emerge from atmosphere (fields, soft fades) rather than rounded dashboard cards on a contrasting slab?
- [ ] **Workspace composition** — Does this campaign route use `workspace-field` (codex/entity/hub/dashboard) or `workspace-document` (settings)? Entity detail → `composition="entity"`; lore articles stay `codex`. No `mx-auto` / `max-w-5xl` on workspace routes.
- [ ] **Layout containment** — No `overflow-x-auto` on primary narrative/catalog surfaces? Priority collapse + reflow per [density-doctrine.md](./density-doctrine.md)?
- [ ] **Scene composition** — Does this new campaign workspace route declare a scene profile in `sceneComposition.ts` (or explicitly defer with a comment)? Zone contrast must route through `--zone-*` tokens, not ad-hoc per-component glow.

## Mode mapping (codex)

| User-facing | Engineering |
|-------------|-------------|
| Reading + Standard | `focused` workspace profile |
| Reading + Wide | `focused` / `balanced` with wider measure |
| Writing + Standard/Wide | `expanded` workspace profile |
| Focus / immersive | `BlockFocusOverlay` toggle — not top-level picker mode |

## Quick references

- User-facing Campaign Home = route `/dashboard` internally
- Default campaign entry = codex/wiki root
- Campaign Home widget default ≤6 enabled; hard cap 10
