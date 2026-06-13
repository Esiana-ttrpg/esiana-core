import {
  DARK_FOUNDATION_PALETTE_IDS,
  LIGHT_FOUNDATION_PALETTE_IDS,
  type GlobalPaletteId,
} from './appearancePresets';

export type LightingModel = 'emissive' | 'reflective';
export type ContrastModel = 'void_spike' | 'paper_recession';
export type AtmosphereModel = 'volumetric' | 'diffused';
export type MaterialModel = 'lacquered' | 'fibrous';
export type SidebarEcologyKind = 'atmospheric' | 'sunlit';

export interface LuminanceEcology {
  mode: 'light' | 'dark';
  lightingModel: LightingModel;
  contrastModel: ContrastModel;
  atmosphereModel: AtmosphereModel;
  materialModel: MaterialModel;
  sidebarEcology: SidebarEcologyKind | null;
}

const DARK_ECOLOGY: Omit<LuminanceEcology, 'sidebarEcology'> & {
  sidebarEcology: SidebarEcologyKind;
} = {
  mode: 'dark',
  lightingModel: 'emissive',
  contrastModel: 'void_spike',
  atmosphereModel: 'volumetric',
  materialModel: 'lacquered',
  sidebarEcology: 'atmospheric',
};

const LIGHT_ECOLOGY: Omit<LuminanceEcology, 'sidebarEcology'> & {
  sidebarEcology: SidebarEcologyKind;
} = {
  mode: 'light',
  lightingModel: 'reflective',
  contrastModel: 'paper_recession',
  atmosphereModel: 'diffused',
  materialModel: 'fibrous',
  sidebarEcology: 'sunlit',
};

export function isLightFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is (typeof LIGHT_FOUNDATION_PALETTE_IDS)[number] {
  if (!paletteId) return false;
  return (LIGHT_FOUNDATION_PALETTE_IDS as readonly string[]).includes(paletteId);
}

export function isDarkFoundationPalette(
  paletteId: GlobalPaletteId | undefined,
): paletteId is (typeof DARK_FOUNDATION_PALETTE_IDS)[number] {
  if (!paletteId) return false;
  return (DARK_FOUNDATION_PALETTE_IDS as readonly string[]).includes(paletteId);
}

export function resolveLuminanceEcology(
  mode: 'light' | 'dark',
  paletteId: GlobalPaletteId | undefined,
): LuminanceEcology {
  if (mode === 'light' && isLightFoundationPalette(paletteId)) {
    return { ...LIGHT_ECOLOGY };
  }
  if (mode === 'dark' && isDarkFoundationPalette(paletteId)) {
    return { ...DARK_ECOLOGY };
  }
  return {
    mode,
    lightingModel: mode === 'light' ? 'reflective' : 'emissive',
    contrastModel: mode === 'light' ? 'paper_recession' : 'void_spike',
    atmosphereModel: mode === 'light' ? 'diffused' : 'volumetric',
    materialModel: mode === 'light' ? 'fibrous' : 'lacquered',
    sidebarEcology: null,
  };
}

export function isReflectiveEcology(ecology: LuminanceEcology): boolean {
  return ecology.lightingModel === 'reflective';
}

export function usesGlowMechanics(ecology: LuminanceEcology): boolean {
  return ecology.lightingModel === 'emissive';
}

export function usesWashMechanics(ecology: LuminanceEcology): boolean {
  return ecology.lightingModel === 'reflective';
}
