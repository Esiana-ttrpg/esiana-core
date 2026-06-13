/**
 * Campaign ensemble / party cast screen configuration (frontend).
 */

/** Stored in `spotlightCharacterId` when the GM wants a random roster pick per visit. */
export const ENSEMBLE_SPOTLIGHT_RANDOM = '__ensemble_spotlight_random__';

export function isEnsembleSpotlightRandom(characterId: string | null): boolean {
  return characterId === ENSEMBLE_SPOTLIGHT_RANDOM;
}

export interface EnsembleConfig {
  name: string | null;
  summary: string | null;
  bannerImageUrl: string | null;
  activeArc: string | null;
  themes: string[];
  knownFor: string[];
  featuredQuestIds: string[];
  featuredLocationId: string | null;
  memberOrder: string[];
  spotlightCharacterId: string | null;
  spotlightQuote: string | null;
  spotlightNote: string | null;
  tensionNotes: string[];
  landingSurface: 'party' | 'dashboard' | null;
}

const MAX_FEATURED_QUESTS = 5;
const MAX_THEMES = 12;
const MAX_KNOWN_FOR = 8;
const MAX_TENSION_NOTES = 8;

function normalizeNullableText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function normalizePageIdArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeNullablePageId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLandingSurface(raw: unknown): 'party' | 'dashboard' | null {
  if (raw === 'party' || raw === 'dashboard') return raw;
  return null;
}

export function getDefaultEnsembleConfig(): EnsembleConfig {
  return {
    name: null,
    summary: null,
    bannerImageUrl: null,
    activeArc: null,
    themes: [],
    knownFor: [],
    featuredQuestIds: [],
    featuredLocationId: null,
    memberOrder: [],
    spotlightCharacterId: null,
    spotlightQuote: null,
    spotlightNote: null,
    tensionNotes: [],
    landingSurface: null,
  };
}

export function normalizeEnsembleConfig(raw: unknown): EnsembleConfig {
  if (!raw || typeof raw !== 'object') {
    return getDefaultEnsembleConfig();
  }
  const parsed = raw as Record<string, unknown>;
  const defaults = getDefaultEnsembleConfig();

  return {
    name: normalizeNullableText(parsed.name) ?? defaults.name,
    summary: normalizeNullableText(parsed.summary) ?? defaults.summary,
    bannerImageUrl:
      normalizeNullableText(parsed.bannerImageUrl) ?? defaults.bannerImageUrl,
    activeArc: normalizeNullableText(parsed.activeArc) ?? defaults.activeArc,
    themes: normalizeStringArray(parsed.themes, MAX_THEMES),
    knownFor: normalizeStringArray(parsed.knownFor, MAX_KNOWN_FOR),
    featuredQuestIds: normalizePageIdArray(parsed.featuredQuestIds, MAX_FEATURED_QUESTS),
    featuredLocationId:
      normalizeNullablePageId(parsed.featuredLocationId) ?? defaults.featuredLocationId,
    memberOrder: normalizePageIdArray(parsed.memberOrder, 32),
    spotlightCharacterId:
      normalizeNullablePageId(parsed.spotlightCharacterId) ??
      defaults.spotlightCharacterId,
    spotlightQuote:
      normalizeNullableText(parsed.spotlightQuote) ?? defaults.spotlightQuote,
    spotlightNote:
      normalizeNullableText(parsed.spotlightNote) ?? defaults.spotlightNote,
    tensionNotes: normalizeStringArray(parsed.tensionNotes, MAX_TENSION_NOTES),
    landingSurface: normalizeLandingSurface(parsed.landingSurface),
  };
}
