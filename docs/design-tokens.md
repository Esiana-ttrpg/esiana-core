# Design tokens

CSS primitives for layout, density, and editorial rhythm. Implemented in `frontend/src/index.css`, `frontend/src/lib/densityConstants.ts`, and `frontend/src/lib/surfaceLayout.ts`.

Related: [density-doctrine.md](./density-doctrine.md), [surface-hierarchy.md](./surface-hierarchy.md), [workspaceOrchestration.ts](../frontend/src/lib/workspaceOrchestration.ts).

## CSS custom properties (`:root`)

| Token | Default | Purpose |
|-------|---------|---------|
| `--font-ui` | system UI stack | Chrome, controls |
| `--font-display` | Source Serif 4 | Page titles, hero greetings |
| `--font-editorial` | Source Serif 4 | Prose surfaces |
| `--text-measure-ch` | `68` | Reading Standard measure |
| `--text-measure-wide-ch` | `80` | Reading Wide measure |
| `--text-measure-max-ch` | `90` | Hard cap on ultrawide |
| `--space-section` | `1.5rem` | Section gaps over borders |
| `--space-group` | `0.75rem` | In-section grouping |
| `--motion-duration` | `180ms` | Gentle transitions |
| `--motion-ease` | `ease-out` | Calm easing |
| `--breakpoint-ultrawide` | `1920px` | Ultrawide rules apply |
| `--focal-luminance-mode` | `narrative-dark` | Future immersive reading toggle hook |

## Surface role tokens

| Token | Role |
|-------|------|
| `--color-canvas` | Atmospheric shell foundation (warm neutral-charcoal on dark foundation) |
| `--color-canvas-gradient-mid` | Vertical/radial gradient stop for canvas depth |
| `--color-canvas-gradient-warm` | Palette haze radial wash (derived from `--color-atmosphere-haze-rgb`) |
| `--color-focal` / `--color-focal-elevated` / `--color-focal-foreground` / `--color-focal-muted` | Narrative focal plane (smoked-charcoal on dark) |
| `--color-depth-0` … `--color-depth-4` | Depth axis for sectional lifting within narrow luminance band |
| `--color-depth-*-rgb` | RGB companions for alpha compositing on depth surfaces |
| `--color-contextual` / `--color-contextual-foreground` | Warm-charcoal translucent veil (α 0.55–0.65) |
| `--color-recessed-foreground` | Metadata copy (warmer, lower contrast on dark) |
| `--color-operational-foreground` | Control chrome |
| `--color-overlay-elevated` | Modals and overlays (`depth-4`) |
| `--color-border-warm-rgb` | Atmospheric midpoint edge compositing for shell separators |
| `--color-*-rgb` | RGB companions for alpha compositing |
| `--color-focal-glow-rgb` | Sparse genre-tinted accent glow (not emissive focal edges) |
| `--color-atmosphere-glow-rgb` | Palette glow tint (+ accent nudge) for sparse bloom |
| `--color-atmosphere-shadow-rgb` | Shadow / vignette temperature |
| `--color-atmosphere-haze-rgb` | Ambient haze wash (primary identity carrier) |
| `--atmosphere-haze-alpha` | Ambient haze opacity (0.10–0.18, shell only) |
| `--atmosphere-glow-alpha-operational` | Material-tier glow (0.06–0.08) — default alias for `--atmosphere-glow-alpha` |
| `--atmosphere-glow-alpha-focal` | Opt-in focal bloom (0.10–0.14) |
| `--atmosphere-glow-alpha-dramatic` | Hero / map / event bloom (0.16–0.22) |
| `--accent-gold` / `--accent-warm` / `--accent-soft` | Warm navigation and metadata accents |
| `--atmosphere-region-fade-strength` | Region-compose fade opacity (from `ambientContrastBias`) |
| `--atmosphere-shadow-alpha` | Box-shadow opacity multiplier |
| `--atmosphere-shadow-blur` | Box-shadow blur radius |
| `--atmosphere-depth-edge-opacity` | Inset border / depth-edge visibility |
| `--atmosphere-vignette-strength` | Canvas edge darkening |
| `--color-edge-light-rgb` / `--atmosphere-edge-light-alpha` | Material rim tint (palette signature) |
| `--color-atmosphere-material-shadow-rgb` | Tinted elevation shadow (not pure black) |
| `--atmosphere-periphery-strength` | Asymmetric edge haze weight |
| `--atmosphere-fog-density` | Haze alpha multiplier |
| `--atmosphere-focal-intensity` | Focal/dramatic glow tier multiplier |
| `--atmosphere-gradient-behavior` | Shell gradient recipe id (CSS `html[data-atmosphere-gradient-behavior]`) |
| `--atmosphere-bias-horizontal` / `--atmosphere-bias-vertical` | Compositional atmosphere offset |
| `--atmosphere-warm-corner` / `--atmosphere-cold-corner` | Corner accent bias |
| `--color-void` / `--color-void-rgb` | True recess between focal regions |
| `--color-display-foreground` | Editorial display headings (brighter than body) |
| `--color-prose-muted` | Subdued prose secondary (silence zones) |
| `--type-display-size` / `--type-display-subtitle-gap` | Hero typography scale + isolation |
| `--type-prose-line-height` / `--type-section-gap-scale` | Palette editorial rhythm |

Derived at runtime by the theme harmonization layer in `frontend/src/lib/theme/atmosphericDerivation.ts`, `atmosphereSignature.ts`, and `typographySignature.ts` (via `deriveSurfaceRoleTokens()` in `themeVariables.ts`). Do not use raw slate `--color-bg` values for new converged shell surfaces.

### ThemeStack (four-pass compositing)

Layers merge by **channel authority**, not RGB addition:

```text
foundation = values        (canvas, depth ladder, silence, luminance physics)
genre      = transforms     (edge language, glow curves, typography mood)
event      = modulation     (celebratory amplitude on permitted channels)
scene      = orchestration  (route composition — final amplitude authority)
```

| Layer | Module | Authority |
|-------|--------|-----------|
| Foundation | `themeProfile.foundationPalette`, `luminanceEcology.ts` | Canvas, depth ladder, prose silence |
| Genre | `genreIdentity.ts` | Edge-light behavior, glow curves, bloom recipes |
| Event overlay | `eventOverlay.ts` | Hero/edge chroma (budgeted) — never slabs |
| Scene | `zoneDerivation.ts` | Amplitude precedence: scene > genre > event |

`html[data-genre]` and `html[data-event-overlay]` gate motion and edge-only CSS in `ambient-motion.css`. Saturation budgets (`saturationBudget.ts`): `proseMax = 0`, `sidebarMax = 0.20`, `heroMax = 0.45`, `overlayMax = 0.25`.

### Scene composition tokens (route-scoped)

Applied when `html[data-scene]` is set (Midnight + codex/dashboard pilot). See `zoneDerivation.ts`.

| Token | Purpose |
|-------|---------|
| `--zone-sidebar-glow-alpha` | Sidebar atmospheric bloom (nonlinear tier) |
| `--zone-hero-glow-alpha` | Hero dramatic bloom |
| `--zone-prose-glow-alpha` | Prose silence enforcement (0 when silent) |
| `--zone-rail-glow-alpha` | Context rail recess |
| `--zone-void-luminance-offset` | Void depth shift within depth ladder |
| `--zone-*-specular` / `--zone-*-absorption` | Per-zone material response |
| `--zone-*-edge-light` | Per-zone rim intensity |
| `--scene-void-ratio` | Void band padding scale (authored recipe) |
| `--scene-negative-space-scale` | Layout negative space override |
| `--scene-focal-column-ratio` | Focal column ratio override |
| `--scene-contextual-recess` | Contextual rail recess override |

| `html` attribute | Purpose |
|------------------|---------|
| `data-scene` | Active scene id (`moonlit_archive`, `quiet_codex`, `sunlit_archive`, `quiet_reading_room`) |
| `data-emotional-cadence` | Contrast curve (`restrained_spikes`, `editorial`, …) |
| `data-scene-hero-gradient` | Authored hero gradient recipe |
| `data-scene-sidebar-atmosphere` | Authored sidebar atmosphere recipe (scene pilot routes) |
| `data-sidebar-ecology` | `atmospheric` (dark foundation) or `sunlit` (light foundation) |
| `data-sidebar-atmosphere` | Per-palette container recipe — dark: `violet_archive_wall`, `warm_diffusion`, …; light: `warm_folio_wall`, `sand_archive_wall`, `skylight_folio_wall` |
| `data-genre` | Active genre transform layer (`fantasy`, `cyberpunk`, `parchment`, or unset) |
| `data-event-overlay` | Holiday modulation layer (`trans`, `pride`, `halloween`, `christmas`, or unset) |

### Luminance ecology (`luminanceEcology.ts`)

| Field | Dark foundation | Light foundation |
|-------|-----------------|------------------|
| `lightingModel` | `emissive` | `reflective` |
| `contrastModel` | `void_spike` | `paper_recession` |
| `atmosphereModel` | `volumetric` | `diffused` |
| `materialModel` | `lacquered` | `fibrous` |

`emotionalCurves.ts` delegates to `applyIlluminationCurve()` when `lightingModel === 'reflective'` (dramatic ceiling ~0.08 wash, not 0.45 glow).

### Sidebar nav tokens (global foundation)

Applied on `:root` for all foundation palettes via `sidebarNavDerivation.ts`. Scene composition **amplifies** intensity on pilot routes; it does not gate the feature.

| Token | Purpose |
|-------|---------|
| `--sidebar-nav-ink` | Inactive label RGB (palette typography tone) |
| `--sidebar-nav-ink-opacity` | Inactive label alpha (~0.82) |
| `--sidebar-nav-ink-hover` | Hover label RGB |
| `--sidebar-nav-ink-active` | Active label RGB (warm lifted ink) |
| `--sidebar-nav-edge-rgb` | Palette atmospheric edge (from `atmosphereSignature.edgeLightRgb`) |
| `--sidebar-nav-active-edge-rgb` | Dark: gold punctuation (`192 160 96`); Light: palette edge RGB |
| `--sidebar-nav-active-glow-alpha` | Active intensity — emissive bloom (dark) or wash/shadow alpha (light) |
| `--sidebar-nav-inactive-glow-alpha` | Container baseline intensity |
| `--sidebar-nav-active-fill-start` / `--sidebar-nav-active-fill-end` | Active gradient diffusion alphas |
| `--sidebar-nav-hover-fill-alpha` | Hover edge-light wash |
| `--sidebar-nav-active-catch-alpha` | Inset specular rim on active item |
| `--sidebar-nav-container-edge-alpha` | Sidebar wall inset edge weight |

**Per-palette inactive ink** (from typography `headingTone`):

| Palette | Inactive ink | Active ink |
|---------|--------------|------------|
| midnight | `214 219 230` | `245 238 220` |
| ocean | `200 210 220` | `230 238 245` |
| ember | `210 200 188` | `245 238 220` |
| forest | `205 210 198` | `238 232 210` |
| deep_space | `200 205 215` | `230 232 238` |

**Light foundation ink:**

| Palette | Inactive ink | Active ink |
|---------|--------------|------------|
| sunset | `72 62 52` | `42 36 28` |
| desert | `78 68 56` | `48 40 32` |
| arctic | `68 72 78` | `38 42 48` |

Surface class: `.sidebar-nav-item` — active state via `[aria-current='page']`.

### Luminance band (dark foundation)

| Transition | HSL lightness delta |
|------------|---------------------|
| canvas → focal (depth-2) | 6–10% |
| focal → elevated (depth-3) | 2–4% |
| focal foreground contrast | ≥ 7:1 |

### Theme harmonization (`atmosphericDerivation.ts`)

| Type / function | Role |
|-----------------|------|
| `AtmosphericIdentity` | Per-palette profile in `appearancePresets.ts` (lighting, surface bias, contrast) |
| `ThemeAtmosphereInput` | Resolved mood: 40% surface drift + 60% lighting channels |
| `FocalStyle` | `smoked_charcoal` \| `violet_smoke` \| `cool_graphite` \| `moss_charcoal` \| `light_page` |
| `resolveAtmosphericIdentity()` | Map palette ID → identity profile |
| `resolveThemeAtmosphereInput()` | Map `ThemeConfig` + preset + `_paletteId` → atmosphere input |
| `deriveAtmosphericRoles()` | Canvas, elevated, surface veil, gradients (subtle hue drift) |
| `deriveAtmosphericLighting()` | Haze, shadow, glow RGB (primary identity) |
| `deriveAtmosphericContrast()` | Perceptual density scalars from `ambientContrastBias` |
| `deriveContextualPalette()` | Charcoal contextual veil (fixed alpha curve) |
| `deriveEditorialFocal()` | Temperature-tinted dark focal + foreground + sparse glow |
| `deriveDepthPalette()` | depth-0…4 from luminance band |
| `deriveOperationalContrast()` | Recessed and operational copy |

Palette identity applies at base strength when a palette is selected. Background tint boosts strength (~1.5×). Accent palettes merge **primary/accent**; never raw `bg`/`surface`/`border` overrides.

## Workspace composition (`workspaceComposition.ts`)

| Preset | Routes | Shell class |
|--------|--------|-------------|
| `dashboard` | Campaign Home | `workspace-composition workspace-field` |
| `codex` | Wiki pages | `workspace-composition workspace-field` |
| `hub` | Category indexes | `workspace-composition workspace-field` |
| `studio` | Chronology, party, maps | `workspace-composition workspace-field` |
| `reference` | Session notes index | `workspace-composition workspace-field` |
| `document` | Settings, world tools | `workspace-document` + user page width |

CSS grid variants: `.narrative-layout--workspace` (1.2fr focal + rail), `.narrative-layout--hub` (single column).

## CSS utilities

| Class | Role |
|-------|------|
| `.workspace-field` | Full-bleed asymmetric workspace outlet |
| `.workspace-document` | Centered document-mode outlet |
| `.surface-primary` | Focal region (material shadow, crisp edge — no default emissive glow) |
| `.surface-silent` | Quiet work slab — no glow, haze, gradients, or compose fades |
| `.focal-elevated` | In-stream sectional lift |
| `.region-depth-1` … `.region-depth-3` | Sectional depth within focal streams |
| `.region-compose` | Atmospheric top fade at region boundary (disabled inside `.surface-silent`) |
| `.canvas-atmosphere--ambient` | Shell haze + vignette + grain (once on campaign flex row) |
| `.canvas-atmosphere--base` | Vignette + grain only |
| `.workspace-surface` | Main column lift (`depth-1`) without duplicate atmosphere |
| `.atmosphere-focal` / `.atmosphere-focal--dramatic` | Opt-in emissive bloom |

## Tailwind usage

- Prefer `gap-[var(--space-section)]` over nested bordered cards
- Prose: `max-w-[min(var(--text-measure-ch)*1ch,90ch)]` or utility `.editorial-measure`
- Surfaces: `bg-focal`, `bg-depth-3`, `bg-contextual`, `bg-canvas`, `text-accent-gold` — not ad-hoc `bg-surface` on new converged surfaces
- Typography: `.type-display`, `.type-prose`, `.type-meta`

## Surface roles

| Export (`surfaceLayout.ts`) | Role |
|-----------------------------|------|
| `CANVAS_ATMOSPHERE_AMBIENT_CLASS` | Shell atmosphere (single layer) |
| `WORKSPACE_SURFACE_CLASS` | Main scroll column lift |
| `ATMOSPHERE_FOCAL_CLASS` / `ATMOSPHERE_FOCAL_DRAMATIC_CLASS` | Opt-in bloom |
| `SURFACE_SILENT_CLASS` | Quiet work surfaces |
| `SURFACE_CANVAS_CLASS` | Shell foundation |
| `SURFACE_PRIMARY_CLASS` | Focal content (+ `region-compose`) |
| `FOCAL_ELEVATED_CLASS` | In-stream lift |
| `REGION_DEPTH_*_CLASS` | Sectional depth fields |
| `SURFACE_CONTEXTUAL_CLASS` | Supporting panel |
| `SURFACE_RECESSED_CLASS` | Metadata |
| `SURFACE_OPERATIONAL_CLASS` | Edit/customize chrome |
| `SURFACE_ELEVATED_CLASS` | Overlays |

See [surface-hierarchy.md](./surface-hierarchy.md).

## Workspace mapping

| Picker | `readableMeasureCh` |
|--------|---------------------|
| Reading + Standard | 68 |
