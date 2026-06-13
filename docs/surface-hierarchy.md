# Surface hierarchy

Visual **roles** for UI regions — complements [density-doctrine.md](./density-doctrine.md) (limits) with perceptual composition.

Esiana is a **cinematic narrative workspace**: continuous dark environment, tonal surface lifting, sparse gold illumination, embedded contextual systems. Implemented in `frontend/src/lib/surfaceLayout.ts` and `frontend/src/index.css`.

## Roles

| Role | Token | Purpose | Typical use |
|------|-------|---------|-------------|
| **Canvas** | `--color-canvas` | Atmospheric foundation | App shell, sidebar backdrop, negative space |
| **Focal** | `--color-focal` | Primary narrative stream | Codex prose, Campaign Home continuity stream |
| **Focal elevated** | `--color-focal-elevated` | In-stream sectional lift | Hub tiles, continuity rows, active blocks |
| **Contextual** | `--color-contextual` | Supporting narrative awareness | Codex rail, campaign context rail |
| **Recessed** | `--color-recessed-foreground` | Metadata and secondary facts | Breadcrumbs, status line, timestamps |
| **Operational** | `--color-operational-foreground` | Edit/customize controls | Toolbars in Writing mode, widget bank |
| **Overlay** | `--color-overlay-elevated` | Modals and sheets | Dialogs, floating sheets |
| **Silent** | `--color-focal` (flat) | Quiet work surfaces — no glow, haze, or gradients | Codex prose, tables, timelines, session prep |

Export: `SURFACE_SILENT_CLASS` → `.surface-silent` in `surfaceLayout.ts`.

## Depth axis

Hierarchy is **tonal layering + depth + sparse accent** — not luminance inversion (no bright parchment slab on a dark shell).

| Depth | Token | Lift from canvas | Role |
|-------|-------|------------------|------|
| depth-0 | `--color-depth-0` | 0% anchor | Canvas |
| depth-1 | `--color-depth-1` | minimal | Recessed shell veil, metadata wells |
| depth-2 | `--color-depth-2` | +6–10% | Focal / narrative stream |
| depth-3 | `--color-depth-3` | +2–4% above depth-2 | Elevated in-stream sections |
| depth-4 | `--color-depth-4` | — | Overlays, modals |
| — | `--color-contextual` | translucent midpoint veil | Contextual rails on canvas |

Utilities: `.region-depth-1`, `.region-depth-2`, `.region-depth-3`, `.focal-elevated`.

## Atmospheric palette

> **Palette identity dominates environmental rendering. Surfaces stay neutral.**

Identity weighting: **40%** subtle depth/surface temperature drift, **60%** environmental lighting (haze, shadow tint, glow, depth separation). Haze is localized to the shell (`canvas-atmosphere--ambient`, once on the campaign flex row). Luminance bands stay system-owned.

| Plane | Character | Tokens |
|-------|-----------|--------|
| **Canvas** | Near-black navy (`#090b11`) — palette modulates the air, not the slab | `--color-canvas`, `--color-canvas-gradient-*`, `--color-atmosphere-haze-rgb` |
| **Focal** | Smoked-charcoal / navy narrative surfaces | `--color-focal`, `--color-focal-foreground` |
| **Silent** | Flat focal slab inside elevated chrome — intentional absence | `.surface-silent` |
| **Contextual** | Charcoal memory veil on canvas (α 0.55–0.65) | `--color-contextual` |
| **Lighting** | Haze, shadow temperature, tiered glow | `--color-atmosphere-*-rgb`, `--atmosphere-glow-alpha-*` |
| **Density** | Per-palette perceptual separation (not luminance bands) | `--atmosphere-region-fade-strength`, `--atmosphere-vignette-strength`, … |

Dark foundation targets neutral navy-charcoal (`#090b11` canvas, `#111827` focal baseline) with warm accent tokens (`--accent-gold`, `--accent-warm`, `--accent-soft`). Genre presets use **neutral slabs + environmental overlay** — not purple genre shell hex. Focal variants remain available for lighting bias; reading surfaces default to `smoked_charcoal`.

## ThemeStack hierarchy

Appearance profiles stack four layers. Foundation owns structural reality; genre and holiday never recolor slabs.

| Stack layer | Persists | Mutates |
|-------------|----------|---------|
| **Foundation** | `foundationPalette` | Canvas, depth ladder, sidebar ecology, prose ink |
| **Genre** | `genre` | Edge thresholds, glow falloff, bloom recipe, typography cadence |
| **Event overlay** | `identity` | Hero bloom, sidebar edge hints, hover transient chroma |
| **Scene** | route | Zone amplitude — suppresses spectacle on prose routes |

Valid stacks: `midnight + fantasy`, `ocean + cyberpunk + halloween`, `arctic + parchment`, `ember + pride`. Holiday accent tokens feed choreography only; `_paletteId` stays on the foundation palette.

Precedence for glow/amplitude: `scene > genre > event > foundation`. Foundation always wins on canvas and silence (`proseMax = 0`).

## Theme harmonization

Campaign themes supply **identity** (hue family, accent, mood, perceptual density). The UI system derives **surface roles** — never the reverse.

```text
Foundation palette (ATMOSPHERIC_IDENTITIES)
        ↓
Genre transforms (genreIdentity.ts) — optional
        ↓
Event modulation (eventOverlay.ts) — optional
        ↓
 resolveThemeAtmosphereInput()  — 40% surface drift / 60% lighting (stronger haze/shadow/glow amplitude)
        ↓
deriveAtmosphericRoles / deriveEditorialFocal / deriveDepthPalette
deriveAtmosphericLighting / deriveAtmosphericContrast
        ↓
--color-canvas, --color-focal, --color-depth-*, --color-atmosphere-*, --atmosphere-*
```

**Theme owns:** haze, shadow temperature, glow, subtle surface temperature, `ambientContrastBias` (region fades, shadow softness, depth-edge visibility)  
**System owns:** luminance bands (canvas→focal 6–10%), depth axis, rail hierarchy, readability contrast, border opacity caps

On dark foundation, **focal stays in the charcoal family** (light text on dark focal). Light/parchment presets use `light_page` focal unchanged.

Palette identity applies at **base strength** whenever a palette is selected. **Background tint** boosts blend strength (~1.5×) — not an on/off gate. Palettes must not replace raw `bg`/`surface`/`border` stacks.

Implemented in `frontend/src/lib/theme/atmosphericDerivation.ts`, `atmosphereSignature.ts`, `typographySignature.ts`, and `appearancePresets.ts`.

### Four-layer identity stack

| Layer | Converges | Diverges | Module |
|-------|-----------|----------|--------|
| Structural | Depth ladder, silence zones | Barely | `atmosphericDerivation.ts` |
| Material | Edge light, tinted shadows | Per palette | `atmosphereSignature.ts` → `--color-edge-light-rgb`, `--color-atmosphere-material-shadow-rgb` |
| Atmospheric | Shell placement | Bloom, fog, periphery, composition bias | `atmosphereSignature.ts` → `--atmosphere-gradient-behavior`, bias tokens |
| Typographic | Body font, measure | Display rhythm, prose warmth | `typographySignature.ts` → `--color-display-foreground`, `--type-prose-line-height` |

### Composition surfaces (Pass 3)

| Class | Role |
|-------|------|
| `.surface-environmental` | Heroes, hub headers — canvas bleed, no card box |
| `.surface-float` | Widgets, chips — soft shadow, border dissolves until hover |
| `.canvas-recess` | True void bands between focal regions (`--color-void`) |
| `.environmental-hero` | Full-bleed hero with edge dissolution |
| `.wiki-focal-region--canvas` | Content on canvas without card chrome |

Composition stances (`hero_dominant`, `editorial_stream`, `hub_stagger`, `studio_field`) live in `frontend/src/lib/compositionDoctrine.ts` and drive `NarrativeLayout` grid asymmetry via `data-composition-stance`.

Ambient motion (`frontend/src/styles/ambient-motion.css`): gradient drift, focal breathing, hover illumination — disabled under `prefers-reduced-motion`.

### Future hook

`--focal-luminance-mode: narrative-dark | illuminated` — reserved for an immersive reading toggle (document only; no UI in this pass).

## Workspace composition

Pages define composition width — **not the campaign shell**.

| Mode | Routes | Shell behavior |
|------|--------|----------------|
| **Workspace** | Codex, entity, hubs, dashboard, chronology, party, maps, notes | Full canvas field (`workspace-field`); asymmetric focal+rail grid |
| **Document** | Settings, world-advance, maintenance | Centered measure (`workspace-document`); respects user document width preference |

Resolved per route in `frontend/src/lib/workspaceComposition.ts`. Prose measure (`editorial-measure`) applies to **blocks inside** a workspace field — never to the shell outlet wrapper.

`NarrativeLayout` composition presets:

| Composition | Stance | Use |
|-------------|--------|-----|
| `dashboard` | `hero_dominant` | Campaign Home |
| `codex` | `editorial_stream` | Lore articles, tags hub, generic wiki pages |
| `entity` | `entity_workspace` | Character, faction, location, bestiary, ancestry, object, family detail |
| `hub` | `hub_stagger` | Category browse (entity catalogs use `entity-catalog-grid`) |
| `studio` | `studio_field` | Maps, party, chronology |

### Entity workspace — Phase 2 surface specialization

Phase 2 modifies **slots and widgets inside `EntityWorkspaceSurface`**, not shell/composition tokens. Implemented in `entityWorkspaceSlots.ts`, `EntityIdentityStrip`, and `EntityReadContextPanel`.

| Surface | Emphasis panel | Default block emphasis |
|---------|----------------|------------------------|
| Characters | Motivation, active arc, affiliations, bloodline | `entity-relationships` in default stack |
| Locations | Regional hierarchy trail, climate, authority | `entity-relationships`, `wiki-backlinks` |
| Factions | Leader, diplomatic tensions → Structure tab | existing org hero + relationships |
| Objects | Provenance, holder, significance | `entity-relationships` |
| Bestiary | Taxonomy, habitat, threat, behavior | appearance + relationships |
| Ancestries | Homeland, traditions, values | relationships + backlinks |
| Families | Lineage roots → Lineage tab | existing family hero + relationships |

**Identity strip convergence:** all entity types route through `EntityIdentityStrip` + projection adapters (`entityIdentityStripAdapter.ts`). Chip overflow uses `+N more` in document flow — not horizontal scroll.

**Reader-first layout:** `entityWorkspaceReaderFirst()` enables the emphasis panel above lore for players on all entity workspace keys.

### Future hook — region anchoring

After composition converges: spatial rhythm systems (hero↔rail top alignment, chronology↔focal anchoring, prose-rhythm baselines). Document only in this pass — no CSS primitives yet.

## Region composition

Workspace regions **emerge from atmosphere** — fields, not cards:

- Fewer visible containers; implicit boundaries via spacing + depth shift
- `.region-compose` soft top fade into canvas at region boundaries
- Reduced `border-radius` and absorptive shadows (no emissive focal glow)
- Hub browse tiles use `region-depth-3` within a depth-2 browse field

## Scene composition

Routes declare an environmental **scene profile** that orchestrates zone contrast on top of global theme derivation. Implemented in `frontend/src/lib/theme/sceneComposition.ts`, `zoneDerivation.ts`, and `SceneCompositionProvider` (campaign shell).

```text
ThemeProfile → global atmospheric base (:root)
      ↓
resolveSceneComposition(palette, workspace preset)
      ↓
Zone behaviors (sidebar, hero, prose, rail, void, float, chrome)
      ↓
--zone-* CSS vars + html[data-scene]
```

**Scene pilots:**

| Foundation | Palette scope | Routes | Dashboard scene | Codex scene |
|------------|---------------|--------|-----------------|-------------|
| Dark | `midnight` only | `codex`, `dashboard` | `moonlit_archive` (`restrained_spikes`) | `quiet_codex` (`editorial`) |
| Light | `sunset`, `desert`, `arctic` | `codex`, `dashboard` | `sunlit_archive` (`editorial`) | `quiet_reading_room` (`editorial`) |

Other dark palettes and non-pilot routes receive sidebar ecology globally but no scene layer.

### Luminance ecology

The scene/zone/cadence engine is unified; rendering physics differ by mode (`luminanceEcology.ts`):

| Dimension | Dark (nocturnal cinema) | Light (editorial daylight) |
|-----------|-------------------------|----------------------------|
| Lighting | `emissive` — bloom, edge glow | `reflective` — directional wash, paper shadow |
| Contrast | `void_spike` | `paper_recession` |
| Atmosphere | `volumetric` haze | `diffused` skylight/warmth |
| Material | `lacquered` | `fibrous` paper |

### Sidebar nav ecology (global dark foundation)

When `html[data-sidebar-ecology='atmospheric']` is set (all dark foundation palettes on every campaign route), sidebar navigation uses **environmental illumination** — not accent typography:

| State | Ink | Atmosphere |
|-------|-----|------------|
| Inactive | Palette-neutral ink (`--sidebar-nav-ink`) | Transparent — container lighting only |
| Hover | Slightly brighter ink | Faint edge-light wash (`--sidebar-nav-hover-fill-alpha`) |
| Active | Warm lifted ink (`--sidebar-nav-ink-active`) | Palette diffusion gradient + localized bloom + thin gold left border |

**Rules:**

- Palette identity lives in edge light, fill gradients, and bloom — never glyph fill
- Gold (`--sidebar-nav-active-edge-rgb`) is narrative punctuation on the active border only
- Container character is per-palette via `data-sidebar-atmosphere` (`violet_archive_wall`, `warm_diffusion`, `horizon_fog_wall`, `canopy_filter_wall`, `void_recess_wall`)
- Scene composition (`html[data-scene]`) **amplifies** intensity on pilot routes — it does not gate ecology

Implemented via `.sidebar-nav-item` + `[aria-current='page']` in `index.css`, tokens from `sidebarNavDerivation.ts`.

### Sidebar nav ecology (global light foundation — sunlit)

When `html[data-sidebar-ecology='sunlit']` is set (`sunset`, `desert`, `arctic` on every campaign route):

| State | Ink | Atmosphere |
|-------|-----|------------|
| Inactive | Dusty warm/cool ink | Transparent — paper container only |
| Hover | Darker lifted ink | Faint directional wash |
| Active | Deep editorial ink | Inset shadow + wash gradient + palette edge border (no outer glow) |

**Rules:**

- Typography carries more emotional weight than bloom in light mode
- Active border uses palette `edgeLightRgb` — not gold
- Container recipes: `warm_folio_wall`, `sand_archive_wall`, `skylight_folio_wall`
- Scene composition amplifies wash/fill on light codex/dashboard routes

Parchment/holiday presets without a light foundation palette omit `data-sidebar-ecology`.

## Atmospheric contrast zones

Emotional amplitude is distributed by **zone intensity** — not global opacity recession. When a scene is active, zone tiers are computed via `emotionalCurves.ts` (nonlinear thresholds) rather than global linear scaling:

| Zone | Intensity | Mechanism |
|------|-----------|-----------|
| Sidebar edge | medium | `.sidebar-atmosphere`, `--atmosphere-glow-alpha-sidebar`, composition-bias gradients |
| Hero | high | `.environmental-hero`, `--atmosphere-glow-alpha-hero`, dramatic bloom |
| Writing surface | silent | `.surface-silent`, flat paper (`--material-specular-silent`) |
| Context rails | low | contextual recess, semantic foreground tokens — no double opacity |
| Background void | zero | `.canvas-recess`, `--color-void` |
| Hover/focus | pulse | `ambient-motion.css` |

Light mode uses the **sunlit archive** paper ladder (`deriveLightFoundationCanvas`) — warm ivory canvas, dusty ink typography, zero prose opacity tricks.

## Glow tiers

Emissive bloom is **opt-in**, not baked into operational surfaces:

| Tier | Token | Alpha | Use |
|------|-------|-------|-----|
| Operational | `--atmosphere-glow-alpha-operational` | 0.06–0.08 | Default cards — material shadow only |
| Sidebar | `--atmosphere-glow-alpha-sidebar` | ~1.2× operational | Sidebar atmospheric rim |
| Rail | `--atmosphere-glow-alpha-rail` | ~0.85× operational | Context rails |
| Focal | `--atmosphere-glow-alpha-focal` | 0.10–0.14 | Hero edges, active narrative cards |
| Hero | `--atmosphere-glow-alpha-hero` | dramatic tier | Environmental hero bloom |
| Dramatic | `--atmosphere-glow-alpha-dramatic` | 0.16–0.22 | Hero bloom, map overlays, environmental events |

Apply via `.atmosphere-focal` / `.atmosphere-focal--dramatic` — never globally on `.surface-primary`.

## Silence zones

Richness requires **intentional absence**. `.surface-silent` suppresses glow, haze, gradients, `region-compose` fades, and backdrop blur. Use for long-form work: codex prose, dense tables, chronology ledgers, session prep. Parent shell may stay atmospheric; the work slab stays flat.

## Accent discipline

Cinematic restraint as surfaces go darker:

1. **One dominant illuminated element per viewport region** (focal column, rail, header)
2. Accents never compete across columns simultaneously
3. Glow reserved for narrative significance (hero, active timeline node, map overlays) — not operational chrome
4. Operational UI stays recessed (depth-1, no emissive glow)
5. Active nav: **one warm accent signal** (gold left edge or `text-accent-gold`) — not full bright pills
6. Borders: crisp material edges (`rgb(255 255 255 / 0.06)`) on elevated cards; warm border token on shell separators

## Shell vs focal (structural)

**The campaign shell must never apply `surface-primary`.** Focal surfaces are owned by pages only — `wiki-focal-region`, `CategoryHubShell`, `CampaignContinuityStream`, etc.

`CampaignLayout` renders ambient atmosphere **once** on the outer flex row (`canvas-atmosphere--ambient`), a lifted main column (`workspace-surface`), and `workspace-gutter`. Do not wrap `<Outlet />` in `surface-primary` or duplicate atmosphere on the scroll column.

## Rules

- Every high-traffic view has **exactly one** primary focal region.
- Layout shells use canvas tokens only; focal role tokens belong on page-owned regions.
- Contextual surfaces use tonal layering — not heavy borders — and never compete with focal.
- Recessed copy: `surface-recessed` / `type-meta`, max 2 lines in Reading mode.
- Operational chrome quiets in Reading mode (smaller type, softer presence).
- Prefer role tokens (`bg-focal`, `bg-depth-3`, `bg-contextual`) over raw `bg-surface border-border`.

## Codex entity layers

Entity page shells share tonal hierarchy (canvas shell → focal tab stream → elevated cards) but each layer answers a different narrative question:

| Layer | Guiding question | Shell |
|-------|------------------|-------|
| **Ancestries** | Who lives in the world? | `AncestryPageShell` — lived peoples, lineages, societies |
| **Organizations** | How does power move? | `OrganizationPageShell` — institutional power, pressures, presence |
| **Locations** | Where does the world ground? | `LocationPageShell` (planned) — spatial atlas, travel context |
| **Relations** | What connects entities? | Relations workspace — connective tissue across factions and kinship |

Organizations are **active powers**, not lore archives: Overview stays restrained (pressures + why-now), with depth in Structure, Presence, Relations, and People tabs.

## Category hub indexes

Quest, Thread, Entity browser, and Tags hubs use `CategoryHubShell` — one **focal browse stream** per view:

- Canvas header: breadcrumbs + operational toolbar only
- Focal body: title, description, and browse content (depth-3 tiles in depth-2 field)
- No contextual side rail on hub indexes (density doctrine)

Runtime theme presets derive role tokens via `deriveSurfaceRoleTokens()` in `frontend/src/lib/theme/themeVariables.ts`.

## PR check

See [design-philosophy-checklist.md](./design-philosophy-checklist.md) — focal surface, depth usage, accent restraint, and role token questions.
