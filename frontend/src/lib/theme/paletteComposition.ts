import type { GlobalPaletteId } from './appearancePresets';
import { isLightFoundationPalette } from './sidebarAtmosphereRecipes';

export type SidebarWeight = 'light' | 'medium' | 'heavy';
export type HeroIsolation = 'low' | 'medium' | 'high';
export type VoidPresence = 'low' | 'medium' | 'high';
export type EdgeBias = 'left' | 'center' | 'right';
export type FocusGravity = 'edge' | 'center' | 'horizon';

/** Structural composition logic per palette — not slab colors. */
export interface PaletteCompositionLogic {
  sidebarWeight: SidebarWeight;
  heroIsolation: HeroIsolation;
  voidPresence: VoidPresence;
  edgeBias: EdgeBias;
  focusGravity: FocusGravity;
}

export const MIDNIGHT_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'heavy',
  heroIsolation: 'high',
  voidPresence: 'high',
  edgeBias: 'left',
  focusGravity: 'edge',
};

export const EMBER_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'medium',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'center',
  focusGravity: 'center',
};

export const OCEAN_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'medium',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'center',
  focusGravity: 'horizon',
};

export const FOREST_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'heavy',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'left',
  focusGravity: 'edge',
};

export const DEEP_SPACE_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'light',
  heroIsolation: 'high',
  voidPresence: 'high',
  edgeBias: 'right',
  focusGravity: 'edge',
};

export const SUNSET_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'medium',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'center',
  focusGravity: 'center',
};

export const DESERT_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'medium',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'right',
  focusGravity: 'center',
};

export const ARCTIC_COMPOSITION: PaletteCompositionLogic = {
  sidebarWeight: 'medium',
  heroIsolation: 'medium',
  voidPresence: 'medium',
  edgeBias: 'center',
  focusGravity: 'horizon',
};

const PALETTE_COMPOSITIONS: Partial<
  Record<GlobalPaletteId, PaletteCompositionLogic>
> = {
  midnight: MIDNIGHT_COMPOSITION,
  ember: EMBER_COMPOSITION,
  ocean: OCEAN_COMPOSITION,
  forest: FOREST_COMPOSITION,
  deep_space: DEEP_SPACE_COMPOSITION,
  sunset: SUNSET_COMPOSITION,
  desert: DESERT_COMPOSITION,
  arctic: ARCTIC_COMPOSITION,
};

export function resolvePaletteComposition(
  paletteId: GlobalPaletteId | undefined,
): PaletteCompositionLogic | null {
  if (!paletteId) return null;
  return PALETTE_COMPOSITIONS[paletteId] ?? null;
}

export function isSceneCompositionPilotPalette(
  paletteId: GlobalPaletteId | undefined,
): boolean {
  if (!paletteId) return false;
  return (
    paletteId === 'midnight' ||
    isLightFoundationPalette(paletteId)
  );
}
