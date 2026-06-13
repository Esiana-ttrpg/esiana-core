export const CLIMATE_ASPECTS = [
  'ARID',
  'PLUVIAL',
  'CRYORIC',
  'TEMPEST',
  'OVERGROWTH',
  'NEUTRAL',
] as const;

export type ClimateAspect = (typeof CLIMATE_ASPECTS)[number];

export const DEFAULT_CLIMATE_ASPECT: ClimateAspect = 'NEUTRAL';

const CLIMATE_ASPECT_SET = new Set<string>(CLIMATE_ASPECTS);

const IMPORT_CLIMATE_KEYS = [
  'climateAspect',
  'climate_aspect',
  'weather',
  'weather_type',
  'primary_climate',
] as const;

export const CLIMATE_ASPECT_EDITOR_OPTIONS: Array<{
  value: ClimateAspect;
  label: string;
}> = [
  { value: 'ARID', label: '☀️ Arid / Searing' },
  { value: 'PLUVIAL', label: '🌧️ Pluvial / Monsoon' },
  { value: 'CRYORIC', label: '❄️ Cryoric / Glacial' },
  { value: 'TEMPEST', label: '🌀 Tempest / Storm' },
  { value: 'OVERGROWTH', label: '🍂 Overgrowth / Decay' },
  { value: 'NEUTRAL', label: '🌤️ Temperate / Fair' },
];

const HEADER_ICONS: Record<ClimateAspect, string | null> = {
  ARID: '☀️',
  PLUVIAL: '🌧️',
  CRYORIC: '❄️',
  TEMPEST: '🌀',
  OVERGROWTH: '🍂',
  NEUTRAL: null,
};

export function normalizeClimateAspect(value: unknown): ClimateAspect {
  if (typeof value !== 'string') return DEFAULT_CLIMATE_ASPECT;
  const normalized = value.trim().toUpperCase();
  if (CLIMATE_ASPECT_SET.has(normalized)) {
    return normalized as ClimateAspect;
  }
  return DEFAULT_CLIMATE_ASPECT;
}

export function parseClimateAspectFromImportRow(
  row: Record<string, unknown>,
): ClimateAspect {
  for (const key of IMPORT_CLIMATE_KEYS) {
    if (row[key] !== undefined && row[key] !== null) {
      return normalizeClimateAspect(row[key]);
    }
  }
  return DEFAULT_CLIMATE_ASPECT;
}

export function getClimateAspectHeaderIcon(aspect: ClimateAspect): string | null {
  return HEADER_ICONS[aspect];
}
