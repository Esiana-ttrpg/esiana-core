import { normalizeImageCredit, type ImageCredit } from '../../../shared/imageCredit.js';
import {
  DEFAULT_PARTY_PARTICIPATION,
  formatPartyParticipationLabel,
  isActivePartyCharacter,
  normalizePartyParticipationPatch,
  parsePartyParticipation,
  type PartyParticipation,
} from '../../../shared/partyParticipation.js';
import {
  normalizeAppearanceGallery,
  normalizeAppearanceDetailsFromAppearance,
  type AppearanceGalleryState,
  type AppearanceDetailsFields,
} from '../../../shared/appearanceMetadata.js';
import { coerceAssetReferenceUrl } from '../../../shared/assetReferenceValidation.js';
import {
  type ChronologyDateParts,
  dateSortKey,
  normalizeNullablePageId,
  normalizeNullableText,
  normalizeStringArray,
} from './entityRelationTypes.js';
import {
  isCharacterAliveAt,
  parseCharacterLineageMetadata,
  type CharacterLineageFields,
} from './characterLineageMetadata.js';

export type CharacterLifeStatus =
  | 'ALIVE'
  | 'DECEASED'
  | 'MISSING'
  | 'EXILED'
  | 'UNKNOWN';

export type {
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  AppearanceDetailsFields,
  AppearancePresentationType,
} from '../../../shared/appearanceMetadata.js';

/**
 * Character appearance metadata.
 *
 * Data ownership:
 * - Entity-level: summary, appearanceTags, gender, presentation, pronouns
 * - Forms-level: gallery.entries (presentation-state overlays)
 * - Details-level: build, voice, distinguishingFeatures, visibleInjuries,
 *   apparelDescription (clothingMotifs), vibeImpression, atAGlance
 */
export interface CharacterAppearanceMetadata {
  summary: string | null;
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  pronouns: string | null;
  gender: string | null;
  presentation: string | null;
  height: string | null;
  build: string | null;
  hairDescription: string | null;
  eyeDescription: string | null;
  distinguishingFeatures: string[];
  apparelDescription: string | null;
  appearanceTags: string[];
  gallery: AppearanceGalleryState;
  voice: string | null;
  visibleInjuries: string[];
  vibeImpression: string | null;
  atAGlance: string | null;
}

export type { PartyParticipation, PartyParticipationRole } from '../../../shared/partyParticipation.js';

export interface CharacterIdentityFields {
  profession: string | null;
  title: string | null;
  primaryAffiliationId: string | null;
  ancestry: string | null;
  ancestryId: string | null;
  lineageId: string | null;
  currentLocationId: string | null;
  status: CharacterLifeStatus | null;
  knownFor: string | null;
  activeArc: string | null;
  motivation: string | null;
  partyParticipation: PartyParticipation;
  appearance: CharacterAppearanceMetadata;
}

const CHARACTER_IDENTITY_KEYS = [
  'profession',
  'title',
  'primaryAffiliationId',
  'ancestry',
  'ancestryId',
  'lineageId',
  'currentLocationId',
  'status',
  'knownFor',
  'activeArc',
  'motivation',
  'partyParticipation',
  'appearance',
] as const;

const EMPTY_APPEARANCE: CharacterAppearanceMetadata = {
  summary: null,
  portraitUrl: null,
  portraitCredit: null,
  pronouns: null,
  gender: null,
  presentation: null,
  height: null,
  build: null,
  hairDescription: null,
  eyeDescription: null,
  distinguishingFeatures: [],
  apparelDescription: null,
  appearanceTags: [],
  gallery: { entries: [] },
  voice: null,
  visibleInjuries: [],
  vibeImpression: null,
  atAGlance: null,
};

const EMPTY_IDENTITY: CharacterIdentityFields = {
  profession: null,
  title: null,
  primaryAffiliationId: null,
  ancestry: null,
  ancestryId: null,
  lineageId: null,
  currentLocationId: null,
  status: null,
  knownFor: null,
  activeArc: null,
  motivation: null,
  partyParticipation: { ...DEFAULT_PARTY_PARTICIPATION },
  appearance: { ...EMPTY_APPEARANCE },
};

const LIFE_STATUSES: readonly CharacterLifeStatus[] = [
  'ALIVE',
  'DECEASED',
  'MISSING',
  'EXILED',
  'UNKNOWN',
];

function readQuickInfoField(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const quickInfo = metadata.quickInfo;
  if (!Array.isArray(quickInfo)) return null;
  for (const entry of quickInfo) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { key?: unknown }).key === key
    ) {
      const value = (entry as { value?: unknown }).value;
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }
  return null;
}

function normalizeLifeStatus(raw: unknown): CharacterLifeStatus | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if ((LIFE_STATUSES as readonly string[]).includes(upper)) {
    return upper as CharacterLifeStatus;
  }
  const labelMap: Record<string, CharacterLifeStatus> = {
    ALIVE: 'ALIVE',
    DECEASED: 'DECEASED',
    DEAD: 'DECEASED',
    MISSING: 'MISSING',
    EXILED: 'EXILED',
    UNKNOWN: 'UNKNOWN',
  };
  return labelMap[upper] ?? null;
}

function normalizeAppearance(raw: unknown): CharacterAppearanceMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_APPEARANCE };
  }
  const obj = raw as Record<string, unknown>;
  const details = normalizeAppearanceDetailsFromAppearance(obj);
  return {
    summary: normalizeNullableText(obj.summary),
    portraitUrl: coerceAssetReferenceUrl(obj.portraitUrl),
    portraitCredit: normalizeImageCredit(obj.portraitCredit),
    pronouns: normalizeNullableText(obj.pronouns),
    gender: normalizeNullableText(obj.gender),
    presentation: normalizeNullableText(obj.presentation),
    height: normalizeNullableText(obj.height),
    build: details.build,
    hairDescription: normalizeNullableText(obj.hairDescription),
    eyeDescription: normalizeNullableText(obj.eyeDescription),
    distinguishingFeatures: details.distinguishingFeatures,
    apparelDescription: details.clothingMotifs,
    appearanceTags: normalizeStringArray(obj.appearanceTags),
    gallery: normalizeAppearanceGallery(obj.gallery),
    voice: details.voice,
    visibleInjuries: details.visibleInjuries,
    vibeImpression: details.vibeImpression,
    atAGlance: details.atAGlance,
  };
}

function resolveAppearanceWithLegacy(
  raw: Record<string, unknown>,
): CharacterAppearanceMetadata {
  const appearance = normalizeAppearance(raw.appearance);
  return {
    ...appearance,
    pronouns:
      appearance.pronouns ??
      normalizeNullableText(raw.pronouns) ??
      readQuickInfoField(raw, 'Pronouns'),
    gender:
      appearance.gender ??
      normalizeNullableText(raw.gender) ??
      readQuickInfoField(raw, 'Gender'),
  };
}

export function parseCharacterMetadata(metadata: unknown): CharacterIdentityFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_IDENTITY, appearance: { ...EMPTY_APPEARANCE } };
  }
  const raw = metadata as Record<string, unknown>;

  return {
    profession:
      normalizeNullableText(raw.profession) ?? readQuickInfoField(raw, 'Profession'),
    title: normalizeNullableText(raw.title),
    primaryAffiliationId: normalizeNullablePageId(raw.primaryAffiliationId),
    ancestry:
      normalizeNullableText(raw.ancestry) ?? readQuickInfoField(raw, 'Ancestry'),
    ancestryId: normalizeNullablePageId(raw.ancestryId),
    lineageId: normalizeNullablePageId(raw.lineageId),
    currentLocationId: normalizeNullablePageId(raw.currentLocationId),
    status:
      normalizeLifeStatus(raw.status) ??
      normalizeLifeStatus(readQuickInfoField(raw, 'Status')),
    knownFor:
      normalizeNullableText(raw.knownFor) ?? readQuickInfoField(raw, 'Known For'),
    activeArc: normalizeNullableText(raw.activeArc),
    motivation: normalizeNullableText(raw.motivation),
    partyParticipation: parsePartyParticipation(raw),
    appearance: resolveAppearanceWithLegacy(raw),
  };
}

export function formatCharacterStatusLabel(status: CharacterLifeStatus): string {
  switch (status) {
    case 'ALIVE':
      return 'Alive';
    case 'DECEASED':
      return 'Deceased';
    case 'MISSING':
      return 'Missing';
    case 'EXILED':
      return 'Exiled';
    case 'UNKNOWN':
      return 'Unknown';
    default:
      return 'Unknown';
  }
}

export function resolveCharacterStatus(
  identity: CharacterIdentityFields,
  lineage: CharacterLineageFields,
  campaignNow?: ChronologyDateParts,
): CharacterLifeStatus {
  if (identity.status) return identity.status;
  if (lineage.deathDate) return 'DECEASED';
  if (campaignNow && isCharacterAliveAt(lineage, campaignNow)) return 'ALIVE';
  if (campaignNow) return 'UNKNOWN';
  return 'UNKNOWN';
}

export function resolvePrimaryAffiliationId(
  identity: CharacterIdentityFields,
  lineage: CharacterLineageFields,
  campaignNow?: ChronologyDateParts,
): string | null {
  if (identity.primaryAffiliationId) return identity.primaryAffiliationId;
  if (!campaignNow) {
    return lineage.orgAffiliations[0]?.orgId ?? null;
  }
  const queryKey = dateSortKey(campaignNow);
  for (const aff of lineage.orgAffiliations) {
    if (aff.startDate && dateSortKey(aff.startDate) > queryKey) continue;
    if (aff.endDate && dateSortKey(aff.endDate) < queryKey) continue;
    return aff.orgId;
  }
  return null;
}

export interface CharacterIndexSyncContext {
  lineage?: CharacterLineageFields;
  resolvePageTitle?: (pageId: string) => string | null;
  campaignNow?: ChronologyDateParts;
}

export function syncCharacterIndexFields(
  metadata: Record<string, unknown>,
  identity: CharacterIdentityFields,
  context: CharacterIndexSyncContext = {},
): void {
  const lineage =
    context.lineage ?? parseCharacterLineageMetadata(metadata);
  const resolveTitle = context.resolvePageTitle ?? (() => null);

  const affiliationId = resolvePrimaryAffiliationId(
    identity,
    lineage,
    context.campaignNow,
  );
  const affiliationLabel = affiliationId
    ? resolveTitle(affiliationId) ?? affiliationId
    : null;

  const familyLabel = lineage.familyId
    ? resolveTitle(lineage.familyId) ?? lineage.familyId
    : null;

  const locationLabel = identity.currentLocationId
    ? resolveTitle(identity.currentLocationId) ?? identity.currentLocationId
    : null;

  const status = resolveCharacterStatus(
    identity,
    lineage,
    context.campaignNow,
  );

  const fieldMap: Record<string, string | null> = {
    Role: identity.title ?? identity.profession,
    Affiliation: affiliationLabel,
    Family: familyLabel,
    Status: formatCharacterStatusLabel(status),
    Location: locationLabel,
    'Known For': identity.knownFor,
    Party: formatPartyParticipationLabel(identity.partyParticipation),
  };

  const existing = Array.isArray(metadata.quickInfo)
    ? (metadata.quickInfo as Array<{ key: string; value: string }>)
    : [];
  const nextFields = [...existing.filter((f) => !(f.key in fieldMap))];
  for (const [key, value] of Object.entries(fieldMap)) {
    nextFields.push({ key, value: value ?? '' });
  }
  metadata.quickInfo = nextFields;
}

export function reconcileCharacterIndexFromMetadata(
  metadata: Record<string, unknown>,
  options?: CharacterIndexSyncContext,
): Record<string, unknown> {
  const identity = parseCharacterMetadata(metadata);
  syncCharacterIndexFields(metadata, identity, options);
  return metadata;
}

export function mergeCharacterMetadata(
  existing: unknown,
  patch: Partial<CharacterIdentityFields>,
  options?: CharacterIndexSyncContext,
): Record<string, unknown> {
  const normalizedPatch = normalizeCharacterMetadataPatch(
    patch as Record<string, unknown>,
  );
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseCharacterMetadata(base);
  const merged: CharacterIdentityFields = {
    ...parsed,
    ...normalizedPatch,
    partyParticipation: normalizedPatch.partyParticipation
      ? { ...parsed.partyParticipation, ...normalizedPatch.partyParticipation }
      : parsed.partyParticipation,
    appearance: normalizedPatch.appearance
      ? { ...parsed.appearance, ...normalizedPatch.appearance }
      : parsed.appearance,
  };

  const result: Record<string, unknown> = {
    ...base,
    profession: merged.profession,
    title: merged.title,
    primaryAffiliationId: merged.primaryAffiliationId,
    ancestry: merged.ancestry,
    currentLocationId: merged.currentLocationId,
    status: merged.status,
    knownFor: merged.knownFor,
    activeArc: merged.activeArc,
    motivation: merged.motivation,
    partyParticipation: merged.partyParticipation,
    appearance: merged.appearance,
  };

  delete result.gender;
  delete result.pronouns;

  syncCharacterIndexFields(result, merged, options);
  return result;
}

export function isCharacterMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return CHARACTER_IDENTITY_KEYS.some((key) => {
    const value = raw[key];
    if (value === undefined || value === null) return false;
    if (key === 'appearance' && typeof value === 'object') {
      return Object.keys(value as object).length > 0;
    }
    if (key === 'partyParticipation' && typeof value === 'object') {
      return isActivePartyCharacter({ partyParticipation: value });
    }
    return true;
  });
}

export function hasCharacterMetadataPatch(body: Record<string, unknown>): boolean {
  if (CHARACTER_IDENTITY_KEYS.some((key) => key in body)) return true;
  if ('gender' in body || 'pronouns' in body) return true;
  const appearance = body.appearance;
  if (appearance && typeof appearance === 'object' && !Array.isArray(appearance)) {
    const keys = Object.keys(appearance as object);
    if (keys.length > 0) return true;
  }
  return false;
}

/** Map legacy top-level gender/pronouns patches into appearance.* */
export function normalizeCharacterMetadataPatch(
  patch: Record<string, unknown>,
): Partial<CharacterIdentityFields> {
  const {
    gender,
    pronouns,
    appearance: appearancePatch,
    partyParticipation: partyParticipationPatch,
    ...rest
  } = patch;
  const normalized: Partial<CharacterIdentityFields> = {
    ...(rest as Partial<CharacterIdentityFields>),
  };

  if ('partyParticipation' in patch) {
    normalized.partyParticipation = normalizePartyParticipationPatch(
      partyParticipationPatch,
    );
  }

  const appearanceOverrides: Partial<CharacterAppearanceMetadata> =
    appearancePatch && typeof appearancePatch === 'object' && !Array.isArray(appearancePatch)
      ? { ...(appearancePatch as Partial<CharacterAppearanceMetadata>) }
      : {};

  if ('gender' in patch) {
    appearanceOverrides.gender =
      typeof gender === 'string' ? gender.trim() || null : null;
  }
  if ('pronouns' in patch) {
    appearanceOverrides.pronouns =
      typeof pronouns === 'string' ? pronouns.trim() || null : null;
  }

  if (Object.keys(appearanceOverrides).length > 0) {
    normalized.appearance = appearanceOverrides as CharacterAppearanceMetadata;
  }

  return normalized;
}

export function resolveCharacterMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasCharacterMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasCharacterMetadataPatch(body)) {
    return body;
  }
  return null;
}

export function clearCharacterIdentityMetadata(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const key of CHARACTER_IDENTITY_KEYS) {
    delete base[key];
  }
  return base;
}
