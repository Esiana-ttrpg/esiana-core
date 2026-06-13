import {
  normalizeOptionalPageId,
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
} from './codexMetadataShared';
import { normalizeNullableText } from './entityRelationTypes';

export interface LocationMetadataFields {
  locationType: string | null;
  region: string | null;
  regionKey: string | null;
  regionPageId: string | null;
  dangerLevel: number | null;
  rulerOrAuthority: string | null;
  population: string | null;
  climate: string | null;
  knownFor: string | null;
  mapPageId: string | null;
  relatedLocationIds: string[];
}

function normalizeDangerLevel(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.round(raw);
    if (n >= 1 && n <= 5) return n;
    return null;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      const n = Math.round(parsed);
      if (n >= 1 && n <= 5) return n;
    }
  }
  return null;
}

function normalizeRegionKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return trimmed.length > 0 ? trimmed : null;
}

const LOCATION_METADATA_KEYS = [
  'locationType',
  'region',
  'regionKey',
  'regionPageId',
  'dangerLevel',
  'rulerOrAuthority',
  'population',
  'climate',
  'knownFor',
  'mapPageId',
  'relatedLocationIds',
] as const;

const EMPTY: LocationMetadataFields = {
  locationType: null,
  region: null,
  regionKey: null,
  regionPageId: null,
  dangerLevel: null,
  rulerOrAuthority: null,
  population: null,
  climate: null,
  knownFor: null,
  mapPageId: null,
  relatedLocationIds: [],
};

const REGION_LOCATION_TYPES =
  /^(region|continent|territory|province|realm|kingdom|nation|country|state|barony|duchy|empire)$/i;

export function isRegionLocationPage(page: { metadata?: unknown }): boolean {
  const { locationType } = parseLocationMetadata(page.metadata);
  return Boolean(locationType && REGION_LOCATION_TYPES.test(locationType.trim()));
}

export function filterRegionLocationPages<T extends { metadata?: unknown }>(
  pages: T[],
): T[] {
  return pages.filter(isRegionLocationPage);
}

export function parseLocationMetadata(metadata: unknown): LocationMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY };
  }
  const raw = metadata as Record<string, unknown>;
  return {
    locationType:
      normalizeNullableText(raw.locationType) ?? readLegacyMetadataField(raw, 'Type'),
    region:
      normalizeNullableText(raw.region) ?? readLegacyMetadataField(raw, 'Region'),
    regionKey: normalizeRegionKey(raw.regionKey),
    regionPageId: normalizeOptionalPageId(raw.regionPageId),
    dangerLevel: normalizeDangerLevel(raw.dangerLevel),
    rulerOrAuthority: normalizeNullableText(raw.rulerOrAuthority),
    population: normalizeNullableText(raw.population),
    climate: normalizeNullableText(raw.climate),
    knownFor: normalizeNullableText(raw.knownFor),
    mapPageId: normalizeOptionalPageId(raw.mapPageId),
    relatedLocationIds: normalizePageIdList(raw.relatedLocationIds),
  };
}

export function mergeLocationMetadata(
  existing: unknown,
  patch: Partial<LocationMetadataFields>,
  options?: { resolvePageTitle?: (pageId: string) => string | null },
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseLocationMetadata(base);
  const merged: LocationMetadataFields = { ...parsed, ...patch };
  const result: Record<string, unknown> = { ...base, ...merged };
  syncMetadataIndexFields(result, {
    Region: merged.region,
    Type: merged.locationType,
    Ruler: merged.rulerOrAuthority,
    Population: merged.population,
  });
  if (options?.resolvePageTitle) void options.resolvePageTitle;
  return result;
}

export function hasLocationMetadataPatch(body: Record<string, unknown>): boolean {
  return LOCATION_METADATA_KEYS.some((key) => key in body);
}

export function resolveLocationMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasLocationMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasLocationMetadataPatch(body)) return body;
  return null;
}
