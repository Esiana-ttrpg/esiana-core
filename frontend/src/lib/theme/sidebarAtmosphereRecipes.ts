import {
  DARK_FOUNDATION_PALETTE_IDS,
  LIGHT_FOUNDATION_PALETTE_IDS,
  type DarkFoundationPaletteId,
  type GlobalPaletteId,
  type LightFoundationPaletteId,
} from './appearancePresets';
import type { SidebarEcologyKind } from './luminanceEcology';

export type DarkSidebarAtmosphereRecipeId =
  | 'violet_archive_wall'
  | 'warm_diffusion'
  | 'horizon_fog_wall'
  | 'canopy_filter_wall'
  | 'void_recess_wall';

export type LightSidebarAtmosphereRecipeId =
  | 'warm_folio_wall'
  | 'sand_archive_wall'
  | 'skylight_folio_wall';

export type SidebarAtmosphereRecipeId =
  | DarkSidebarAtmosphereRecipeId
  | LightSidebarAtmosphereRecipeId;

const DARK_PALETTE_RECIPES: Record<
  DarkFoundationPaletteId,
  DarkSidebarAtmosphereRecipeId
> = {
  midnight: 'violet_archive_wall',
  ember: 'warm_diffusion',
  ocean: 'horizon_fog_wall',
  forest: 'canopy_filter_wall',
  deep_space: 'void_recess_wall',
};

const LIGHT_PALETTE_RECIPES: Record<
  LightFoundationPaletteId,
  LightSidebarAtmosphereRecipeId
> = {
  sunset: 'warm_folio_wall',
  desert: 'sand_archive_wall',
  arctic: 'skylight_folio_wall',
};

export function isDarkFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is DarkFoundationPaletteId {
  if (!paletteId) return false;
  return (DARK_FOUNDATION_PALETTE_IDS as readonly string[]).includes(paletteId);
}

export function isLightFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is LightFoundationPaletteId {
  if (!paletteId) return false;
  return (LIGHT_FOUNDATION_PALETTE_IDS as readonly string[]).includes(paletteId);
}

export function resolveSidebarEcologyValue(
  paletteId: GlobalPaletteId | undefined,
): SidebarEcologyKind | null {
  if (isDarkFoundationPalette(paletteId)) return 'atmospheric';
  if (isLightFoundationPalette(paletteId)) return 'sunlit';
  return null;
}

export function resolveSidebarAtmosphereRecipe(
  paletteId: GlobalPaletteId | undefined,
): SidebarAtmosphereRecipeId | null {
  if (isDarkFoundationPalette(paletteId)) return DARK_PALETTE_RECIPES[paletteId];
  if (isLightFoundationPalette(paletteId)) return LIGHT_PALETTE_RECIPES[paletteId];
  return null;
}
