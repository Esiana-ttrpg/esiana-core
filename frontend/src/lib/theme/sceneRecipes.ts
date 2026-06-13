import type { GlobalPaletteId } from './appearancePresets';
import type { SceneId } from './sceneComposition';
import {
  isLightFoundationPalette,
  type LightSidebarAtmosphereRecipeId,
} from './sidebarAtmosphereRecipes';

export type HeroGradientRecipe =
  | 'celestial_bloom_left'
  | 'warm_center_rise'
  | 'horizon_fog_open'
  | 'none';

export type SidebarAtmosphereRecipe =
  | 'violet_archive_wall'
  | 'warm_diffusion'
  | 'neutral_recess'
  | 'warm_folio_wall'
  | 'sand_archive_wall'
  | 'skylight_folio_wall'
  | 'none';

/** Curated non-procedural scene overrides — mockup-style intentional cheating. */
export interface SceneAuthoredOverrides {
  heroGradient: HeroGradientRecipe;
  sidebarAtmosphere: SidebarAtmosphereRecipe;
  voidRatio: number;
  heroBleed?: number;
  proseFlatness?: number;
}

const MOONLIT_ARCHIVE_OVERRIDES: SceneAuthoredOverrides = {
  heroGradient: 'celestial_bloom_left',
  sidebarAtmosphere: 'violet_archive_wall',
  voidRatio: 0.18,
  heroBleed: 0.12,
};

const QUIET_CODEX_OVERRIDES: SceneAuthoredOverrides = {
  heroGradient: 'none',
  sidebarAtmosphere: 'violet_archive_wall',
  voidRatio: 0.12,
  proseFlatness: 1,
};

const SUNLIT_ARCHIVE_OVERRIDES: SceneAuthoredOverrides = {
  heroGradient: 'warm_center_rise',
  sidebarAtmosphere: 'warm_folio_wall',
  voidRatio: 0.08,
  heroBleed: 0.06,
};

const QUIET_READING_ROOM_OVERRIDES: SceneAuthoredOverrides = {
  heroGradient: 'none',
  sidebarAtmosphere: 'warm_folio_wall',
  voidRatio: 0.06,
  proseFlatness: 1,
};

const SCENE_RECIPES: Partial<Record<SceneId, SceneAuthoredOverrides>> = {
  moonlit_archive: MOONLIT_ARCHIVE_OVERRIDES,
  quiet_codex: QUIET_CODEX_OVERRIDES,
  sunlit_archive: SUNLIT_ARCHIVE_OVERRIDES,
  quiet_reading_room: QUIET_READING_ROOM_OVERRIDES,
};

const LIGHT_SIDEBAR_BY_PALETTE: Record<
  'sunset' | 'desert' | 'arctic',
  LightSidebarAtmosphereRecipeId
> = {
  sunset: 'warm_folio_wall',
  desert: 'sand_archive_wall',
  arctic: 'skylight_folio_wall',
};

const LIGHT_HERO_BY_PALETTE: Partial<
  Record<'sunset' | 'desert' | 'arctic', HeroGradientRecipe>
> = {
  sunset: 'warm_center_rise',
  desert: 'warm_center_rise',
  arctic: 'horizon_fog_open',
};

function resolveLightAuthoredOverrides(
  sceneId: SceneId,
  paletteId: GlobalPaletteId | undefined,
): SceneAuthoredOverrides | undefined {
  const base = SCENE_RECIPES[sceneId];
  if (!base || !isLightFoundationPalette(paletteId)) return base;

  return {
    ...base,
    heroGradient: LIGHT_HERO_BY_PALETTE[paletteId] ?? base.heroGradient,
    sidebarAtmosphere: LIGHT_SIDEBAR_BY_PALETTE[paletteId],
  };
}

export function resolveSceneAuthoredOverrides(
  sceneId: SceneId,
  paletteId?: GlobalPaletteId,
): SceneAuthoredOverrides | undefined {
  if (paletteId && isLightFoundationPalette(paletteId)) {
    return resolveLightAuthoredOverrides(sceneId, paletteId);
  }
  return SCENE_RECIPES[sceneId];
}
