import {
  normalizeOptionalPageId,
  normalizePageIdList,
  readLegacyMetadataField,
  syncMetadataIndexFields,
} from './codexMetadataShared';
import { normalizeNullableText, normalizeStringArray } from './entityRelationTypes';

/** Short narrative entries (not taxonomy tags); v1 UI may present as chips. */
export type LocationKnownForEntry = string;

export interface LocationMetadataFields {
  locationType: string | null;
  region: string | null;
  regionKey: string | null;
  regionPageId: string | null;
  threats: string[];
  rulerOrAuthority: string | null;
  population: string | null;
  climate: string | null;
  knownFor: LocationKnownForEntry[];
  currentStatus: string | null;
  mapPageId: string | null;
  relatedLocationIds: string[];
}

function dedupeStringsCaseInsensitive(entries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

/** Normalizes multi-value short text lists (threats, known-for entries). */
function normalizeShortEntryList(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()];
  }
  return dedupeStringsCaseInsensitive(normalizeStringArray(raw));
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
  'threats',
  'rulerOrAuthority',
  'population',
  'climate',
  'knownFor',
  'currentStatus',
  'mapPageId',
  'relatedLocationIds',
] as const;

const EMPTY: LocationMetadataFields = {
  locationType: null,
  region: null,
  regionKey: null,
  regionPageId: null,
  threats: [],
  rulerOrAuthority: null,
  population: null,
  climate: null,
  knownFor: [],
  currentStatus: null,
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

export function resolveLocationRegionLabel(
  location: Pick<LocationMetadataFields, 'region' | 'regionPageId'>,
  flatPages: ReadonlyArray<{ id: string; title: string }>,
): string | null {
  if (location.regionPageId) {
    const page = flatPages.find((p) => p.id === location.regionPageId);
    if (page?.title?.trim()) return page.title.trim();
  }
  return location.region;
}

export function formatLocationKnownForDisplay(knownFor: string[]): string | null {
  if (knownFor.length === 0) return null;
  return knownFor.join(' • ');
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
    threats: normalizeShortEntryList(raw.threats),
    rulerOrAuthority: normalizeNullableText(raw.rulerOrAuthority),
    population: normalizeNullableText(raw.population),
    climate: normalizeNullableText(raw.climate),
    knownFor: normalizeShortEntryList(raw.knownFor),
    currentStatus: normalizeNullableText(raw.currentStatus),
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
  delete result.dangerLevel;
  syncMetadataIndexFields(result, {
    Region: merged.region,
    Type: merged.locationType,
    Status: merged.currentStatus,
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

export { LOCATION_THREAT_SUGGESTIONS } from '@shared/locationThreatSuggestions';
