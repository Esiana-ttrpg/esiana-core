/** Shared layout class strings — see docs/design-tokens.md and docs/surface-hierarchy.md */

export const EDITORIAL_MEASURE_CLASS = 'editorial-measure w-full min-w-0';

export const SECTION_GAP_CLASS = 'gap-[var(--space-section)]';

export const CALM_BORDER_CLASS = 'border-border/40';

/** Atmospheric foundation — shell, negative space */
export const SURFACE_CANVAS_CLASS = 'surface-canvas min-h-full';

export const CANVAS_ATMOSPHERE_CLASS = 'canvas-atmosphere canvas-atmosphere--ambient';

export const CANVAS_ATMOSPHERE_BASE_CLASS = 'canvas-atmosphere--base';

export const CANVAS_ATMOSPHERE_AMBIENT_CLASS = 'canvas-atmosphere--ambient';

export const WORKSPACE_SURFACE_CLASS = 'workspace-surface';

export const ATMOSPHERE_FOCAL_CLASS = 'atmosphere-focal';

export const ATMOSPHERE_FOCAL_DRAMATIC_CLASS = 'atmosphere-focal atmosphere-focal--dramatic';

/** Canvas bleed — heroes, hub headers; no card boxing */
export const SURFACE_ENVIRONMENTAL_CLASS = 'surface-environmental min-w-0';

/** Soft widgets/chips — dissolve borders until hover */
export const SURFACE_FLOAT_CLASS = 'surface-float min-w-0';

/** True dark band between focal regions */
export const CANVAS_RECESS_CLASS = 'canvas-recess';

/** Full-bleed environmental hero framing */
export const ENVIRONMENTAL_HERO_CLASS = 'environmental-hero';

/** Quiet work surface — no glow, haze, gradients, or palette tint */
export const SURFACE_SILENT_CLASS = 'surface-silent min-w-0';

export const WORKSPACE_GUTTER_CLASS = 'workspace-gutter';

export const WORKSPACE_COMPOSITION_CLASS = 'workspace-composition';

/** Full-bleed asymmetric workspace field — pages own composition, not the shell */
export const WORKSPACE_FIELD_CLASS = 'workspace-field';

/** Centered document-mode pages (settings, world-advance) */
export const WORKSPACE_DOCUMENT_CLASS = 'workspace-document';

/** Focal narrative content — prose, hero story, note body */
export const SURFACE_PRIMARY_CLASS =
  'surface-primary region-compose min-w-0';

/** In-stream sectional lift within focal column */
export const FOCAL_ELEVATED_CLASS = 'focal-elevated';

export const REGION_DEPTH_1_CLASS = 'region-depth-1';
export const REGION_DEPTH_2_CLASS = 'region-depth-2';
export const REGION_DEPTH_3_CLASS = 'region-depth-3';

/** Supporting panel — codex rail, continuity awareness */
export const SURFACE_CONTEXTUAL_CLASS = 'surface-contextual min-w-0';

/** Inline contextual rail — flush on canvas edge, no card chrome */
export const SURFACE_CONTEXTUAL_INLINE_CLASS = 'surface-contextual-inline min-w-0';

/** Metadata, timestamps, breadcrumbs, save status */
export const SURFACE_RECESSED_CLASS = 'surface-recessed';

/** Edit controls, customize chrome, toolbars in Writing mode */
export const SURFACE_OPERATIONAL_CLASS = 'surface-operational';

/** Modals, overlays, floating sheets */
export const SURFACE_ELEVATED_CLASS = 'surface-elevated';

export const TYPE_DISPLAY_CLASS = 'type-display';
export const TYPE_PROSE_CLASS = 'type-prose';
export const TYPE_META_CLASS = 'type-meta';

/** Compact workspace header chrome — hubs and entity surfaces */
export const WORKSPACE_HEADER_COMPACT_CLASS = 'mb-1 pb-1';

export const WORKSPACE_TITLE_COMPACT_CLASS =
  'text-xl text-focal-foreground sm:text-2xl';

export const WORKSPACE_FOCAL_COMPACT_CLASS = 'wiki-focal-region--compact';

/** Sidebar atmospheric identity zone — moonlit/sunlit archive wall */
export const SIDEBAR_ATMOSPHERE_CLASS = 'sidebar-atmosphere';
export const SIDEBAR_IDENTITY_BAND_CLASS = 'sidebar-identity-band';
export const SIDEBAR_NAV_PRIMARY_CLASS = 'sidebar-nav-primary';
export const SIDEBAR_NAV_SECONDARY_CLASS = 'sidebar-nav-secondary';
export const SIDEBAR_NAV_ITEM_CLASS = 'sidebar-nav-item';
export const SIDEBAR_BREATHING_GAP_CLASS = 'sidebar-breathing-gap';

export function surfaceHeaderChromeClass(isReadingMode: boolean): string {
  return isReadingMode
    ? 'pb-1'
    : 'border-b border-border/40 pb-1';
}

export function codexChromeToneClass(isReadingMode: boolean): string {
  return isReadingMode ? 'codex-chrome-reading' : 'codex-chrome-writing';
}

export function narrativeFocalClass(active: boolean): string {
  return active ? ATMOSPHERE_FOCAL_CLASS : '';
}

export function narrativeFocalDramaticClass(active: boolean): string {
  return active ? ATMOSPHERE_FOCAL_DRAMATIC_CLASS : '';
}

export function environmentalHeroClass(hasCover: boolean): string {
  return [ENVIRONMENTAL_HERO_CLASS, hasCover ? narrativeFocalDramaticClass(true) : '']
    .filter(Boolean)
    .join(' ');
}
